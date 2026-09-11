from typing import List

from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    topic: str
    grade: int = Field(ge=1, le=5)
    num_questions: int = Field(default=20, ge=1, le=50)
    subject: str = "Mathematics"


class LoginRequest(BaseModel):
    username: str  # username or email
    password: str


class SignupRequest(BaseModel):
    username: str
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    username: str
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class GoogleAuthRequest(BaseModel):
    id_token: str


class VisualAid(BaseModel):
    # A small, generic shape the frontend renders as an SVG diagram and the
    # docx/pdf exporters render as a plain-text picture. "type" selects the
    # meaning of param1/param2/param3:
    #   "groups"      -> param1 groups of param2 items each (multiplication/division/counting)
    #   "number_line" -> a jump from param1 to param2 on a number line (addition/subtraction)
    #   "pie"         -> param2 shaded slices out of param1 total slices (fractions)
    #   "none"        -> no visual for this question/slide
    type: str = "none"
    param1: int = 0
    param2: int = 0
    param3: int = 0
    label: str = ""


class LectureSlide(BaseModel):
    title: str
    content: str
    visual: VisualAid


class MCQItem(BaseModel):
    topic: str
    question_number: int
    question: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str
    explanation: str
    trick: str
    visual: VisualAid


class LessonContent(BaseModel):
    topic: str
    grade: int
    concept_explanation: str
    lecture_slides: List[LectureSlide]
    mcqs: List[MCQItem]


class GenerateResponse(BaseModel):
    lesson: LessonContent


class DownloadRequest(BaseModel):
    lesson: LessonContent


class QuestionVideoRequest(BaseModel):
    mcq: MCQItem
    grade: int


class YouTubeExplanationRequest(BaseModel):
    topic: str
    grade: int = Field(ge=1, le=5)


class TopicIntroRequest(BaseModel):
    topic: str


class SendResultSmsRequest(BaseModel):
    phone: str
    topic: str
    grade: int = Field(ge=1, le=5)
    score: int
    total: int


class MissedQuestion(BaseModel):
    question_number: int
    topic: str
    question: str
    your_answer: str
    correct_answer: str
    your_answer_text: str = ""
    correct_answer_text: str = ""
    explanation: str = ""


class QuizResultData(BaseModel):
    score: int
    total: int
    missed: List[MissedQuestion]


class ReportRequest(BaseModel):
    topic: str
    grade: int
    result: QuizResultData
