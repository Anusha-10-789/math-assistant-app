import { getStoredCredentials } from "./auth";
import type { QuizResult } from "./components/QuizPlayer";
import type { ConceptVideo } from "./conceptVideos";
import type { CompletedTest } from "./testHistory";
import type { LessonContent } from "./types";
import type { WatchedVideos } from "./videoProgress";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class UnauthorizedError extends Error {}

function authHeaders(): Record<string, string> {
  const credentials = getStoredCredentials();
  if (!credentials) return {};
  return {
    "X-App-Username": credentials.username,
    "X-App-Password": credentials.password,
  };
}

// Backend generation endpoints enforce their own timeout (150s for lecture
// video, 80s for question video) and return an error response when it's hit.
// This client-side timeout is strictly longer than both, so it only fires as
// a last resort if the connection itself stalls (dropped Wi-Fi, a hung proxy,
// etc.) and the server's own response never arrives — without it, a stalled
// connection leaves the UI spinning forever with no way to recover.
const VIDEO_FETCH_TIMEOUT_MS = 170_000;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error("The connection stalled and the request timed out. Please check your network and try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null);
  return body?.detail ?? fallback;
}

export async function login(username: string, password: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Incorrect username or password."));
  }
}

export async function getGoogleAuthConfig(): Promise<{ configured: boolean; clientId: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/google/config`);
    if (!response.ok) return { configured: false, clientId: "" };
    const data = await response.json();
    return { configured: Boolean(data.configured), clientId: data.client_id ?? "" };
  } catch {
    return { configured: false, clientId: "" };
  }
}

export async function googleAuth(idToken: string): Promise<{ username: string; password: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Google sign-in failed."));
  }

  return response.json();
}

export type OtpChannel = "email" | "sms";
export type OtpPurpose = "signup" | "login" | "reset";

export interface SignupDetails {
  email: string;
  phone: string;
  password: string;
  securityQuestion: string;
  securityAnswer: string;
  otpChannel: OtpChannel | "";
  otpCode: string;
}

export async function signup(details: SignupDetails): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: details.email,
      phone: details.phone,
      password: details.password,
      security_question: details.securityQuestion,
      security_answer: details.securityAnswer,
      otp_channel: details.otpChannel,
      otp_code: details.otpCode,
    }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Failed to create the account."));
  }
}

async function postJson<T>(path: string, body: unknown, fallbackError: string, withAuth = false): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(withAuth ? authHeaders() : {}) },
    body: JSON.stringify(body),
  });

  if (response.status === 401 && withAuth) {
    throw new UnauthorizedError("Your session expired. Please log in again.");
  }
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, fallbackError));
  }
  return response.json();
}

export async function getOtpConfig(): Promise<{ email: boolean; sms: boolean }> {
  try {
    const response = await fetch(`${API_BASE_URL}/otp/config`);
    if (!response.ok) return { email: false, sms: false };
    const data = await response.json();
    return { email: Boolean(data.email), sms: Boolean(data.sms) };
  } catch {
    return { email: false, sms: false };
  }
}

// Sends a one-time code. Returns where it went (masked, e.g. "ki*@gmail.com").
export async function sendOtp(purpose: OtpPurpose, destination: string, channel: OtpChannel | "" = ""): Promise<string> {
  const data = await postJson<{ sent_to: string }>(
    "otp/send",
    { purpose, destination, channel },
    "Failed to send the code.",
  );
  return data.sent_to ?? "";
}

export async function loginWithOtp(identifier: string, code: string): Promise<{ username: string; password: string }> {
  return postJson("login/otp", { identifier, code }, "That code didn't work.");
}

export interface RecoveryOptions {
  securityQuestion: string;
  emailAvailable: boolean;
  maskedEmail: string;
  smsAvailable: boolean;
  maskedPhone: string;
}

export async function getRecoveryOptions(identifier: string): Promise<RecoveryOptions> {
  const data = await postJson<{
    security_question: string;
    email_available: boolean;
    masked_email: string;
    sms_available: boolean;
    masked_phone: string;
  }>("forgot-password/options", { identifier }, "Couldn't find that account.");
  return {
    securityQuestion: data.security_question ?? "",
    emailAvailable: Boolean(data.email_available),
    maskedEmail: data.masked_email ?? "",
    smsAvailable: Boolean(data.sms_available),
    maskedPhone: data.masked_phone ?? "",
  };
}

export async function resetPasswordWithSecurityAnswer(
  identifier: string,
  answer: string,
  newPassword: string,
): Promise<void> {
  await postJson(
    "forgot-password/security-answer",
    { identifier, answer, new_password: newPassword },
    "Failed to reset the password.",
  );
}

export async function resetPasswordWithCode(
  identifier: string,
  channel: OtpChannel,
  code: string,
  newPassword: string,
): Promise<void> {
  await postJson(
    "forgot-password/verify-code",
    { identifier, channel, code, new_password: newPassword },
    "Failed to reset the password.",
  );
}

export async function getOwnSecurityQuestion(): Promise<{ securityQuestion: string; isAccount: boolean }> {
  const response = await fetch(`${API_BASE_URL}/account/security-question`, { headers: authHeaders() });
  if (response.status === 401) {
    throw new UnauthorizedError("Your session expired. Please log in again.");
  }
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Failed to load your security question."));
  }
  const data = await response.json();
  return { securityQuestion: data.security_question ?? "", isAccount: Boolean(data.is_account) };
}

export async function setOwnSecurityQuestion(question: string, answer: string): Promise<void> {
  await postJson("account/security-question", { question, answer }, "Failed to save the security question.", true);
}

export interface IntroSlide {
  title: string;
  content: string;
  // Emoji for the slide's picture — sent with AI-written intros.
  art?: string[];
}

// Hand-written intros are keyed by topic; AI-written ones by topic and grade.
const introSlideCache = new Map<string, IntroSlide[]>();
const introKey = (topic: string, grade: number) => `${topic.toLowerCase()}|${grade}`;

export function getCachedIntroSlides(topic: string, grade: number): IntroSlide[] | null {
  return introSlideCache.get(topic) ?? introSlideCache.get(introKey(topic, grade)) ?? null;
}

// Loads every topic's intro slides in one go (right after login), so opening
// a topic's intro never waits on the network.
export async function prefetchAllIntroSlides(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/topic-intro-slides/all`, { headers: authHeaders() });
    if (!response.ok) return;
    const data: { topics: Record<string, IntroSlide[]> } = await response.json();
    for (const [topic, slides] of Object.entries(data.topics ?? {})) introSlideCache.set(topic, slides);
  } catch {
    // Not fatal — fetchTopicIntroSlides still loads a topic on demand.
  }
}

