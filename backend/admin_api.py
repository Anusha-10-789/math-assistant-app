"""Admin portal API: teacher-made lessons, test assignments, and hiding
syllabus topics — plus the student-side endpoints that read them.

Who is an admin: the built-in login from ADMIN_USERNAME/ADMIN_PASSWORD, any
account created as a teacher/admin with the ADMIN_SIGNUP_CODE, and any account
whose email or username is listed in ADMIN_EMAILS (comma separated). Everything is stored with kv_store, so it lives in Firestore /
Postgres in production like accounts and progress do.
"""

import asyncio
import os
import secrets
import threading
import time
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from google.genai import errors as genai_errors
from pydantic import BaseModel, Field

import gemini_service
import kv_store
import user_store
from security import current_login, lesson_rate_limit, rate_limit

router = APIRouter()

LESSONS_KEY = "admin:lessons"
ASSIGNMENTS_KEY = "admin:assignments"
HIDDEN_KEY = "admin:hidden-topics"
SUBJECTS = {"Mathematics", "Science", "Social Studies", "English", "General Knowledge"}

# One process serves the app, so a lock keeps read-modify-write updates of
# these shared documents from overwriting each other.
_lock = threading.Lock()


# ---------- who is who ----------

def _canonical(identifier: str) -> str:
    """The account's username key (what assignments and results use), whether
    the student logged in with their username, email or mobile number."""
    user = user_store.find_user(identifier)
    return (user["username"] if user else identifier).strip().lower()


def is_admin(identifier: str) -> bool:
    identifier = (identifier or "").strip()
    builtin = os.environ.get("ADMIN_USERNAME", "").strip()
    if builtin and identifier == builtin:
        return True
    user = user_store.find_user(identifier)
    if not user:
        return False
    return user_store.account_role(user) == "admin"


def require_admin(identifier: str = Depends(current_login)) -> str:
    if not is_admin(identifier):
        raise HTTPException(status_code=403, detail="Only teachers and admins can do this.")
    return identifier


# ---------- models ----------

class LessonQuestion(BaseModel):
    question: str = Field(min_length=1, max_length=600)
    options: List[str] = Field(min_length=4, max_length=4)
    answer: str = Field(pattern="^[ABCD]$")
    explanation: str = Field(default="", max_length=1500)


class LessonIn(BaseModel):
    subject: str
    grade: int = Field(ge=1, le=5)
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=200)
    notes: str = Field(default="", max_length=6000)
    icon: str = Field(default="📘", max_length=8)
    published: bool = True
    questions: List[LessonQuestion] = Field(default_factory=list, max_length=60)


class DraftRequest(BaseModel):
    subject: str
    grade: int = Field(ge=1, le=5)
    title: str = Field(min_length=1, max_length=120)
    num_questions: int = Field(default=10, ge=1, le=30)


class AssignmentIn(BaseModel):
    subject: str
    grade: int = Field(ge=1, le=5)
    topic: str = Field(min_length=1, max_length=160)
    lesson_id: str = ""  # set when the test is a teacher-made lesson
    num_questions: int = Field(default=10, ge=1, le=50)
    students: List[str] = Field(min_length=1)  # usernames, or ["*"] for everyone
    due: str = Field(default="", max_length=10)  # YYYY-MM-DD
    note: str = Field(default="", max_length=300)


class ResultIn(BaseModel):
    score: int = Field(ge=0)
    total: int = Field(ge=1)


class HiddenTopicsIn(BaseModel):
    topics: List[str] = Field(default_factory=list, max_length=500)  # "Subject|grade|topic"


def _check_subject(subject: str) -> None:
    if subject not in SUBJECTS:
        raise HTTPException(status_code=400, detail="Subject must be Mathematics, Science, Social Studies, English or General Knowledge.")


def _load(key: str, default):
    return kv_store.get(key) or default


# ---------- creating admin accounts ----------

def admin_signup_code() -> str:
    return os.environ.get("ADMIN_SIGNUP_CODE", "").strip()


def check_admin_code(code: str) -> None:
    """Raises unless `code` is the admin sign-up code. Without a code set,
    nobody can sign up as an admin (they can still be added via ADMIN_EMAILS)."""
    expected = admin_signup_code()
    if not expected:
        raise HTTPException(status_code=400, detail="Teacher/admin sign-up isn't turned on. Please ask the site admin.")
    if not secrets.compare_digest(code.strip().encode(), expected.encode()):
        raise HTTPException(status_code=400, detail="That admin code isn't right. Please check with the site admin.")


