export interface VisualAidData {
  type: "groups" | "number_line" | "pie" | "none" | string;
  param1: number;
  param2: number;
  param3: number;
  label: string;
}

export interface LectureSlideData {
  title: string;
  content: string;
  visual: VisualAidData;
}

export interface MCQItem {
  topic: string;
  question_number: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
  trick: string;
  visual: VisualAidData;
}

export interface LessonContent {
  topic: string;
  grade: number;
  concept_explanation: string;
  lecture_slides: LectureSlideData[];
  mcqs: MCQItem[];
}
