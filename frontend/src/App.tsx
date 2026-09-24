import { useEffect, useRef, useState } from "react";
import AiBackdrop from "./components/AiBackdrop";
import AttendancePage from "./components/AttendancePage";
import DownloadButtons from "./components/DownloadButtons";
import ErrorMessage from "./components/ErrorMessage";
import GradeSelect from "./components/GradeSelect";
import LecturePlayer from "./components/LecturePlayer";
import LoadingSpinner from "./components/LoadingSpinner";
import LoginGate from "./components/LoginGate";
import ProfilePage from "./components/ProfilePage";
import QuizPlayer, { type QuizResult } from "./components/QuizPlayer";
import ResetPasswordPage from "./components/ResetPasswordPage";
import SubjectSelect, { type Subject } from "./components/SubjectSelect";
import TestHistoryPage from "./components/TestHistoryPage";
import TestSummary from "./components/TestSummary";
import TopicIntroPlayer from "./components/TopicIntroPlayer";
import TopicSelect from "./components/TopicSelect";
import {
  downloadLessonDocx,
  downloadLessonPdf,
  downloadReportDocx,
  downloadReportPdf,
  fetchLectureVideo,
  fetchTopicIntroSlides,
  prefetchAllIntroSlides,
  fetchYouTubeExplanation,
  generateLesson,
  UnauthorizedError,
  type YouTubeExplanation,
} from "./api";
import { clearStoredCredentials, getStoredCredentials } from "./auth";
import { buildLocalMathLesson, isLocalMathTopic, questionKey } from "./mathQuestionBank";
import { recordCompletedLesson } from "./profileStorage";
import { clearTestHistory, getTestHistory, getTopicAttendance, recordCompletedTest } from "./testHistory";
import { hasTopicIntro } from "./topicIntros";
import type { LessonContent } from "./types";

type Stage = "subject" | "topic" | "topic-intro" | "grade" | "lecture" | "test" | "summary";
type View = "app" | "profile" | "history" | "attendance";

