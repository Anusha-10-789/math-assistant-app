import os
import re
import threading

from tts_video import build_topic_intro_video

# Fixed, hand-written, grade-neutral explanations — one video per topic is
# generated once and reused for every student, rather than calling Gemini
# and TTS again on every visit. Keys must match the exact topic strings used
# in frontend/src/subjectModules.ts.
#
# Each topic is {"intro": str, "types": [(slide_title, content), ...]} —
# rendered as one intro slide ("What is X?") followed by one separate slide
# per named type, each with its own question and explanation. This mirrors
# how the main lesson video is a sequence of narrated slides, not one block.
TOPIC_INTRO_CONTENT: dict[str, dict] = {
    "Addition": {
        "title": "What is Addition?",
        "intro": (
            "What is addition? Addition means putting numbers together to find out how many "
            "there are in total, using the plus sign, like 3 plus 2 equals 5. There are two main "
            "types of addition: addition without carrying, and addition with carrying, or "
            "regrouping."
        ),
        "types": [
            (
                "Type 1: Without Carrying",
                "Addition without carrying is when each column adds up to less than 10, so you "
                "simply add each column on its own. Here's a question: Ravi has 4 mangoes and "
                "Priya gives him 3 more — how many does he have now? 4 plus 3 equals 7, since no "
                "carrying is needed.",
            ),
            (
                "Type 2: With Carrying",
                "Addition with carrying, or regrouping, is when a column adds up to 10 or more, "
                "so you carry the extra ten over to the next column. Here's a question: what is "
                "27 plus 15? Add the ones first, 7 plus 5 is 12, so write 2 and carry 1, then add "
                "the tens, 2 plus 1 plus the carried 1 is 4, giving 42.",
            ),
        ],
    },
    "Subtraction": {
        "title": "What is Subtraction?",
        "intro": (
            "What is subtraction? Subtraction means taking away, or finding the difference "
            "between two numbers, using the minus sign, like 5 minus 2 equals 3. There are two "
            "main types of subtraction: subtraction without borrowing, and subtraction with "
            "borrowing."
        ),
        "types": [
            (
                "Type 1: Without Borrowing",
                "Subtraction without borrowing is when every digit on top is bigger than the "
                "digit below it. Here's a question: Anjali has 9 pencils and gives away 4 — how "
                "many are left? 9 minus 4 equals 5, since no borrowing is needed.",
            ),
            (
                "Type 2: With Borrowing",
                "Subtraction with borrowing is when a digit is too small to subtract from, so we "
                "borrow a ten from the next column. Here's a question: what is 42 minus 15? "
                "Since 2 is smaller than 5, we borrow a ten from the 4, making it 12 minus 5 "
                "equals 7 in the ones place, and 3 minus 1 equals 2 in the tens place, giving 27.",
            ),
        ],
    },
    "Multiplication": {
        "title": "What is Multiplication?",
        "intro": (
            "What is multiplication? Multiplication is a fast way to add the same number many "
            "times, like 4 times 3 instead of adding 4 plus 4 plus 4, both giving 12. There are "
            "two main types of multiplication: single-digit multiplication, and multi-digit "
            "multiplication."
        ),
        "types": [
            (
                "Type 1: Single-Digit Multiplication",
                "Single-digit multiplication uses the tables you memorise. Here's a question: "
                "there are 5 baskets with 3 mangoes in each — how many mangoes in total? 5 times "
                "3 equals 15.",
            ),
            (
                "Type 2: Multi-Digit Multiplication",
                "Multi-digit multiplication means multiplying a bigger number by breaking it "
                "into parts and adding the results. Here's a question: what is 12 times 4? "
                "Multiply 10 times 4 to get 40, then 2 times 4 to get 8, and add them together, "
                "40 plus 8 equals 48.",
            ),
        ],
    },
    "Division": {
        "title": "What is Division?",
        "intro": (
            "What is division? Division means splitting a number into equal groups, or finding "
            "how many times one number fits into another, like 12 divided by 3 equals 4. There "
            "are two main types of division: division with no remainder, and division with a "
            "remainder."
        ),
        "types": [
            (
                "Type 1: No Remainder",
                "Division with no remainder is when the number splits perfectly evenly into "
                "equal groups. Here's a question: 20 pencils are shared equally among 4 "
                "students — how many does each get? 20 divided by 4 equals 5, with nothing left "
                "over.",
            ),
            (
                "Type 2: With a Remainder",
                "Division with a remainder is when the number doesn't split evenly, leaving some "
                "amount left over. Here's a question: what is 17 divided by 5? 5 times 3 is 15, "
                "leaving 2 left over, so the answer is 3 remainder 2.",
            ),
        ],
    },
    "Multiplication Tables": {
        "title": "What are Multiplication Tables?",
        "intro": (
            "What are multiplication tables? Multiplication tables list the answers to "
            "multiplying a number by 1, 2, 3, and so on. There are tables for every number, "
            "generally falling into two groups: smaller tables and bigger tables."
        ),
        "types": [
            (
                "Type 1: Smaller Tables",
                "Smaller tables, like the table of 4, are usually the first ones we memorise. "
                "Here's a question: in the table of 4, what comes after 4 times 3 equals 12? "
                "It's 4 times 4, which equals 16.",
            ),
            (
                "Type 2: Bigger Tables",
                "Bigger tables, like the table of 7, take more practice to remember. Here's a "
                "question: what is 7 times 8 from the table of 7? The answer is 56.",
            ),
        ],
    },
    "Area and Perimeter": {
        "title": "What are Area and Perimeter?",
        "intro": (
            "What are area and perimeter? Perimeter is the total distance around the outside "
            "edge of a shape. Area is the amount of flat space a shape covers on the inside. "
            "These are the two main measurements we use for shapes."
        ),
        "types": [
            (
                "Type 1: Perimeter",
                "Perimeter is found by adding up all the sides of a shape. Here's a question: a "
                "rectangle is 5 centimetres long and 3 centimetres wide. What is its perimeter? "
                "Add all four sides, 5 plus 3 plus 5 plus 3, which equals 16 centimetres.",
            ),
            (
                "Type 2: Area",
                "Area is found by multiplying a rectangle's length by its width, measured in "
                "square units. Here's a question: using the same rectangle, 5 centimetres long "
                "and 3 centimetres wide, what is its area? Multiply length by width, 5 times 3, "
                "which equals 15 square centimetres.",
            ),
        ],
    },
    "Plants": {
        "title": "What are Plants?",
        "intro": (
            "What are plants? Plants are living things that grow from seeds and make their own "
            "food using sunlight, water, and air, through photosynthesis. There are many types "
            "of plants, but two common ones are trees and herbs."
        ),
        "types": [
            (
                "Type 1: Trees",
                "Trees are tall, woody plants with a thick trunk that can live for many years. "
                "Here's a question: which part of a tree takes in water from the soil? The "
                "roots.",
            ),
            (
                "Type 2: Herbs",
                "Herbs are small, soft-stemmed plants, often used for food, spices, or medicine. "
                "Here's a question: what do we call the process plants use to make their own "
                "food using sunlight? Photosynthesis.",
            ),
        ],
    },
    "Animals": {
        "title": "What are Animals?",
        "intro": (
            "What are animals? Animals are living things that can move on their own and need to "
            "eat food to survive. Animals can be grouped by what they eat — two main types are "
            "herbivores and carnivores."
        ),
        "types": [
            (
                "Type 1: Herbivores",
                "Herbivores are animals that eat only plants, like cows and rabbits. Here's a "
                "question: what do we call animals that eat only plants? Herbivores.",
            ),
            (
                "Type 2: Carnivores",
                "Carnivores are animals that eat only meat, like lions and tigers. Here's a "
                "question: name one animal that only eats meat. A lion is a carnivore, since it "
                "only eats meat.",
            ),
        ],
    },
    "Human Body": {
        "title": "What is the Human Body?",
        "intro": (
            "What is the human body? The human body is made up of many parts that work together "
            "to keep us alive and healthy. Let's look at two important types of body parts: the "
            "heart and lungs, and the brain."
        ),
        "types": [
            (
                "Type 1: The Heart and Lungs",
                "The heart pumps blood all around our body, and the lungs help us breathe in "
                "air. Here's a question: which part of the body pumps blood all around us? The "
                "heart.",
            ),
            (
                "Type 2: The Brain",
                "The brain controls everything we think, feel, and do, and sends messages to the "
                "rest of our body. Here's a question: which part of the body controls everything "
                "we think and do? The brain.",
            ),
        ],
    },
    "Our Earth, Water, and Air": {
        "title": "What are Earth, Water, and Air?",
        "intro": (
            "What are Earth, water, and air? Our Earth is the planet we live on, made up of "
            "three main parts: land, water, and air."
        ),
        "types": [
            (
                "Type 1: Land",
                "Land includes mountains, plains, and soil, where plants grow and animals live. "
                "Here's a question: what do we call the soft, dark part of land where plants "
                "grow? Soil.",
            ),
            (
                "Type 2: Water",
                "Water is found in oceans, rivers, and lakes, and covers most of the Earth's "
                "surface. Here's a question: what covers most of the Earth's surface? Water.",
            ),
            (
                "Type 3: Air",
                "Air is the invisible layer of gases that surrounds the Earth and lets us "
                "breathe. Here's a question: what is the invisible layer of gases around the "
                "Earth called? Air, or the atmosphere.",
            ),
        ],
    },
    "Food and Health": {
        "title": "What is Food and Health?",
        "intro": (
            "What is food and health? Food gives our bodies energy and nutrients, and good "
            "habits keep us healthy. Let's look at two important types: healthy food, and "
            "healthy habits."
        ),
        "types": [
            (
                "Type 1: Healthy Food",
                "Fruits, vegetables, grains, and proteins like dal and eggs help our body grow "
                "and stay strong. Here's a question: which foods should we eat plenty of to stay "
                "healthy? Fruits and vegetables.",
            ),
            (
                "Type 2: Healthy Habits",
                "Washing hands, exercising, and sleeping well are habits that keep our whole "
                "body healthy. Here's a question: name one habit that keeps our body healthy. "
                "Washing our hands before eating.",
            ),
        ],
    },
    "Matter and Force": {
        "title": "What are Matter and Force?",
        "intro": (
            "What are matter and force? Matter is anything that takes up space and has weight, "
            "and force is a push or a pull. Let's look at two important ideas: the states of "
            "matter, and force."
        ),
        "types": [
            (
                "Type 1: States of Matter",
                "Matter exists as a solid, liquid, or gas, like ice, water, and steam. Here's a "
                "question: what are the three states of matter? Solid, liquid, and gas.",
            ),
            (
                "Type 2: Force",
                "A force is a push or a pull that can make an object start moving, stop, speed "
                "up, or change direction. Here's a question: is a force a push or a pull? It can "
                "be either — both a push and a pull are forces.",
            ),
        ],
    },
}

