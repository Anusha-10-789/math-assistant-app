import io
from xml.sax.saxutils import escape

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer

from models import LessonContent
from visual_text import describe_visual

_styles = getSampleStyleSheet()

TITLE_STYLE = ParagraphStyle("LessonTitle", parent=_styles["Heading1"], spaceAfter=12)
SECTION_STYLE = ParagraphStyle("Section", parent=_styles["Heading2"], spaceAfter=8)
SLIDE_HEADING_STYLE = ParagraphStyle(
    "SlideHeading", parent=_styles["Heading3"], fontSize=12, spaceBefore=10, spaceAfter=4
)
QUESTION_HEADING_STYLE = ParagraphStyle(
    "QuestionHeading", parent=_styles["Heading2"], fontSize=12, spaceBefore=14, spaceAfter=4
)
BODY_STYLE = ParagraphStyle("LessonBody", parent=_styles["BodyText"], spaceAfter=6)
OPTION_STYLE = ParagraphStyle("Option", parent=_styles["BodyText"], leftIndent=18, spaceAfter=3)


def _p(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(escape(text).replace("\n", "<br/>"), style)


def build_lesson_pdf(lesson: LessonContent) -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
    )

    story = [
        _p(f"{lesson.topic} — Grade {lesson.grade}", TITLE_STYLE),
        _p("Concept Explanation", SECTION_STYLE),
        _p(lesson.concept_explanation, BODY_STYLE),
        Spacer(1, 10),
        _p("Lecture", SECTION_STYLE),
    ]

    for slide in lesson.lecture_slides:
        slide_block = [_p(slide.title, SLIDE_HEADING_STYLE), _p(slide.content, BODY_STYLE)]
        visual_text = describe_visual(slide.visual)
        if visual_text:
            slide_block.append(_p(visual_text, BODY_STYLE))
        story.append(KeepTogether(slide_block))

    story.append(Spacer(1, 10))
    story.append(_p("Practice Questions", SECTION_STYLE))

    for mcq in lesson.mcqs:
        block = [
            _p(f"Q.{mcq.question_number}) {mcq.topic}:", QUESTION_HEADING_STYLE),
            _p(mcq.question, BODY_STYLE),
            Paragraph(f"<b>A)</b> {escape(mcq.option_a)}", OPTION_STYLE),
            Paragraph(f"<b>B)</b> {escape(mcq.option_b)}", OPTION_STYLE),
            Paragraph(f"<b>C)</b> {escape(mcq.option_c)}", OPTION_STYLE),
            Paragraph(f"<b>D)</b> {escape(mcq.option_d)}", OPTION_STYLE),
            _p(f"Answer: {mcq.correct_answer}", BODY_STYLE),
            _p(f"Trick: {mcq.trick}", BODY_STYLE),
        ]
        visual_text = describe_visual(mcq.visual)
        if visual_text:
            block.append(_p(visual_text, BODY_STYLE))
        block.append(_p("Explanation:", BODY_STYLE))
        block.append(_p(mcq.explanation, BODY_STYLE))
        story.append(KeepTogether(block))

    doc.build(story)
    buffer.seek(0)
    return buffer
