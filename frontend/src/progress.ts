import type { Subject } from "./components/SubjectSelect";
import { subjectForTopic } from "./subjectModules";
import type { CompletedTest } from "./testHistory";

export type MasteryLevel = "mastered" | "improving" | "practice";

export const MASTERY_PERCENT = 80;
const IMPROVING_PERCENT = 50;
// Mastery is judged on the most recent attempts, so an early low score
// doesn't hold a student back once they've improved.
const RECENT_ATTEMPTS = 3;
// A skill needs this many answered questions before it's called weak or
// strong — one unlucky question shouldn't flag a whole skill.
const MIN_SKILL_QUESTIONS = 3;
const WEAK_SKILL_PERCENT = 60;
const STRONG_SKILL_PERCENT = 85;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface TopicProgress {
  topic: string;
  subject: Subject;
  attempts: number;
  latestPercent: number;
  bestPercent: number;
  recentPercent: number;
  // Change from the previous attempt, in percentage points (null on the first).
  trend: number | null;
  level: MasteryLevel;
  lastActive: number;
  // Grade of the most recent test — where a class or practice test picks up.
  grade: number;
}

export interface SkillProgress {
  skill: string;
  correct: number;
  total: number;
  percent: number;
  // The test topic this skill was last practised under — where "Practice"
  // sends the student.
  practiceTopic: string;
}

export interface ProgressReport {
  totalTests: number;
  averagePercent: number;
  lastWeek: { tests: number; averagePercent: number | null };
  topics: TopicProgress[];
  weakSkills: SkillProgress[];
  strongSkills: SkillProgress[];
  // Oldest first, for the score chart.
  timeline: CompletedTest[];
}

export function percentOf(test: CompletedTest): number {
  return test.total > 0 ? Math.round((test.score / test.total) * 100) : 0;
}

function average(values: number[]): number {
  return values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : 0;
}

export function levelFor(percent: number): MasteryLevel {
  if (percent >= MASTERY_PERCENT) return "mastered";
  if (percent >= IMPROVING_PERCENT) return "improving";
  return "practice";
}

export function buildProgress(history: CompletedTest[], now = Date.now()): ProgressReport {
  const chronological = [...history].sort((a, b) => a.completedAt - b.completedAt);

  const byTopic = new Map<string, CompletedTest[]>();
  for (const test of chronological) {
    byTopic.set(test.topic, [...(byTopic.get(test.topic) ?? []), test]);
  }

  const topics: TopicProgress[] = Array.from(byTopic.entries()).map(([topic, tests]) => {
    const percents = tests.map(percentOf);
    const latest = percents[percents.length - 1];
    const recentPercent = average(percents.slice(-RECENT_ATTEMPTS));
    return {
      topic,
      subject: tests[tests.length - 1].subject ?? subjectForTopic(topic),
      attempts: tests.length,
      latestPercent: latest,
      bestPercent: Math.max(...percents),
      recentPercent,
      trend: percents.length > 1 ? latest - percents[percents.length - 2] : null,
      level: levelFor(recentPercent),
      lastActive: tests[tests.length - 1].completedAt,
      grade: tests[tests.length - 1].grade,
    };
  });
  // Weakest first, so what needs attention is at the top.
  topics.sort((a, b) => a.recentPercent - b.recentPercent || b.lastActive - a.lastActive);

  const skills = new Map<string, SkillProgress>();
  for (const test of chronological) {
    const missed = new Set(test.missed.map((m) => m.questionNumber));
    for (const mcq of test.mcqs) {
      const skill = mcq.topic?.trim() || test.topic;
      const entry = skills.get(skill) ?? { skill, correct: 0, total: 0, percent: 0, practiceTopic: test.topic };
      entry.total += 1;
      if (!missed.has(mcq.question_number)) entry.correct += 1;
      entry.practiceTopic = test.topic;
      skills.set(skill, entry);
    }
  }
  const rated = Array.from(skills.values())
    .map((s) => ({ ...s, percent: Math.round((s.correct / s.total) * 100) }))
    .filter((s) => s.total >= MIN_SKILL_QUESTIONS);

  const lastWeekTests = chronological.filter((t) => now - t.completedAt <= 7 * DAY_MS);

  return {
    totalTests: chronological.length,
    averagePercent: average(chronological.map(percentOf)),
    lastWeek: {
      tests: lastWeekTests.length,
      averagePercent: lastWeekTests.length ? average(lastWeekTests.map(percentOf)) : null,
    },
    topics,
    weakSkills: rated
      .filter((s) => s.percent < WEAK_SKILL_PERCENT)
      .sort((a, b) => a.percent - b.percent || b.total - a.total)
      .slice(0, 6),
    strongSkills: rated
      .filter((s) => s.percent >= STRONG_SKILL_PERCENT)
      .sort((a, b) => b.percent - a.percent || b.total - a.total)
      .slice(0, 6),
    timeline: chronological.slice(-20),
  };
}

// Topics to re-learn and practise: every topic not yet mastered (recent
// average below MASTERY_PERCENT), weakest first. Mixed reviews are left out —
// they span many topics, so the weak topic inside them is what to practise.
export function weakTopics(history: CompletedTest[]): TopicProgress[] {
  return buildProgress(history).topics.filter((t) => t.level !== "mastered" && !t.topic.startsWith("Mixed Review"));
}
