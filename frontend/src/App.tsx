import { useEffect, useRef, useState } from "react";
import LogoMark from "./components/LogoMark";
import AdminPage from "./components/AdminPage";
import ReadingPoster from "./components/ReadingPoster";
import MathBackdrop from "./components/MathBackdrop";
import SolarSystemBackdrop from "./components/SolarSystemBackdrop";
import WorldBackdrop from "./components/WorldBackdrop";
import DownloadButtons from "./components/DownloadButtons";
import ErrorMessage from "./components/ErrorMessage";
import GradeSelect from "./components/GradeSelect";
import LecturePlayer from "./components/LecturePlayer";
import LoadingSpinner from "./components/LoadingSpinner";
import LoginGate from "./components/LoginGate";
import ProfilePage from "./components/ProfilePage";
import ProgressPage from "./components/ProgressPage";
import QuizPlayer, { type QuizResult } from "./components/QuizPlayer";
import ResetPasswordPage from "./components/ResetPasswordPage";
import SubjectSelect, { type Subject } from "./components/SubjectSelect";
import TestHistoryPage from "./components/TestHistoryPage";
import TestSummary from "./components/TestSummary";
import TopicIntroPlayer from "./components/TopicIntroPlayer";
import TopicVideos from "./components/TopicVideos";
import PracticePlan from "./components/PracticePlan";
import TopicSelect from "./components/TopicSelect";
import VideoLibraryPage from "./components/VideoLibraryPage";
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
  getMyAssignments,
  getTeacherContent,
  submitAssignmentResult,
  type MyAssignment,
} from "./api";
import { clearStoredCredentials, getStoredCredentials, getStoredRole } from "./auth";
import { hasConceptVideos } from "./conceptVideos";
import { buildLocalMathLesson, isLocalMathTopic, questionKey } from "./mathQuestionBank";
import { recordCompletedLesson } from "./profileStorage";
import { clearTestHistory, getTestHistory, recordCompletedTest, type CompletedTest } from "./testHistory";
import { getProfileInfo } from "./profileInfo";
import { weakTopics, type TopicProgress } from "./progress";
import { buildTeacherTest, findTeacherLesson, setTeacherContent } from "./teacherContent";
import { displayTopic } from "./subjectModules";
import { hasTopicIntro } from "./topicIntros";
import type { LessonContent } from "./types";
import { getWatchedVideos, markVideoWatched } from "./videoProgress";
import { scheduleProgressSave, syncProgress } from "./progressSync";

