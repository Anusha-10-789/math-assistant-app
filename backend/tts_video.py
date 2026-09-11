import concurrent.futures
import functools
import os
import re
import subprocess
import tempfile

import imageio_ffmpeg
from gtts import gTTS
from PIL import Image, ImageDraw, ImageFont

from models import LessonContent, LectureSlide, MCQItem, VisualAid

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()

WIDTH, HEIGHT = 1280, 720
# "ultrafast" trades a larger file size for much quicker encoding, which is a
# good trade for these short, mostly-static-image clips where wait time
# matters more than compression efficiency.
ENCODE_PRESET = "ultrafast"
# These clips are near-static per slide/question, so 1 fps is still smooth
# and roughly halves the number of frames ffmpeg has to encode vs 2 fps.
OUTPUT_FPS = 1
# These clips are only a handful of frames each (near-static images at 1 fps),
# so there's very little to actually parallelize — asking ffmpeg for many
# threads just adds thread-coordination overhead, and competes harder for CPU
# time against everything else running on the machine. A small fixed number
# is faster in practice than os.cpu_count() for workloads this tiny.
ENCODE_THREADS = 2
BG_COLOR = (255, 247, 237)
INDIGO = (79, 70, 229)
AMBER = (245, 158, 11)
SLATE = (100, 116, 139)
DARK = (30, 41, 59)
WHITE = (255, 255, 255)