export default function App() {
  const [resetToken, setResetToken] = useState(
    () => new URLSearchParams(window.location.search).get("reset_token"),
  );
  const [needsLogin, setNeedsLogin] = useState(() => !getStoredCredentials());
  const [username, setUsername] = useState(() => getStoredCredentials()?.username ?? "");

  const [view, setView] = useState<View>("app");
  const [stage, setStage] = useState<Stage>("subject");
  const [subject, setSubject] = useState<Subject>("Mathematics");

  const [topic, setTopic] = useState("");
  const [grade, setGrade] = useState(3);
  const [numQuestions, setNumQuestions] = useState(20);

  const [lesson, setLesson] = useState<LessonContent | null>(null);
  const [lessonKey, setLessonKey] = useState(0);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingReportDocx, setDownloadingReportDocx] = useState(false);
  const [downloadingReportPdf, setDownloadingReportPdf] = useState(false);
  const [testHistory, setTestHistory] = useState(() => getTestHistory());
  const [attendance, setAttendance] = useState(() => getTopicAttendance());

  const lessonStartRef = useRef<number | null>(null);
  // Science / typed-in topics come from Gemini, which takes a while — so the
  // request starts while the student is still on the grade screen, and Start
  // usually finds it already done.
  const prefetchRef = useRef<{ key: string; promise: Promise<LessonContent> } | null>(null);

  function pastQuestions(topicArg: string, gradeArg: number) {
    return testHistory
      .filter((test) => test.topic === topicArg && test.grade === gradeArg)
      .flatMap((test) => test.mcqs);
  }

  function requestAiLesson(topicArg: string, gradeArg: number, numQuestionsArg: number) {
    const key = `${subject}|${topicArg}|${gradeArg}|${numQuestionsArg}`;
    if (prefetchRef.current?.key === key) return prefetchRef.current.promise;
    const avoid = pastQuestions(topicArg, gradeArg)
      .map((mcq) => mcq.question)
      .slice(-60);
    const promise = generateLesson(topicArg, gradeArg, numQuestionsArg, subject, avoid);
    promise.catch(() => {
      if (prefetchRef.current?.promise === promise) prefetchRef.current = null;
    });
    prefetchRef.current = { key, promise };
    return promise;
  }

  useEffect(() => {
    if (!needsLogin) prefetchAllIntroSlides();
  }, [needsLogin]);

  useEffect(() => {
    const trimmed = topic.trim();
    if (stage !== "grade" || needsLogin || !trimmed || isLocalMathTopic(trimmed)) return;
    // Debounced so flicking through grades doesn't fire a request for each.
    const timer = setTimeout(() => requestAiLesson(trimmed, grade, numQuestions), 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, topic, grade, numQuestions, subject, needsLogin]);

  function startLesson(result: LessonContent) {
    setLesson(result);
    setLessonKey((k) => k + 1);
    lessonStartRef.current = Date.now();
    setStage("test");
  }

  function handleSessionExpired(message: string) {
    clearStoredCredentials();
    setNeedsLogin(true);
    setError(message);
  }

  async function handleGenerate(topicArg: string, gradeArg: number, numQuestionsArg: number) {
    setError("");

    if (!topicArg.trim()) {
      setError("Please enter a topic or question before submitting.");
      return;
    }

    setQuizResult(null);
    const trimmed = topicArg.trim();

    // Maths modules are built instantly in the browser — no waiting at all.
    if (isLocalMathTopic(trimmed)) {
      const avoid = pastQuestions(trimmed, gradeArg).map((mcq) => questionKey(mcq.topic, mcq.question));
      startLesson(buildLocalMathLesson(trimmed, gradeArg, numQuestionsArg, avoid));
      return;
    }

    setLoading(true);
    try {
      startLesson(await requestAiLesson(trimmed, gradeArg, numQuestionsArg));
      prefetchRef.current = null;
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        handleSessionExpired("Your session expired. Please log in again.");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleModuleSelect(moduleTopic: string) {
    setTopic(moduleTopic);
    setError("");
    setStage(hasTopicIntro(moduleTopic) ? "topic-intro" : "grade");
  }

  function handleTopicNext() {
    if (!topic.trim()) {
      setError("Please choose a topic module or type your own topic before continuing.");
      return;
    }
    setError("");
    setStage(hasTopicIntro(topic) ? "topic-intro" : "grade");
  }

  function handleGenerateClick() {
    handleGenerate(topic, grade, numQuestions);
  }

  function handleFinishTest(result: QuizResult) {
    setQuizResult(result);
    const completedAt = Date.now();
    const startedAt = lessonStartRef.current ?? completedAt;
    const durationSeconds = (completedAt - startedAt) / 1000;
    recordCompletedLesson(durationSeconds, completedAt);
    if (lesson) {
      setTestHistory(
        recordCompletedTest({
          topic: lesson.topic,
          grade: lesson.grade,
          completedAt,
          score: result.score,
          total: result.total,
          durationSeconds,
          mcqs: lesson.mcqs,
          missed: result.missed,
        }),
      );
      setAttendance(getTopicAttendance());
    }
    setStage("summary");
  }

  async function handleDownloadDocx() {
    if (!lesson) return;
    setError("");
    setDownloadingDocx(true);
    try {
      await downloadLessonDocx(lesson);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        handleSessionExpired("Your session expired. Please log in again.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to download the Word document.");
      }
    } finally {
      setDownloadingDocx(false);
    }
  }

  async function handleDownloadPdf() {
    if (!lesson) return;
    setError("");
    setDownloadingPdf(true);
    try {
      await downloadLessonPdf(lesson);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        handleSessionExpired("Your session expired. Please log in again.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to download the PDF document.");
      }
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleDownloadReportDocx() {
    if (!lesson || !quizResult) return;
    setError("");
    setDownloadingReportDocx(true);
    try {
      await downloadReportDocx(lesson.topic, lesson.grade, quizResult);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        handleSessionExpired("Your session expired. Please log in again.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to download the report.");
      }
    } finally {
      setDownloadingReportDocx(false);
    }
  }

  async function handleDownloadReportPdf() {
    if (!lesson || !quizResult) return;
    setError("");
    setDownloadingReportPdf(true);
    try {
      await downloadReportPdf(lesson.topic, lesson.grade, quizResult);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        handleSessionExpired("Your session expired. Please log in again.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to download the report.");
      }
    } finally {
      setDownloadingReportPdf(false);
    }
  }

  async function handleFetchVideo(): Promise<Blob> {
    if (!lesson) throw new Error("No lesson loaded.");
    try {
      return await fetchLectureVideo(lesson);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        handleSessionExpired("Your session expired. Please log in again.");
      }
      throw err;
    }
  }

  async function handleFetchTopicIntroSlides(introTopic: string) {
    try {
      return await fetchTopicIntroSlides(introTopic);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        handleSessionExpired("Your session expired. Please log in again.");
      }
      throw err;
    }
  }

  async function handleFetchYouTubeExplanation(topic: string): Promise<YouTubeExplanation> {
    if (!lesson) throw new Error("No lesson loaded.");
    try {
      return await fetchYouTubeExplanation(topic, lesson.grade);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        handleSessionExpired("Your session expired. Please log in again.");
      }
      throw err;
    }
  }

  function handleLogout() {
    clearStoredCredentials();
    setNeedsLogin(true);
    setView("app");
  }

  if (resetToken) {
    return (
      <ResetPasswordPage
        token={resetToken}
        onDone={() => {
          setResetToken(null);
          window.history.replaceState({}, "", window.location.pathname);
        }}
      />
    );
  }

  if (needsLogin) {
    return (
      <LoginGate
        onLogin={() => {
          setUsername(getStoredCredentials()?.username ?? "");
          setNeedsLogin(false);
        }}
      />
    );
  }

  const sidebarItems: Array<{ view: View; icon: string; label: string }> = [
    { view: "attendance", icon: "📅", label: "Attendance" },
    { view: "history", icon: "📝", label: "My Tests" },
    { view: "profile", icon: "👤", label: "Profile" },
  ];

  return (
    <div className="min-h-screen">
      <AiBackdrop theme={subject === "Science" ? "science" : "math"} />

      <nav className="fixed left-0 top-0 z-10 flex h-full w-20 flex-col items-center gap-4 border-r border-indigo-100 bg-white/80 py-6 backdrop-blur">
        {sidebarItems.map((item) => {
          const active = view === item.view;
          return (
            <button
              key={item.view}
              type="button"
              onClick={() => setView(active ? "app" : item.view)}
              title={item.label}
              aria-label={item.label}
              className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl leading-none shadow-sm transition ${
                active
                  ? "bg-indigo-600 text-white shadow-indigo-200"
                  : "bg-white text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
              }`}
            >
              {item.icon}
            </button>
          );
        })}
      </nav>

      <div className="pl-20">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">

        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">AI Assistant for Kids</h1>
        </header>

        {view === "profile" ? (
          <ProfilePage username={username} onBack={() => setView("app")} onLogout={handleLogout} />
        ) : view === "history" ? (
          <TestHistoryPage
            history={testHistory}
            onBack={() => setView("app")}
            onClear={() => {
              setTestHistory(clearTestHistory());
              setAttendance([]);
            }}
          />
        ) : view === "attendance" ? (
          <AttendancePage attendance={attendance} onBack={() => setView("app")} />
        ) : (
          <div className="space-y-6">
            {stage === "subject" && (
              <SubjectSelect
                onSelectSubject={(selected) => {
                  setSubject(selected);
                  setTopic("");
                  setError("");
                  setStage("topic");
                }}
              />
            )}

            {stage === "topic" && (
              <>
                <button
                  type="button"
                  onClick={() => setStage("subject")}
                  className="text-sm font-medium text-indigo-600 hover:underline"
                >
                  ← Change subject
                </button>
                <TopicSelect
                  subject={subject}
                  topic={topic}
                  onTopicChange={setTopic}
                  onModuleSelect={handleModuleSelect}
                  onNext={handleTopicNext}
                />
              </>
            )}

            {stage === "topic-intro" && (
              <TopicIntroPlayer
                key={topic}
                topic={topic}
                onContinue={() => setStage("grade")}
                onBack={() => setStage("topic")}
                onFetchSlides={handleFetchTopicIntroSlides}
              />
            )}

            {stage === "grade" && (
              <GradeSelect
                topic={topic}
                grade={grade}
                onGradeChange={setGrade}
                numQuestions={numQuestions}
                onNumQuestionsChange={setNumQuestions}
                onBack={() => setStage("topic")}
                onGenerate={handleGenerateClick}
                loading={loading}
              />
            )}

            {error && <ErrorMessage message={error} />}
            {loading && <LoadingSpinner />}

            {lesson && stage === "lecture" && (
              <LecturePlayer
                key={lessonKey}
                lesson={lesson}
                onStartTest={() => setStage("test")}
                onFetchVideo={handleFetchVideo}
              />
            )}

            {lesson && stage === "test" && (
              <QuizPlayer
                key={lessonKey}
                mcqs={lesson.mcqs}
                onFinish={handleFinishTest}
                onFetchYouTubeExplanation={handleFetchYouTubeExplanation}
              />
            )}

            {lesson && stage === "summary" && quizResult && (
              <TestSummary
                topic={lesson.topic}
                grade={lesson.grade}
                result={quizResult}
                onDownloadReportDocx={handleDownloadReportDocx}
                onDownloadReportPdf={handleDownloadReportPdf}
                downloadingReportDocx={downloadingReportDocx}
                downloadingReportPdf={downloadingReportPdf}
              />
            )}

            {lesson && (stage === "lecture" || stage === "test") && (
              <DownloadButtons
                onDownloadDocx={handleDownloadDocx}
                onDownloadPdf={handleDownloadPdf}
                downloadingDocx={downloadingDocx}
                downloadingPdf={downloadingPdf}
              />
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