type Stage = "subject" | "topic" | "topic-intro" | "grade" | "lecture" | "test" | "summary";
type View = "app" | "profile" | "history" | "progress" | "videos" | "admin";

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
  const [watchedVideos, setWatchedVideos] = useState(() => getWatchedVideos());
  // Topic the video library opens on when reached from a "Videos" button.
  const [videosTopic, setVideosTopic] = useState<string | undefined>(undefined);
  const [videosGrade, setVideosGrade] = useState<number | undefined>(undefined);

  const lessonStartRef = useRef<number | null>(null);
  // Bumped when the teacher's content loads, so topic lists re-render.
  const [, setContentVersion] = useState(0);
  const [myAssignments, setMyAssignments] = useState<MyAssignment[]>([]);
  const assignmentRef = useRef<{ id: string; topic: string; grade: number } | null>(null);
  // Science / typed-in topics come from Gemini, which takes a while — so the
  // request starts while the student is still on the grade screen, and Start
  // usually finds it already done.
  const prefetchRef = useRef<{ key: string; promise: Promise<LessonContent> } | null>(null);

  function pastQuestions(topicArg: string, gradeArg: number) {
    return testHistory
      .filter((test) => test.topic === topicArg && test.grade === gradeArg)
      .flatMap((test) => test.mcqs);
  }

  function requestAiLesson(topicArg: string, gradeArg: number, numQuestionsArg: number, subjectArg: Subject = subject) {
    const key = `${subjectArg}|${topicArg}|${gradeArg}|${numQuestionsArg}`;
    if (prefetchRef.current?.key === key) return prefetchRef.current.promise;
    const avoid = pastQuestions(topicArg, gradeArg)
      .map((mcq) => mcq.question)
      .slice(-60);
    const promise = generateLesson(topicArg, gradeArg, numQuestionsArg, subjectArg, avoid);
    promise.catch(() => {
      if (prefetchRef.current?.promise === promise) prefetchRef.current = null;
    });
    prefetchRef.current = { key, promise };
    return promise;
  }

  useEffect(() => {
    if (!needsLogin) prefetchAllIntroSlides();
  }, [needsLogin]);

  // Bring in this student's saved progress from their account, so it's the
  // same on every device. Until it arrives, this device's copy is shown.
  useEffect(() => {
    if (needsLogin) return;
    let cancelled = false;
    syncProgress()
      .then((progress) => {
        if (cancelled) return;
        setTestHistory(progress.history);
        setWatchedVideos(progress.watched);
      })
      .catch(() => {
        // Offline or server asleep — keep using this device's copy; changes
        // stay marked unsynced and are uploaded on the next successful sync.
      });
    return () => {
      cancelled = true;
    };
  }, [needsLogin]);

  // The teacher's lessons and removed topics, and this student's assigned
  // tests. Re-run after an admin change or a finished test.
  function refreshTeacherData() {
    getTeacherContent()
      .then((content) => {
        setTeacherContent(content);
        setContentVersion((v) => v + 1);
      })
      .catch(() => {});
    getMyAssignments()
      .then((data) => setMyAssignments(data.assignments))
      .catch(() => {});
  }

  useEffect(() => {
    if (!needsLogin) refreshTeacherData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsLogin]);

  // An assigned test: start it straight away and remember which assignment
  // it is, so the score is sent to the teacher when it's finished.
  function handleStartAssignment(assignment: MyAssignment) {
    assignmentRef.current = { id: assignment.id, topic: assignment.topic, grade: assignment.grade };
    setSubject(assignment.subject);
    setTopic(assignment.topic);
    setGrade(assignment.grade);
    setNumQuestions(assignment.num_questions);
    setView("app");
    handleGenerate(assignment.topic, assignment.grade, assignment.num_questions, assignment.subject);
  }

  function handleVideoWatched(videoId: string) {
    setWatchedVideos(markVideoWatched(videoId));
    scheduleProgressSave();
  }

  useEffect(() => {
    const trimmed = topic.trim();
    if (stage !== "grade" || needsLogin || !trimmed || (subject === "Mathematics" && isLocalMathTopic(trimmed))) return;
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

  async function handleGenerate(topicArg: string, gradeArg: number, numQuestionsArg: number, subjectArg: Subject = subject) {
    setError("");

    if (!topicArg.trim()) {
      setError("Please enter a topic or question before submitting.");
      return;
    }

    setQuizResult(null);
    const trimmed = topicArg.trim();

    // A teacher's own lesson: a test from their questions, no waiting.
    const teacherLesson = findTeacherLesson(trimmed, undefined, subjectArg);
    if (teacherLesson) {
      startLesson(buildTeacherTest(teacherLesson, numQuestionsArg));
      return;
    }

    // Maths modules are built instantly in the browser — no waiting at all.
    if (subjectArg === "Mathematics" && isLocalMathTopic(trimmed)) {
      const avoid = pastQuestions(trimmed, gradeArg).map((mcq) => questionKey(mcq.topic, mcq.question));
      startLesson(buildLocalMathLesson(trimmed, gradeArg, numQuestionsArg, avoid));
      return;
    }

    setLoading(true);
    try {
      startLesson(await requestAiLesson(trimmed, gradeArg, numQuestionsArg, subjectArg));
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
    setStage(hasTopicIntro(moduleTopic) && !findTeacherLesson(moduleTopic, grade, subject) ? "topic-intro" : "grade");
  }

  function handleTopicNext() {
    if (!topic.trim()) {
      setError("Please choose a topic module or type your own topic before continuing.");
      return;
    }
    setError("");
    setStage(hasTopicIntro(topic) && !findTeacherLesson(topic.trim(), undefined, subject) ? "topic-intro" : "grade");
  }

  function handleGenerateClick() {
    assignmentRef.current = null;
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
          subject,
        }),
      );
      scheduleProgressSave();
      const assignment = assignmentRef.current;
      if (assignment && assignment.topic === lesson.topic && assignment.grade === lesson.grade) {
        submitAssignmentResult(assignment.id, result.score, result.total)
          .then(() => getMyAssignments())
          .then((data) => setMyAssignments(data.assignments))
          .catch(() => {});
      }
    }
    assignmentRef.current = null;
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

  // Summary of a past test, from My Tests. Errors are shown on that page.
  async function handleDownloadPastTest(test: CompletedTest, format: "pdf" | "docx") {
    const minutes = Math.max(1, Math.round(test.durationSeconds / 60));
    const takenOn = new Date(test.completedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    const details = `Taken on ${takenOn}${test.durationSeconds > 0 ? ` · Time spent: ${minutes} min` : ""}`;
    const result = { score: test.score, total: test.total, missed: test.missed };
    try {
      await (format === "pdf" ? downloadReportPdf : downloadReportDocx)(displayTopic(test.topic), test.grade, result, details);
    } catch (err) {
      if (err instanceof UnauthorizedError) handleSessionExpired("Your session expired. Please log in again.");
      throw err;
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
      return await fetchTopicIntroSlides(introTopic, grade);
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
      return await fetchYouTubeExplanation(topic, lesson.grade, subject);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        handleSessionExpired("Your session expired. Please log in again.");
      }
      throw err;
    }
  }

  function openVideos(videoTopic?: string, videoGrade?: number) {
    setVideosTopic(videoTopic);
    setVideosGrade(videoGrade);
    setView("videos");
  }

  function handlePractice(practiceTopic: string, practiceSubject: Subject) {
    setSubject(practiceSubject);
    setTopic(practiceTopic);
    // History is newest first — pick up at the grade they last tested at.
    const lastTest = testHistory.find((test) => test.topic === practiceTopic);
    if (lastTest) setGrade(lastTest.grade);
    setError("");
    setView("app");
    setStage("grade");
  }

  // Practice plan: re-learn a weak topic (its introduction, then the
  // "watch first" video on the next screen)…
  function handleWatchClass(item: TopicProgress) {
    setSubject(item.subject);
    setTopic(item.topic);
    setGrade(item.grade);
    setQuizResult(null);
    setError("");
    setView("app");
    setStage(hasTopicIntro(item.topic) ? "topic-intro" : "grade");
  }

  // …or take a fresh practice test on it (questions already seen are avoided).
  function handlePracticeTest(item: TopicProgress) {
    handlePractice(item.topic, item.subject);
    setGrade(item.grade);
    setNumQuestions(10);
  }

  function goHome() {
    setError("");
    setTopic("");
    setQuizResult(null);
    setView("app");
    setStage("subject");
  }

  function handleTryAgain() {
    setError("");
    setQuizResult(null);
    setView("app");
    setStage("grade");
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
          // Each student has their own saved progress — load theirs.
          setTestHistory(getTestHistory());
          setWatchedVideos(getWatchedVideos());
          // Teachers who chose Admin at login go straight to the Admin page.
          setView(getStoredRole() === "admin" ? "admin" : "app");
          setNeedsLogin(false);
        }}
      />
    );
  }

  // Teacher accounts only log in as Admin; they get the Admin portal instead
  // of the student pages (My Progress, My Tests). The server still checks
  // admin rights on every admin request.
  const adminMode = getStoredRole() === "admin";
  const pendingAssignments = myAssignments.filter((a) => !a.result).length;
  const navItems: Array<{ view: View; icon: string; label: string; short: string; badge?: number }> = adminMode
    ? [
        { view: "admin", icon: "🛠️", label: "Admin", short: "Admin" },
        { view: "app", icon: "🏠", label: "Learn", short: "Learn" },
        { view: "videos", icon: "🎬", label: "Concept Videos", short: "Videos" },
        { view: "profile", icon: "👤", label: "Profile", short: "Me" },
      ]
    : [
        { view: "app", icon: "🏠", label: "Learn", short: "Learn" },
        { view: "progress", icon: "📊", label: "My Progress", short: "Progress" },
        { view: "videos", icon: "🎬", label: "Concept Videos", short: "Videos" },
        { view: "history", icon: "📝", label: "My Tests", short: "Tests", badge: pendingAssignments },
        { view: "profile", icon: "👤", label: "Profile", short: "Me" },
      ];
  // The profile name, or a friendly first name from the login ("anusha.k@…" → "Anusha").
  const loginName = (username.includes("@") ? username.split("@")[0] : /^\+?\d+$/.test(username) ? "" : username).split(/[._\-+\d]/)[0];
  const weak = weakTopics(testHistory);
  const displayName =
    getProfileInfo().name.trim().split(/\s+/)[0] || (loginName ? loginName.charAt(0).toUpperCase() + loginName.slice(1) : "there");

  function handleNav(target: View) {
    if (target === "app") goHome();
    else if (target === "videos") openVideos();
    else setView(target);
  }

  const brand = (
    <button type="button" onClick={goHome} className="flex items-center gap-2.5 text-left">
      <LogoMark className="h-10 w-10 shrink-0 drop-shadow-md" />
      <span className="font-display text-lg font-semibold leading-tight text-slate-900">
        AI Assistant
        <span className="block text-xs font-sans font-bold uppercase tracking-wider text-indigo-500">for Kids</span>
      </span>
    </button>
  );

  // Inside the lessons the background matches the subject: a solar system
  // for Science, a maths chalkboard for Maths, a world map for Social Studies.
  const inLesson = view === "app" && stage !== "subject";

  return (
    <div className={`min-h-screen ${inLesson ? "theme-dark" : ""}`}>
      {!inLesson ? (
        <ReadingPoster variant="app" />
      ) : subject === "Science" ? (
        <SolarSystemBackdrop />
      ) : subject === "Social Studies" ? (
        <WorldBackdrop />
      ) : (
        <MathBackdrop />
      )}

      {/* Desktop: labelled sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-white/70 bg-white/90 px-4 py-6 backdrop-blur-xl lg:flex print:hidden">
        <div className="mb-8 px-2">{brand}</div>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
          {navItems.map((item) => {
            const active = view === item.view;
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => handleNav(item.view)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-bold ${
                  active ? "bg-indigo-600 text-white shadow-md shadow-indigo-300/50" : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg ${active ? "bg-white/20" : "bg-white shadow-sm"}`}
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                {item.label}
                {!!item.badge && (
                  <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white" aria-label={`${item.badge} to do`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 p-4">
          {adminMode ? (
            <>
              <p className="font-display text-base font-semibold text-amber-900">Hello, {displayName}! 🧑‍🏫</p>
              <p className="mt-1 text-xs font-semibold text-amber-800/80">Teacher / admin account</p>
            </>
          ) : (
            <>
              <p className="font-display text-base font-semibold text-amber-900">Keep it up, {displayName}! 🌟</p>
              <p className="mt-1 text-xs font-semibold text-amber-800/80">
                {testHistory.length ? `${testHistory.length} ${testHistory.length === 1 ? "test" : "tests"} done so far` : "Take your first test today"}
              </p>
            </>
          )}
        </div>
      </aside>

      {/* Phone and tablet: slim top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/70 bg-white/90 px-4 py-2.5 backdrop-blur-xl lg:hidden print:hidden">
        {brand}
        <button
          type="button"
          onClick={() => setView("profile")}
          aria-label="Profile"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-display text-base font-semibold uppercase text-indigo-700"
        >
          {displayName.charAt(0) || "👤"}
        </button>
      </header>

      <main className="pb-28 lg:pb-12 lg:pl-64 print:p-0">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-10 xl:ml-10 xl:mr-0 xl:max-w-3xl 2xl:mx-auto 2xl:max-w-4xl">

        {view === "admin" && adminMode ? (
          <AdminPage onBack={goHome} onContentChanged={refreshTeacherData} />
        ) : view === "profile" ? (
          <ProfilePage username={username} onBack={goHome} onLogout={handleLogout} isTeacher={adminMode} />
        ) : view === "history" ? (
          <TestHistoryPage
            history={testHistory}
            assignments={myAssignments}
            onStartAssignment={handleStartAssignment}
            onDownload={handleDownloadPastTest}
            onBack={goHome}
            onClear={() => {
              setTestHistory(clearTestHistory());
              scheduleProgressSave();
            }}
          />
        ) : view === "progress" ? (
          <ProgressPage
            history={testHistory}
            onWatchClass={handleWatchClass}
            onPracticeTest={handlePracticeTest}
            watched={watchedVideos}
            onBack={goHome}
            onPractice={handlePractice}
            onWatchVideos={openVideos}
          />
        ) : view === "videos" ? (
          <VideoLibraryPage
            key={`${videosTopic ?? "all"}|${videosGrade ?? ""}`}
            initialTopic={videosTopic}
            initialGrade={videosGrade}
            watched={watchedVideos}
            onWatched={handleVideoWatched}
            onBack={goHome}
          />
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
                <TopicSelect
                  onBack={() => setStage("subject")}
                  subject={subject}
                  grade={grade}
                  onGradeChange={setGrade}
                  topic={topic}
                  onTopicChange={setTopic}
                  onModuleSelect={handleModuleSelect}
                  onNext={handleTopicNext}
                />
              </>
            )}

            {stage === "topic-intro" && (
              <TopicIntroPlayer
                key={`${topic}|${grade}`}
                topic={topic}
                grade={grade}
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

            {stage === "grade" && findTeacherLesson(topic.trim(), undefined, subject)?.notes && (
              <section className="rounded-3xl bg-white p-5 shadow-lg ring-1 ring-slate-200/70 sm:p-6">
                <h3 className="mb-2 text-lg font-semibold">📖 Notes from your teacher</h3>
                <p className="whitespace-pre-line text-base leading-relaxed text-slate-700">{findTeacherLesson(topic.trim(), undefined, subject)?.notes}</p>
              </section>
            )}

            {stage === "grade" && topic.trim() && !topic.startsWith("Mixed Review") && !findTeacherLesson(topic.trim(), undefined, subject) && (
              <TopicVideos key={`${topic}|${grade}`} topic={topic.trim()} grade={grade} subject={subject} watched={watchedVideos} onWatched={handleVideoWatched} />
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
                onHome={goHome}
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
                onWatchVideos={lesson.topic.startsWith("Mixed Review") ? undefined : () => openVideos(lesson.topic, lesson.grade)}
                onViewProgress={() => setView("progress")}
                onHome={goHome}
                onTryAgain={handleTryAgain}
              />
            )}

            {lesson && stage === "summary" && quizResult && weak.some((t) => t.topic === lesson.topic) && (
              <PracticePlan
                topics={weak.filter((t) => t.topic === lesson.topic)}
                title="📚 Let's make this topic stronger"
                subtitle="Your average on this topic is below 80%. Watch the class again, then try a fresh practice test."
                onWatchClass={handleWatchClass}
                onPracticeTest={handlePracticeTest}
              />
            )}

            {lesson && stage === "summary" && quizResult && !hasConceptVideos(lesson.topic) && !lesson.topic.startsWith("Mixed Review") && (
              <TopicVideos key={`${lesson.topic}|${lesson.grade}`} topic={lesson.topic} grade={lesson.grade} subject={subject} watched={watchedVideos} onWatched={handleVideoWatched} />
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
      </main>

      {/* Phone and tablet: bottom tab bar */}
      <nav
        style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
        className="fixed inset-x-0 bottom-0 z-20 grid border-t border-slate-200/70 bg-white/90 px-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl lg:hidden print:hidden"
        aria-label="Main"
      >
        {navItems.map((item) => {
          const active = view === item.view;
          return (
            <button
              key={item.view}
              type="button"
              onClick={() => handleNav(item.view)}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              className={`flex flex-col items-center gap-0.5 rounded-xl py-1 text-[11px] font-bold ${active ? "text-indigo-700" : "text-slate-500"}`}
            >
              <span
                className={`relative flex h-8 w-12 items-center justify-center rounded-full text-lg leading-none ${active ? "bg-indigo-100" : ""}`}
                aria-hidden="true"
              >
                {item.icon}
                {!!item.badge && (
                  <span className="absolute -right-0.5 -top-1 rounded-full bg-rose-500 px-1.5 text-[10px] font-bold leading-4 text-white">{item.badge}</span>
                )}
              </span>
              {item.short}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