_FONT_REGULAR_CANDIDATES = [
    "C:/Windows/Fonts/arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]
_FONT_BOLD_CANDIDATES = [
    "C:/Windows/Fonts/arialbd.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]


@functools.lru_cache(maxsize=None)
def _load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    # Cached because ImageFont.truetype() re-reads the font file from disk on
    # every call otherwise — with several distinct sizes drawn per image and
    # one image per slide/question, that's a lot of repeated disk I/O for
    # the exact same handful of fonts, especially costly when the disk is
    # under contention (e.g. antivirus/cloud-sync scanning).
    for path in _FONT_BOLD_CANDIDATES if bold else _FONT_REGULAR_CANDIDATES:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def _wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = f"{current} {word}".strip()
        if draw.textlength(trial, font=font) <= max_width or not current:
            current = trial
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def _draw_groups(draw: ImageDraw.ImageDraw, param1: int, param2: int, box: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = box
    groups = min(max(param1, 0), 8)
    per_group = min(max(param2, 0), 12)
    if groups == 0 or per_group == 0:
        return

    dots_per_row = 4
    dot_r = 10
    dot_gap = 34
    padding = 22
    cols = min(per_group, dots_per_row)
    rows = max(1, -(-per_group // dots_per_row))
    group_w = cols * dot_gap + padding * 2 - (dot_gap - dot_r * 2)
    group_h = rows * dot_gap + padding * 2 - (dot_gap - dot_r * 2)
    group_gap = 26
    total_w = groups * group_w + max(groups - 1, 0) * group_gap

    start_x = x0 + max(0, ((x1 - x0) - total_w) // 2)
    start_y = y0 + max(0, ((y1 - y0) - group_h) // 2)

    for g in range(groups):
        gx = start_x + g * (group_w + group_gap)
        draw.rounded_rectangle([gx, start_y, gx + group_w, start_y + group_h], radius=14, outline=INDIGO, width=3, fill=WHITE)
        for i in range(per_group):
            cx = gx + padding + (i % dots_per_row) * dot_gap
            cy = start_y + padding + (i // dots_per_row) * dot_gap
            draw.ellipse([cx - dot_r, cy - dot_r, cx + dot_r, cy + dot_r], fill=INDIGO)


def _draw_number_line(draw: ImageDraw.ImageDraw, param1: int, param2: int, box: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = box
    lo, hi = min(param1, param2), max(param1, param2)
    range_start = max(0, lo - 1)
    range_end = hi + 1
    span = max(range_end - range_start, 1)
    margin = 60
    line_y = (y0 + y1) // 2 + 50
    usable_w = (x1 - x0) - margin * 2

    def scale(v: int) -> float:
        return x0 + margin + (v - range_start) / span * usable_w

    draw.line([x0 + margin, line_y, x1 - margin, line_y], fill=SLATE, width=4)

    ticks = range(range_start, range_end + 1) if span <= 20 else [range_start, lo, hi, range_end]
    tick_font = _load_font(22)
    for t in ticks:
        tx = scale(t)
        draw.line([tx, line_y - 8, tx, line_y + 8], fill=SLATE, width=3)
        text = str(t)
        tw = draw.textlength(text, font=tick_font)
        draw.text((tx - tw / 2, line_y + 16), text, font=tick_font, fill=SLATE)

    x1p, x2p = scale(param1), scale(param2)
    arc_top = line_y - 90
    mid_x = (x1p + x2p) / 2
    points = []
    steps = 24
    for i in range(steps + 1):
        t = i / steps
        x = (1 - t) ** 2 * x1p + 2 * (1 - t) * t * mid_x + t**2 * x2p
        y = (1 - t) ** 2 * line_y + 2 * (1 - t) * t * arc_top + t**2 * line_y
        points.append((x, y))
    draw.line(points, fill=AMBER, width=5)
    draw.ellipse([x1p - 9, line_y - 9, x1p + 9, line_y + 9], fill=INDIGO)
    draw.ellipse([x2p - 9, line_y - 9, x2p + 9, line_y + 9], fill=INDIGO)


def _draw_pie(draw: ImageDraw.ImageDraw, param1: int, param2: int, box: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = box
    total = min(max(param1, 1), 12)
    shaded = min(max(param2, 0), total)
    cx = (x0 + x1) // 2
    cy = (y0 + y1) // 2
    r = min(x1 - x0, y1 - y0) // 2 - 10

    for i in range(total):
        start = i / total * 360 - 90
        end = (i + 1) / total * 360 - 90
        fill = INDIGO if i < shaded else WHITE
        draw.pieslice([cx - r, cy - r, cx + r, cy + r], start=start, end=end, fill=fill, outline=SLATE, width=2)


def _draw_visual(draw: ImageDraw.ImageDraw, visual: VisualAid, box: tuple[int, int, int, int]) -> None:
    if visual.type == "groups":
        _draw_groups(draw, visual.param1, visual.param2, box)
    elif visual.type == "number_line":
        _draw_number_line(draw, visual.param1, visual.param2, box)
    elif visual.type == "pie":
        _draw_pie(draw, visual.param1, visual.param2, box)


def render_slide_image(slide: LectureSlide, topic: str, grade: int, slide_number: int, total_slides: int) -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(image)

    header_font = _load_font(26, bold=True)
    draw.text((60, 40), f"Grade {grade} - {topic}", font=header_font, fill=INDIGO)
    badge = f"Slide {slide_number} of {total_slides}"
    badge_w = draw.textlength(badge, font=header_font)
    draw.text((WIDTH - 60 - badge_w, 40), badge, font=header_font, fill=SLATE)

    title_font = _load_font(46, bold=True)
    draw.text((60, 100), slide.title, font=title_font, fill=DARK)

    body_font = _load_font(30)
    max_text_width = WIDTH - 120
    lines = _wrap_text(draw, slide.content, body_font, max_text_width)
    y = 175
    for line in lines:
        draw.text((60, y), line, font=body_font, fill=DARK)
        y += 42

    if slide.visual.type != "none":
        visual_box = (100, y + 30, WIDTH - 100, HEIGHT - 90)
        _draw_visual(draw, slide.visual, visual_box)
        if slide.visual.label:
            label_font = _load_font(24)
            label_w = draw.textlength(slide.visual.label, font=label_font)
            draw.text(((WIDTH - label_w) / 2, HEIGHT - 55), slide.visual.label, font=label_font, fill=SLATE)

    return image


def render_question_image(mcq: MCQItem, grade: int) -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(image)

    header_font = _load_font(26, bold=True)
    draw.text((60, 40), f"Grade {grade} - {mcq.topic}", font=header_font, fill=INDIGO)
    badge = "Explanation"
    badge_w = draw.textlength(badge, font=header_font)
    draw.text((WIDTH - 60 - badge_w, 40), badge, font=header_font, fill=SLATE)

    title_font = _load_font(38, bold=True)
    draw.text((60, 95), f"Q.{mcq.question_number})", font=title_font, fill=DARK)

    body_font = _load_font(28)
    max_text_width = WIDTH - 120
    lines = _wrap_text(draw, mcq.question, body_font, max_text_width)
    y = 150
    for line in lines:
        draw.text((60, y), line, font=body_font, fill=DARK)
        y += 38

    y += 15
    option_font = _load_font(26)
    options = [("A", mcq.option_a), ("B", mcq.option_b), ("C", mcq.option_c), ("D", mcq.option_d)]
    box_h = 52
    for letter, option_text in options:
        is_correct = letter == mcq.correct_answer
        color = INDIGO if is_correct else SLATE
        fill = (224, 231, 255) if is_correct else WHITE
        draw.rounded_rectangle([60, y, WIDTH - 60, y + box_h], radius=10, outline=color, width=3, fill=fill)
        draw.text((80, y + 12), f"{letter})  {option_text}", font=option_font, fill=DARK)
        y += box_h + 12

    y += 10
    if mcq.visual.type != "none" and y < HEIGHT - 90:
        visual_box = (100, y, WIDTH - 100, HEIGHT - 70)
        _draw_visual(draw, mcq.visual, visual_box)
        if mcq.visual.label:
            label_font = _load_font(22)
            label_w = draw.textlength(mcq.visual.label, font=label_font)
            draw.text(((WIDTH - label_w) / 2, HEIGHT - 45), mcq.visual.label, font=label_font, fill=SLATE)

    return image


def render_topic_intro_image(
    topic: str, slide_title: str, content: str, slide_number: int, total_slides: int
) -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(image)

    header_font = _load_font(26, bold=True)
    draw.text((60, 40), f"Topic Introduction — {topic}", font=header_font, fill=INDIGO)
    badge = f"Slide {slide_number} of {total_slides}"
    badge_w = draw.textlength(badge, font=header_font)
    draw.text((WIDTH - 60 - badge_w, 40), badge, font=header_font, fill=SLATE)

    title_font = _load_font(46, bold=True)
    draw.text((60, 100), slide_title, font=title_font, fill=DARK)

    max_text_width = WIDTH - 120
    top_y = 190
    available_height = HEIGHT - top_y - 40

    # This topic's content now includes extra context and example questions,
    # which won't always fit at one fixed size on a single static frame —
    # shrink the body font until the wrapped text actually fits, rather than
    # letting the bottom lines silently run off the visible image. Falls back
    # to the smallest size (best effort) if even that doesn't fully fit.
    for size in (30, 27, 24, 22, 20, 18):
        body_font = _load_font(size)
        lines = _wrap_text(draw, content, body_font, max_text_width)
        line_height = size + 12
        if len(lines) * line_height <= available_height:
            break

    y = top_y
    for line in lines:
        draw.text((60, y), line, font=body_font, fill=DARK)
        y += line_height

    return image


_TTS_TIMEOUT_SECONDS = 15
_TTS_MAX_ATTEMPTS = 2


class TTSUnavailableError(Exception):
    pass


def _run_ffmpeg(args: list[str]) -> None:
    result = subprocess.run(
        [FFMPEG_EXE, "-y", "-hide_banner", "-loglevel", "error", *args],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr.strip()}")


_DURATION_RE = re.compile(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)")


def _get_audio_duration(path: str) -> float:
    # No ffprobe binary is bundled alongside ffmpeg here, so read the
    # duration off the same banner ffmpeg prints when given no output —
    # that call always "fails" (no output specified), which is expected.
    result = subprocess.run([FFMPEG_EXE, "-i", path], capture_output=True, text=True)
    match = _DURATION_RE.search(result.stderr)
    if not match:
        raise RuntimeError(f"Could not determine narration duration for {path}")
    hours, minutes, seconds = match.groups()
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)


def _build_narrated_clip(image_path: str, audio_path: str, duration: float, output_path: str) -> None:
    # Muxing image+audio directly through ffmpeg (rather than moviepy's
    # internal raw-pipe writer) — moviepy's output was passing ffmpeg's own
    # lenient analysis (ffprobe/ffmpeg reported a normal, non-silent audio
    # stream) yet neither Chrome's media pipeline nor Windows' Media
    # Foundation could detect an audio track in the resulting file at all
    # (no volume control shown, "Channel number" property empty) — a real
    # muxing defect that only strict demuxers surfaced. This is the
    # standard, well-tested ffmpeg incantation for "loop a still image with
    # narration" and produces a conventional, broadly-compatible container.
    _run_ffmpeg(
        [
            "-loop", "1",
            "-i", image_path,
            "-i", audio_path,
            "-c:v", "libx264",
            "-preset", ENCODE_PRESET,
            "-tune", "stillimage",
            "-pix_fmt", "yuv420p",
            "-r", str(OUTPUT_FPS),
            "-c:a", "aac",
            "-b:a", "128k",
            # gTTS output is quiet on its own (peaks well below 0dB) — loudness
            # normalizing is the difference between narration that's audible
            # at normal device volume and narration that sounds near-silent.
            "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
            "-t", f"{duration:.2f}",
            "-threads", str(ENCODE_THREADS),
            "-movflags", "+faststart",
            output_path,
        ]
    )


def _synthesize_audio(text: str, path: str) -> None:
    # Without an explicit timeout, gTTS's underlying network call can hang
    # indefinitely if Google's TTS endpoint is slow to respond even once —
    # that single stuck request would otherwise block the whole video
    # (parallel slides all wait on concurrent.futures.as_completed). Fail
    # fast and retry once instead of hanging.
    last_error: Exception | None = None
    for _ in range(_TTS_MAX_ATTEMPTS):
        try:
            gTTS(text=text, lang="en", timeout=_TTS_TIMEOUT_SECONDS).save(path)
            return
        except Exception as exc:
            last_error = exc
    # A connection/SSL failure here means every retry will fail identically
    # (it's not a transient slow response) — surface a message that points
    # at the actual cause instead of letting the caller's asyncio.wait_for
    # time out later with a generic "took too long" message.
    raise TTSUnavailableError(
        "Could not reach the narration service (Google Text-to-Speech). This usually means "
        "no internet access on the server, or a firewall/antivirus is blocking the connection."
    ) from last_error


def build_lecture_video(lesson: LessonContent) -> bytes:
    with tempfile.TemporaryDirectory() as tmpdir:
        slides = lesson.lecture_slides
        image_paths: dict[int, str] = {}
        for i, slide in enumerate(slides, start=1):
            image = render_slide_image(slide, lesson.topic, lesson.grade, i, len(slides))
            image_path = os.path.join(tmpdir, f"slide_{i}.png")
            image.save(image_path)
            image_paths[i] = image_path

        # The slides' narration audio is independent per slide, so fetch
        # all of them concurrently instead of waiting on each gTTS
        # network round-trip one at a time — this is the main lever on
        # total wait time for a multi-slide lecture.
        audio_paths: dict[int, str] = {}
        with concurrent.futures.ThreadPoolExecutor(max_workers=len(slides)) as executor:
            future_to_index = {
                executor.submit(_synthesize_audio, slide.content, os.path.join(tmpdir, f"slide_{i}.mp3")): i
                for i, slide in enumerate(slides, start=1)
            }
            for future in concurrent.futures.as_completed(future_to_index):
                i = future_to_index[future]
                future.result()
                audio_paths[i] = os.path.join(tmpdir, f"slide_{i}.mp3")

        clip_paths = []
        for i in range(1, len(slides) + 1):
            duration = max(_get_audio_duration(audio_paths[i]) + 0.7, 3.0)
            clip_path = os.path.join(tmpdir, f"clip_{i}.mp4")
            _build_narrated_clip(image_paths[i], audio_paths[i], duration, clip_path)
            clip_paths.append(clip_path)

        concat_list_path = os.path.join(tmpdir, "concat_list.txt")
        with open(concat_list_path, "w", encoding="utf-8") as f:
            for clip_path in clip_paths:
                # The concat demuxer's list format takes a quoted path per
                # line; forward slashes avoid any backslash-escaping ambiguity.
                escaped = clip_path.replace("\\", "/").replace("'", "'\\''")
                f.write(f"file '{escaped}'\n")

        output_path = os.path.join(tmpdir, "lecture.mp4")
        _run_ffmpeg(
            [
                "-f", "concat",
                "-safe", "0",
                "-i", concat_list_path,
                "-c", "copy",
                "-movflags", "+faststart",
                output_path,
            ]
        )

        with open(output_path, "rb") as f:
            return f.read()


def build_question_video(mcq: MCQItem, grade: int) -> bytes:
    with tempfile.TemporaryDirectory() as tmpdir:
        image = render_question_image(mcq, grade)
        image_path = os.path.join(tmpdir, "question.png")
        image.save(image_path)

        narration = f"The correct answer is {mcq.correct_answer}. {mcq.explanation} Trick: {mcq.trick}"
        audio_path = os.path.join(tmpdir, "question.mp3")
        _synthesize_audio(narration, audio_path)

        duration = max(_get_audio_duration(audio_path) + 0.7, 3.0)
        output_path = os.path.join(tmpdir, "question.mp4")
        _build_narrated_clip(image_path, audio_path, duration, output_path)

        with open(output_path, "rb") as f:
            return f.read()


def build_topic_intro_video(topic: str, slides: list[tuple[str, str]]) -> bytes:
    """slides: list of (slide_title, narration_text) — e.g. one "What is X?"
    slide followed by one "Practice Questions" slide. Mirrors
    build_lecture_video's multi-clip render-then-concat approach."""
    with tempfile.TemporaryDirectory() as tmpdir:
        image_paths: dict[int, str] = {}
        for i, (slide_title, content) in enumerate(slides, start=1):
            image = render_topic_intro_image(topic, slide_title, content, i, len(slides))
            image_path = os.path.join(tmpdir, f"intro_slide_{i}.png")
            image.save(image_path)
            image_paths[i] = image_path

        audio_paths: dict[int, str] = {}
        with concurrent.futures.ThreadPoolExecutor(max_workers=len(slides)) as executor:
            future_to_index = {
                executor.submit(
                    _synthesize_audio, content, os.path.join(tmpdir, f"intro_slide_{i}.mp3")
                ): i
                for i, (_, content) in enumerate(slides, start=1)
            }
            for future in concurrent.futures.as_completed(future_to_index):
                i = future_to_index[future]
                future.result()
                audio_paths[i] = os.path.join(tmpdir, f"intro_slide_{i}.mp3")

        clip_paths = []
        for i in range(1, len(slides) + 1):
            duration = max(_get_audio_duration(audio_paths[i]) + 0.7, 3.0)
            clip_path = os.path.join(tmpdir, f"intro_clip_{i}.mp4")
            _build_narrated_clip(image_paths[i], audio_paths[i], duration, clip_path)
            clip_paths.append(clip_path)

        concat_list_path = os.path.join(tmpdir, "intro_concat_list.txt")
        with open(concat_list_path, "w", encoding="utf-8") as f:
            for clip_path in clip_paths:
                escaped = clip_path.replace("\\", "/").replace("'", "'\\''")
                f.write(f"file '{escaped}'\n")

        output_path = os.path.join(tmpdir, "intro.mp4")
        _run_ffmpeg(
            [
                "-f", "concat",
                "-safe", "0",
                "-i", concat_list_path,
                "-c", "copy",
                "-movflags", "+faststart",
                output_path,
            ]
        )

        with open(output_path, "rb") as f:
            return f.read()
