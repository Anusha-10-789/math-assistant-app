from typing import List

from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    topic: str
    grade: int = Field(ge=1, le=5)
    num_questions: int = Field(default=20, ge=1, le=50)
    subject: str = "Mathematics"
    # Questions from the student's earlier tests on this topic and grade,
    # which the new test must not repeat.
    avoid_questions: List[str] = Field(default_factory=list)


class LoginRequest(BaseModel):
    username: str  # email, mobile number or username
    password: str


class SignupRequest(BaseModel):
    email: str
    phone: str
    password: str
    security_question: str = ""
    security_answer: str = ""
    username: str = ""  # optional — derived from the email when blank
    # One-time code sent to the email ("email") or mobile ("sms") being registered.
    otp_channel: str = ""
    otp_code: str = ""


class OtpSendRequest(BaseModel):
    purpose: str  # "signup", "login" or "reset"
    destination: str  # email or mobile number (signup/login/reset), or username (login/reset)
    channel: str = ""  # "email"/"sms" for reset, to pick where the code goes


class OtpLoginRequest(BaseModel):
    identifier: str
    code: str


class ForgotPasswordRequest(BaseModel):
    identifier: str  # email, phone number or username


class SecurityAnswerResetRequest(BaseModel):
    identifier: str
    answer: str
    new_password: str


class CodeResetRequest(BaseModel):
    identifier: str
    channel: str  # "email" or "sms" — where the code was sent
    code: str
    new_password: str


class SecurityQuestionRequest(BaseModel):
    question: str
    answer: str


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
    # Used by the frontend's explanation video. Optional so lessons saved
    # before these fields existed (and any response that omits them) still
    # load — the video falls back to the plain explanation then.
    question_explanation: str = ""
    solution_steps: List[str] = []


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