// A request already on its way is shared, so the intro is never written twice.
const introSlideRequests = new Map<string, Promise<IntroSlide[]>>();

export async function fetchTopicIntroSlides(topic: string, grade: number): Promise<IntroSlide[]> {
  const cached = getCachedIntroSlides(topic, grade);
  if (cached) return cached;
  const key = introKey(topic, grade);
  const pending = introSlideRequests.get(key);
  if (pending) return pending;
  const request = postJson<{ slides: IntroSlide[] }>(
    "topic-intro-slides",
    { topic, grade },
    "Failed to load the topic introduction.",
    true,
  )
    .then((data) => {
      introSlideCache.set(key, data.slides);
      return data.slides;
    })
    .finally(() => introSlideRequests.delete(key));
  introSlideRequests.set(key, request);
  return request;
}

export async function requestPasswordReset(identifier: string): Promise<"email" | "sms"> {
  const response = await fetch(`${API_BASE_URL}/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Failed to send the reset link."));
  }
  const data = await response.json();
  return data.channel === "sms" ? "sms" : "email";
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Failed to reset the password."));
  }
}

export async function generateLesson(
  topic: string,
  grade: number,
  numQuestions: number,
  subject: string,
  avoidQuestions: string[] = [],
): Promise<LessonContent> {
  const response = await fetch(`${API_BASE_URL}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      topic,
      grade,
      num_questions: numQuestions,
      subject,
      avoid_questions: avoidQuestions,
    }),
  });

  if (response.status === 401) {
    throw new UnauthorizedError("Your session expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Failed to generate the lesson."));
  }

  const data = await response.json();
  return data.lesson as LessonContent;
}

async function downloadFile(
  path: string,
  body: unknown,
  fallbackErrorMessage: string,
  fallbackFilename: string,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    throw new UnauthorizedError("Your session expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, fallbackErrorMessage));
  }

  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename=([^;]+)/);
  const filename = match ? match[1].trim() : fallbackFilename;

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function downloadLessonDocx(lesson: LessonContent): Promise<void> {
  return downloadFile(
    "download/docx",
    { lesson },
    "Failed to generate the Word document.",
    "Math_Assistant_Lesson.docx",
  );
}