class AdminCodeIn(BaseModel):
    code: str = Field(default="", max_length=200)


@router.get("/signup/config")
async def signup_config() -> dict:
    return {"admin_signup": bool(admin_signup_code())}


@router.post("/signup/admin-code", dependencies=[Depends(rate_limit)])
async def verify_admin_code(data: AdminCodeIn) -> dict:
    # Checked before the sign-up code is sent, so a wrong admin code is
    # caught straight away rather than after the email/SMS step.
    check_admin_code(data.code)
    return {"success": True}


# ---------- shared ----------

@router.get("/me")
async def me(identifier: str = Depends(current_login)) -> dict:
    user = await asyncio.to_thread(user_store.find_user, identifier)
    return {
        "username": user["username"] if user else identifier,
        "is_admin": await asyncio.to_thread(is_admin, identifier),
    }


@router.get("/content")
async def content(identifier: str = Depends(current_login)) -> dict:
    """What students see from the admin: published teacher lessons and the
    syllabus topics that were removed."""
    lessons = await asyncio.to_thread(_load, LESSONS_KEY, {})
    hidden = await asyncio.to_thread(_load, HIDDEN_KEY, [])
    return {"lessons": [l for l in lessons.values() if l.get("published", True)], "hidden_topics": hidden}


# ---------- lessons ----------

@router.get("/admin/lessons")
async def list_lessons(_: str = Depends(require_admin)) -> dict:
    lessons = await asyncio.to_thread(_load, LESSONS_KEY, {})
    return {"lessons": sorted(lessons.values(), key=lambda l: l["created_at"], reverse=True)}


def _save_lesson(lesson_id: Optional[str], data: LessonIn, author: str) -> dict:
    with _lock:
        lessons = _load(LESSONS_KEY, {})
        if lesson_id and lesson_id not in lessons:
            raise HTTPException(status_code=404, detail="That lesson no longer exists.")
        existing = lessons.get(lesson_id, {}) if lesson_id else {}
        lesson = {
            **data.model_dump(),
            "id": lesson_id or f"lesson-{secrets.token_hex(5)}",
            "created_at": existing.get("created_at", time.time()),
            "updated_at": time.time(),
            "created_by": existing.get("created_by", author),
        }
        lessons[lesson["id"]] = lesson
        kv_store.put(LESSONS_KEY, lessons)
        return lesson


@router.post("/admin/lessons")
async def create_lesson(data: LessonIn, admin: str = Depends(require_admin)) -> dict:
    _check_subject(data.subject)
    return {"lesson": await asyncio.to_thread(_save_lesson, None, data, admin)}


@router.put("/admin/lessons/{lesson_id}")
async def update_lesson(lesson_id: str, data: LessonIn, admin: str = Depends(require_admin)) -> dict:
    _check_subject(data.subject)
    return {"lesson": await asyncio.to_thread(_save_lesson, lesson_id, data, admin)}


def _delete_lesson(lesson_id: str) -> int:
    with _lock:
        lessons = _load(LESSONS_KEY, {})
        if lessons.pop(lesson_id, None) is None:
            raise HTTPException(status_code=404, detail="That lesson no longer exists.")
        kv_store.put(LESSONS_KEY, lessons)
        # Tests assigned from a deleted lesson can't be taken any more.
        assignments = _load(ASSIGNMENTS_KEY, {})
        removed = [a for a in assignments if assignments[a].get("lesson_id") == lesson_id]
        for a in removed:
            del assignments[a]
        if removed:
            kv_store.put(ASSIGNMENTS_KEY, assignments)
        return len(removed)


@router.delete("/admin/lessons/{lesson_id}")
async def delete_lesson(lesson_id: str, _: str = Depends(require_admin)) -> dict:
    return {"success": True, "assignments_removed": await asyncio.to_thread(_delete_lesson, lesson_id)}


@router.post("/admin/lessons/draft", dependencies=[Depends(lesson_rate_limit)])
async def draft_lesson(data: DraftRequest, _: str = Depends(require_admin)) -> dict:
    """AI-written notes and questions for a new lesson, for the teacher to edit."""
    _check_subject(data.subject)
    try:
        lesson = await gemini_service.generate_lesson(data.title, data.grade, data.num_questions, data.subject)
    except gemini_service.GeminiNotConfigured as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except gemini_service.GeminiResponseError:
        raise HTTPException(status_code=502, detail="The AI couldn't write a draft this time. Please try again.")
    except genai_errors.APIError as exc:
        raise HTTPException(status_code=502, detail=f"AI service error: {exc}")
    return {
        "notes": lesson.concept_explanation,
        "questions": [
            {
                "question": q.question,
                "options": [q.option_a, q.option_b, q.option_c, q.option_d],
                "answer": q.correct_answer,
                "explanation": q.explanation,
            }
            for q in lesson.mcqs
        ],
    }


