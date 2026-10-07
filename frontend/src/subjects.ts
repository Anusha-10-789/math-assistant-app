// The school subjects, with how each is shown. Pages read labels and icons
// from here rather than checking subject names one by one.

export type Subject = "Mathematics" | "Science" | "Social Studies";

export const SUBJECTS: Subject[] = ["Mathematics", "Science", "Social Studies"];

export const SUBJECT_INFO: Record<Subject, { label: string; icon: string; file: string; example: string }> = {
  // `file` names the concept-video library files (backend/build_concept_video_library.py).
  Mathematics: { label: "Maths", icon: "🧮", file: "maths", example: "e.g. What is a fraction?" },
  Science: { label: "Science", icon: "🔬", file: "science", example: "e.g. How do animals breathe?" },
  "Social Studies": { label: "Social Studies", icon: "🌏", file: "social", example: "e.g. Why do we celebrate Independence Day?" },
};

export const subjectLabel = (subject: Subject) => SUBJECT_INFO[subject].label;
export const subjectWithIcon = (subject: Subject) => `${SUBJECT_INFO[subject].icon} ${SUBJECT_INFO[subject].label}`;