export function downloadLessonPdf(lesson: LessonContent): Promise<void> {
  return downloadFile(
    "download/pdf",
    { lesson },
    "Failed to generate the PDF document.",
    "Math_Assistant_Lesson.pdf",
  );
}

function toReportPayload(topic: string, grade: number, result: QuizResult, details = "") {
  return {
    topic,
    grade,
    details,
    result: {
      score: result.score,
      total: result.total,
      missed: result.missed.map((item) => ({
        question_number: item.questionNumber,
        topic: item.topic,
        question: item.question,
        your_answer: item.yourAnswer,
        correct_answer: item.correctAnswer,
        your_answer_text: item.yourAnswerText,
        correct_answer_text: item.correctAnswerText,
        explanation: item.explanation,
      })),
    },
  };
}

export function downloadReportDocx(topic: string, grade: number, result: QuizResult, details = ""): Promise<void> {
  return downloadFile(
    "download/report/docx",
    toReportPayload(topic, grade, result, details),
    "Failed to generate the report.",
    "Math_Assistant_Report.docx",
  );
}

export function downloadReportPdf(topic: string, grade: number, result: QuizResult, details = ""): Promise<void> {
  return downloadFile(
    "download/report/pdf",
    toReportPayload(topic, grade, result, details),
    "Failed to generate the report.",
    "Math_Assistant_Report.pdf",
  );
}

export async function fetchLectureVideo(lesson: LessonContent): Promise<Blob> {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/lecture-video`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ lesson }),
    },
    VIDEO_FETCH_TIMEOUT_MS,
  );

  if (response.status === 401) {
    throw new UnauthorizedError("Your session expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Failed to generate the lecture video."));
  }

  return response.blob();
}

export async function fetchTopicIntroVideo(topic: string): Promise<Blob> {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/topic-intro-video`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ topic }),
    },
    VIDEO_FETCH_TIMEOUT_MS,
  );

  if (response.status === 401) {
    throw new UnauthorizedError("Your session expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Failed to load the topic introduction video."));
  }

  return response.blob();
}

export async function getYouTubeConfig(): Promise<{ configured: boolean }> {
  try {
    const response = await fetch(`${API_BASE_URL}/youtube/config`);
    if (!response.ok) return { configured: false };
    const data = await response.json();
    return { configured: Boolean(data.configured) };
  } catch {
    return { configured: false };
  }
}

export interface YouTubeExplanation {
  available: boolean;
  videoId?: string;
  title?: string;
  channelTitle?: string;
  embedUrl?: string;
}

export async function fetchYouTubeExplanation(topic: string, grade: number): Promise<YouTubeExplanation> {
  const response = await fetch(`${API_BASE_URL}/youtube-explanation`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ topic, grade }),
  });

  if (response.status === 401) {
    throw new UnauthorizedError("Your session expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Failed to find a YouTube video for this topic."));
  }

  const data = await response.json();
  if (!data.available) return { available: false };

  return {
    available: true,
    videoId: data.video_id,
    title: data.title,
    channelTitle: data.channel_title,
    embedUrl: data.embed_url,
  };
}

export async function getSmsConfig(): Promise<{ configured: boolean }> {
  try {
    const response = await fetch(`${API_BASE_URL}/sms/config`);
    if (!response.ok) return { configured: false };
    const data = await response.json();
    return { configured: Boolean(data.configured) };
  } catch {
    return { configured: false };
  }
}

export async function sendResultSms(
  phone: string,
  topic: string,
  grade: number,
  score: number,
  total: number,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/send-result-sms`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ phone, topic, grade, score, total }),
  });

  if (response.status === 401) {
    throw new UnauthorizedError("Your session expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Failed to send the result by SMS."));
  }
}

const conceptVideoCache = new Map<string, Promise<ConceptVideo>>();

// An AI-made animated video for topics without a hand-made one. The backend
// caches each topic/grade, so this is usually instant after the first student.
export function fetchConceptVideo(topic: string, grade: number): Promise<ConceptVideo> {
  const key = `${topic.toLowerCase()}|${grade}`;
  const cached = conceptVideoCache.get(key);
  if (cached) return cached;
  const promise = postJson<{ video: ConceptVideo }>(
    "concept-video",
    { topic, grade },
    "Couldn't make the video. Please try again.",
    true,
  ).then((data) => data.video);
  promise.catch(() => conceptVideoCache.delete(key));
  conceptVideoCache.set(key, promise);
  return promise;
}

export interface SavedProgress {
  history: CompletedTest[];
  watched: WatchedVideos;
}

export async function fetchProgress(): Promise<SavedProgress> {
  const response = await fetch(`${API_BASE_URL}/progress`, { headers: authHeaders() });
  if (response.status === 401) throw new UnauthorizedError("Your session expired. Please log in again.");
  if (!response.ok) throw new Error(await extractErrorMessage(response, "Couldn't load your progress."));
  return response.json();
}

export async function saveProgress(progress: SavedProgress): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/progress`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(progress),
  });
  if (!response.ok) throw new Error(await extractErrorMessage(response, "Couldn't save your progress."));
}