# ---------- syllabus topics shown to students ----------

@router.put("/admin/hidden-topics")
async def set_hidden_topics(data: HiddenTopicsIn, _: str = Depends(require_admin)) -> dict:
    topics = sorted(set(data.topics))
    await asyncio.to_thread(kv_store.put, HIDDEN_KEY, topics)
    return {"hidden_topics": topics}


# ---------- assignments ----------

@router.get("/admin/students")
async def list_students(_: str = Depends(require_admin)) -> dict:
    def load():
        with user_store._lock:
            users = user_store._load()
        # Teachers have their own accounts and aren't assigned tests.
        return [
            {"username": key, "name": u.get("username", key), "email": u.get("email", ""), "phone": u.get("phone", "")}
            for key, u in sorted(users.items())
            if user_store.account_role(u) == "student"
        ]

    return {"students": await asyncio.to_thread(load)}


@router.get("/admin/assignments")
async def list_assignments(_: str = Depends(require_admin)) -> dict:
    assignments = await asyncio.to_thread(_load, ASSIGNMENTS_KEY, {})
    return {"assignments": sorted(assignments.values(), key=lambda a: a["created_at"], reverse=True)}


def _create_assignment(data: AssignmentIn, admin: str) -> dict:
    with _lock:
        if data.lesson_id and data.lesson_id not in _load(LESSONS_KEY, {}):
            raise HTTPException(status_code=404, detail="That lesson no longer exists.")
        students = ["*"] if "*" in data.students else sorted({s.strip().lower() for s in data.students if s.strip()})
        assignments = _load(ASSIGNMENTS_KEY, {})
        assignment = {
            **data.model_dump(),
            "students": students,
            "id": f"assign-{secrets.token_hex(5)}",
            "created_at": time.time(),
            "created_by": admin,
            "results": {},
        }
        assignments[assignment["id"]] = assignment
        kv_store.put(ASSIGNMENTS_KEY, assignments)
        return assignment


@router.post("/admin/assignments")
async def create_assignment(data: AssignmentIn, admin: str = Depends(require_admin)) -> dict:
    _check_subject(data.subject)
    return {"assignment": await asyncio.to_thread(_create_assignment, data, admin)}


def _delete_assignment(assignment_id: str) -> None:
    with _lock:
        assignments = _load(ASSIGNMENTS_KEY, {})
        if assignments.pop(assignment_id, None) is None:
            raise HTTPException(status_code=404, detail="That test assignment no longer exists.")
        kv_store.put(ASSIGNMENTS_KEY, assignments)


@router.delete("/admin/assignments/{assignment_id}")
async def delete_assignment(assignment_id: str, _: str = Depends(require_admin)) -> dict:
    await asyncio.to_thread(_delete_assignment, assignment_id)
    return {"success": True}


@router.get("/my-assignments")
async def my_assignments(identifier: str = Depends(current_login)) -> dict:
    def load():
        me_key = _canonical(identifier)
        assignments = _load(ASSIGNMENTS_KEY, {})
        mine = []
        for a in assignments.values():
            if "*" in a["students"] or me_key in a["students"]:
                result = a["results"].get(me_key)
                mine.append({k: v for k, v in a.items() if k not in ("results", "students")} | {"result": result})
        return sorted(mine, key=lambda a: (a["result"] is not None, a["due"] or "9999", -a["created_at"]))

    return {"assignments": await asyncio.to_thread(load)}


def _record_result(assignment_id: str, identifier: str, data: ResultIn) -> dict:
    with _lock:
        assignments = _load(ASSIGNMENTS_KEY, {})
        assignment = assignments.get(assignment_id)
        me_key = _canonical(identifier)
        if not assignment or ("*" not in assignment["students"] and me_key not in assignment["students"]):
            raise HTTPException(status_code=404, detail="That test isn't assigned to you.")
        result = {"score": data.score, "total": data.total, "completed_at": time.time()}
        assignment["results"][me_key] = result
        kv_store.put(ASSIGNMENTS_KEY, assignments)
        return result


@router.post("/my-assignments/{assignment_id}/result")
async def record_result(assignment_id: str, data: ResultIn, identifier: str = Depends(current_login)) -> dict:
    return {"result": await asyncio.to_thread(_record_result, assignment_id, identifier, data)}