_CACHE_DIR = os.path.join(os.path.dirname(__file__), "data", "topic_intros")
# Guards against two simultaneous requests for the same never-before-cached
# topic both generating it at once — the second one just waits and then
# reads the first one's cached file instead of duplicating the work.
_build_locks: dict[str, threading.Lock] = {}
_build_locks_guard = threading.Lock()


def is_supported_topic(topic: str) -> bool:
    return topic in TOPIC_INTRO_CONTENT


def _cache_path(topic: str) -> str:
    safe_name = re.sub(r"[^A-Za-z0-9]+", "_", topic).strip("_") or "topic"
    return os.path.join(_CACHE_DIR, f"{safe_name}.mp4")


def _lock_for(topic: str) -> threading.Lock:
    with _build_locks_guard:
        if topic not in _build_locks:
            _build_locks[topic] = threading.Lock()
        return _build_locks[topic]


def get_topic_intro_video(topic: str) -> bytes:
    """Returns the cached intro video for a topic, building and caching it
    on first request. Raises KeyError if the topic has no fixed intro text.
    """
    data = TOPIC_INTRO_CONTENT[topic]
    path = _cache_path(topic)

    if os.path.exists(path):
        with open(path, "rb") as f:
            return f.read()

    with _lock_for(topic):
        if os.path.exists(path):
            with open(path, "rb") as f:
                return f.read()

        slides = [(data["title"], data["intro"])] + list(data["types"])
        video_bytes = build_topic_intro_video(topic, slides)
        os.makedirs(_CACHE_DIR, exist_ok=True)
        tmp_path = f"{path}.tmp"
        with open(tmp_path, "wb") as f:
            f.write(video_bytes)
        os.replace(tmp_path, path)
        return video_bytes