// ---------- Admin portal and teacher content (backend/admin_api.py) ----------

export interface TeacherQuestion {
  question: string;
  options: [string, string, string, string];
  answer: "A" | "B" | "C" | "D";
  explanation: string;
}

export interface TeacherLessonInput {
  subject: "Mathematics" | "Science";
  grade: number;
  title: string;
  description: string;
  notes: string;
  icon: string;
  published: boolean;
  questions: TeacherQuestion[];
}

export interface TeacherLesson extends TeacherLessonInput {
  id: string;
  created_at: number;
  updated_at: number;
}

export interface AssignmentInput {
  subject: "Mathematics" | "Science";
  grade: number;
  topic: string;
  lesson_id: string;
  num_questions: number;
  students: string[];
  due: string;
  note: string;
}

export interface AssignmentResult {
  score: number;
  total: number;
  completed_at: number;
}

export interface Assignment extends AssignmentInput {
  id: string;
  created_at: number;
  results: Record<string, AssignmentResult>;
}

export interface MyAssignment extends Omit<AssignmentInput, "students"> {
  id: string;
  created_at: number;
  result: AssignmentResult | null;
}

export interface StudentAccount {
  username: string;
  name: string;
  email: string;
  phone: string;
}

async function authedJson<T>(method: string, path: string, fallbackError: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...authHeaders() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 401) throw new UnauthorizedError("Your session expired. Please log in again.");
  if (!response.ok) throw new Error(await extractErrorMessage(response, fallbackError));
  return response.json();
}

export const getMe = () => authedJson<{ username: string; is_admin: boolean }>("GET", "me", "Couldn't load your account.");

export const getTeacherContent = () =>
  authedJson<{ lessons: TeacherLesson[]; hidden_topics: string[] }>("GET", "content", "Couldn't load lessons from your teacher.");

export const adminListLessons = () => authedJson<{ lessons: TeacherLesson[] }>("GET", "admin/lessons", "Couldn't load lessons.");
export const adminCreateLesson = (lesson: TeacherLessonInput) =>
  authedJson<{ lesson: TeacherLesson }>("POST", "admin/lessons", "Couldn't save the lesson.", lesson);
export const adminUpdateLesson = (id: string, lesson: TeacherLessonInput) =>
  authedJson<{ lesson: TeacherLesson }>("PUT", `admin/lessons/${id}`, "Couldn't save the lesson.", lesson);
export const adminDeleteLesson = (id: string) =>
  authedJson<{ assignments_removed: number }>("DELETE", `admin/lessons/${id}`, "Couldn't delete the lesson.");
export const adminDraftLesson = (draft: { subject: string; grade: number; title: string; num_questions: number }) =>
  authedJson<{ notes: string; questions: TeacherQuestion[] }>("POST", "admin/lessons/draft", "Couldn't write a draft.", draft);

export const adminSetHiddenTopics = (topics: string[]) =>
  authedJson<{ hidden_topics: string[] }>("PUT", "admin/hidden-topics", "Couldn't update the topics.", { topics });

export const adminListStudents = () => authedJson<{ students: StudentAccount[] }>("GET", "admin/students", "Couldn't load students.");
export const adminListAssignments = () => authedJson<{ assignments: Assignment[] }>("GET", "admin/assignments", "Couldn't load assigned tests.");
export const adminCreateAssignment = (assignment: AssignmentInput) =>
  authedJson<{ assignment: Assignment }>("POST", "admin/assignments", "Couldn't assign the test.", assignment);
export const adminDeleteAssignment = (id: string) => authedJson("DELETE", `admin/assignments/${id}`, "Couldn't remove the test.");

export const getMyAssignments = () => authedJson<{ assignments: MyAssignment[] }>("GET", "my-assignments", "Couldn't load your assigned tests.");
export const submitAssignmentResult = (id: string, score: number, total: number) =>
  authedJson("POST", `my-assignments/${id}/result`, "Couldn't save your result.", { score, total });
