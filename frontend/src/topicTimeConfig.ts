// Recommended time-on-topic allotments (in minutes), used only for the
// Attendance page's "allotted vs. spent" comparison — these are informational
// targets, not enforced limits (no countdown/lockout during a lesson).
const TOPIC_MINUTES: Record<string, number> = {
  Addition: 30,
  Subtraction: 30,
  Multiplication: 35,
  Division: 40,
  "Multiplication Tables": 50,
  "Area and Perimeter": 60,
  Plants: 30,
  Animals: 30,
  "Human Body": 30,
  "Our Earth, Water, and Air": 30,
  "Food and Health": 30,
  "Matter and Force": 30,
};

// Fallback for topics not in the list above — custom/free-text topics and
// "All Topics" mixed reviews.
export const DEFAULT_TOPIC_MINUTES = 30;

export function getAllottedMinutes(topic: string): number {
  return TOPIC_MINUTES[topic] ?? DEFAULT_TOPIC_MINUTES;
}
