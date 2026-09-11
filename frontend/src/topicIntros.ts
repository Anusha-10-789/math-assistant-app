// Topics with a fixed, hand-written intro video (see backend/topic_intro_service.py
// TOPIC_INTRO_TEXT — keep this set in sync with that dict's keys). A topic
// not in this set (e.g. a custom typed-in topic, or "All Topics" mixed
// review) has no intro video and skips straight to grade selection.
const TOPICS_WITH_INTRO = new Set([
  "Addition",
  "Subtraction",
  "Multiplication",
  "Division",
  "Multiplication Tables",
  "Area and Perimeter",
  "Plants",
  "Animals",
  "Human Body",
  "Our Earth, Water, and Air",
  "Food and Health",
  "Matter and Force",
]);

export function hasTopicIntro(topic: string): boolean {
  return TOPICS_WITH_INTRO.has(topic);
}
