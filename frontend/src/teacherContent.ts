import type { TeacherLesson } from "./api";
import type { Subject } from "./components/SubjectSelect";
import type { TopicModule } from "./subjectModules";
import type { LessonContent, MCQItem } from "./types";

// Lessons a teacher made in the Admin portal, and the syllabus topics they
// removed. Loaded after login (see App) and read by the topic screen and when
// a test starts.

export const TEACHER_GROUP = "📌 From your teacher";

let lessons: TeacherLesson[] = [];
let hidden = new Set<string>();

export function setTeacherContent(next: { lessons: TeacherLesson[]; hidden_topics: string[] }): void {
  lessons = next.lessons;
  hidden = new Set(next.hidden_topics);
}

export const hiddenTopicKey = (subject: Subject, grade: number, topic: string) => `${subject}|${grade}|${topic}`;

export function isTopicHidden(subject: Subject, grade: number, topic: string): boolean {
  return hidden.has(hiddenTopicKey(subject, grade, topic));
}

export function teacherLessonsFor(subject: Subject, grade: number): TeacherLesson[] {
  return lessons.filter((lesson) => lesson.subject === subject && lesson.grade === grade && lesson.questions.length > 0);
}

export function findTeacherLesson(topic: string, grade?: number, subject?: Subject): TeacherLesson | undefined {
  return lessons.find(
    (lesson) => lesson.title === topic && (grade === undefined || lesson.grade === grade) && (subject === undefined || lesson.subject === subject),
  );
}

export function teacherTopicModule(lesson: TeacherLesson): TopicModule {
  return {
    label: lesson.title,
    icon: lesson.icon || "📘",
    topic: lesson.title,
    description: lesson.description || `${lesson.questions.length} questions from your teacher`,
    group: TEACHER_GROUP,
  };
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// A test from the teacher's own questions, in the same shape as a generated
// lesson, so the quiz, results, reports and progress all work unchanged.
export function buildTeacherTest(lesson: TeacherLesson, numQuestions: number): LessonContent {
  const picked = shuffle(lesson.questions).slice(0, Math.max(1, Math.min(numQuestions, lesson.questions.length)));
  const mcqs: MCQItem[] = picked.map((q, index) => ({
    topic: lesson.title,
    question_number: index + 1,
    question: q.question,
    option_a: q.options[0],
    option_b: q.options[1],
    option_c: q.options[2],
    option_d: q.options[3],
    correct_answer: q.answer,
    explanation: q.explanation || `The correct answer is ${q.answer}) ${q.options["ABCD".indexOf(q.answer)]}.`,
    trick: "",
    visual: { type: "none", param1: 0, param2: 0, param3: 0, label: "" },
  }));
  return { topic: lesson.title, grade: lesson.grade, concept_explanation: lesson.notes, lecture_slides: [], mcqs };
}
