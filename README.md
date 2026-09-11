# Mathematics Assistant for Students

An AI-powered web app for primary school students (grades 1-5), aligned with the **CBSE
(NCERT)** and **Andhra Pradesh State Board (SCERT AP)** syllabus. Pick the Mathematics module,
choose a topic, choose a grade, and work through a 4-slide lecture, then a 1-50 question
practice test with tricks and simple visuals in every explanation, then a score summary — all
downloadable as Word or PDF.

## Features

- **Step-by-step flow:** Subject (Mathematics) → Topic → Grade → Generate. The topic step
  offers one-click modules (Addition, Subtraction, Multiplication, Division, Tables, Areas, or
  an "All Topics" mixed review covering all six) plus a free-text box for any other topic or
  question; the grade step then picks a grade (1-5) and how many questions to generate (1-50).
- Google Gemini writes a grade-appropriate 4-slide lecture (What is it? / Simple Trick /
  Example / Quick Recap) plus the full MCQ set in one request, following CBSE/NCERT and AP
  State Board topic coverage for that class — Indian place value (lakhs/crores), ₹ rupees and
  paise for money, metric units, and Indian names/contexts in word problems (see `backend/prompt.py`
  for the exact per-grade topic list). A mixed-topic request (e.g. the "All Topics" module)
  spreads the MCQs evenly across every named sub-topic instead of just one.
- **Lecture:** a slideshow that teaches the concept before testing it, with simple SVG
  visuals (grouped dots, a number line, or a fraction pie) generated from the lesson content.
- **Test:** steps through each question one at a time with the topic name, question number,
  4 options, correct/incorrect highlighting, and — after you answer — the explanation, a
  one-line trick, a matching visual, and a **🎬 Watch Explanation Video** button that generates
  a short narrated `.mp4` for that one question on demand (~10-20 seconds).
- **Test summary:** score, percentage, an encouraging message, a review list of every missed
  question with your answer vs. the correct one, and a **downloadable test report** (Word or
  PDF) covering just the score and missed questions.
- **📝 My Tests:** every completed test is saved locally (`localStorage`, last 50) and listed
  under the "My Tests" button (top-right) with its topic, grade, date, and score. Expanding one
  shows every question again — correct answer highlighted, your answer on the ones you missed,
  the explanation and trick — for revision without needing to retake the test.
- **Watch Video Lecture:** turns the 4 lecture slides into a real narrated `.mp4` — Google
  Text-to-Speech reads each slide's content over its rendered visual, plays inline in the app.
- **Login:** the whole app sits behind a login screen (see Login below), with **Create an
  account** (username + email + password), **Forgot password?**, and (once configured) a
  **Continue with Google** button right on it. Every password field has a show/hide (👁)
  toggle. The profile panel (top-right button) shows the signed-in user, total learning time,
  and lessons completed, tracked locally in the browser (`localStorage`), plus a log-out option.
- **Editable profile details:** Name, Email, Phone number, Location, Parent's phone number, and
  Parent's email address, editable right on the profile page (Edit → Save/Cancel) and stored
  locally (`localStorage`) — display info shown throughout the profile page, separate from your
  actual login credentials.
- Download the full lesson (lecture + all questions) as a formatted Word (`.docx`) or PDF,
  structured as: topic name, question number, question, options A-D, answer, trick, visual,
  explanation, then the next question — available during the lecture and test screens,
  independent of the test-report download on the summary screen.
- AI-themed, kid-friendly animated background (floating stars/shapes + math symbols over a
  pastel gradient), fully self-contained — no external images or network calls beyond the
  Gemini API.
- Per-IP rate limiting on the heavier endpoints (`/generate`, `/lecture-video`).

## Login

There are two ways to get into the app:

1. **The built-in admin login**, set in `backend/.env`:

   ```
   ADMIN_USERNAME=your-username
   ADMIN_PASSWORD=YourStrongPassword#123
   ```

   Change these to whatever you like — they're plain values in a git-ignored `.env` file, not
   hashed, since it's meant as a single always-available account rather than a real user.

2. **Self-service accounts** via the **Create an account** link on the login screen (username,
   email, password). These are stored in `backend/data/users.json` — created automatically on
   first signup, git-ignored — with passwords hashed (PBKDF2-SHA256, salted, no plaintext ever
   stored). You can log in with either the username or the email address you signed up with.

**Forgot password** (the link on the login screen) resets a self-service account's password by
matching its username + email, then letting you set a new password immediately. There is no
email server configured, so **no email is actually sent** — this is a simplified, self-contained
reset flow appropriate for a personal/local app, not the "email a reset link" flow a public
product would need. It only works for self-service accounts; the built-in admin login can only
be changed by editing `backend/.env` directly.

3. **Sign in with Google** — optional, only shown once configured. Create an OAuth 2.0 Client
   ID at [console.cloud.google.com](https://console.cloud.google.com/) (APIs & Services →
   Credentials → Create Credentials → OAuth client ID → Web application), with your frontend's
   URL (e.g. `http://localhost:5183`) as an authorized JavaScript origin — no client secret is
   needed. Set it in `backend/.env`:

   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```

   Leave it blank to hide the button entirely (no broken/fake button — the frontend checks
   `GET /auth/google/config` and only renders it once a Client ID is actually set). Behind the
   scenes, `POST /auth/google` verifies the Google ID token server-side, then finds or creates
   a matching self-service account by email (in `backend/data/users.json`, same as a normal
   signup) and issues it a freshly generated random password — used only internally so the
   existing username/password auth on every other request keeps working unchanged.

## Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS (Vite)
- **Backend:** Python FastAPI
- **AI:** Google Gemini (`gemini-3.1-flash-lite`) via `google-genai`, one JSON-formatted call per
  generation request
- **Word export:** `python-docx`
- **PDF export:** `reportlab`
- **Lecture video:** `gTTS` (narration) + `Pillow` (slide images) + `moviepy`/`imageio-ffmpeg`
  (assembly into an `.mp4`, using a bundled ffmpeg binary — no system install needed)

## Folder Structure

```
math-assistant-app/
│
├── backend/
│   ├── main.py            # FastAPI app: /login, /signup, /forgot-password, /generate, ...
│   ├── gemini_service.py   # Calls Gemini for the concept + MCQ set, with retry/validation
│   ├── prompt.py           # Grade-aware system prompt + response validation
│   ├── models.py           # Pydantic request/response models
│   ├── docx_export.py      # Builds the Word report
│   ├── pdf_export.py       # Builds the PDF report
│   ├── visual_text.py      # Renders a VisualAid as plain text for Word/PDF
│   ├── tts_video.py        # Renders lecture slides to images, narrates + assembles the .mp4
│   ├── security.py         # Login check (admin + registered users) + per-IP rate limiting
│   ├── user_store.py       # JSON-file user accounts: signup, lookup, password reset
│   ├── password_hashing.py # Salted PBKDF2-SHA256 password hashing (stdlib only)
│   ├── data/               # users.json lives here (created on first signup, git-ignored)
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/     # SearchBar, LecturePlayer, QuizPlayer, TestSummary, ProfilePage,
│   │   │                   # VisualAid, LoginGate, DownloadButtons, AiBackdrop, ...
│   │   ├── App.tsx
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── types.ts
│   │   ├── profileStorage.ts  # Guest profile stats (localStorage): time spent, lessons done
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   └── .env.example
│
└── README.md
```

## Prerequisites

- Python 3.10+
- Node.js 18+ and npm
- A Google Gemini API key ([aistudio.google.com/apikey](https://aistudio.google.com/apikey))

## Installation & Setup

### 1. Backend (FastAPI)

```bash
cd math-assistant-app/backend

python -m venv .venv
.venv\Scripts\activate      # Windows
# source .venv/bin/activate  # macOS/Linux

pip install -r requirements.txt

copy .env.example .env      # Windows
# cp .env.example .env       # macOS/Linux
```

Set `GEMINI_API_KEY` in `.env`, then run:

```bash
uvicorn main:app --reload --port 8000
```

API docs: `http://localhost:8000/docs`.

### 2. Frontend (React + Vite)

```bash
cd math-assistant-app/frontend

npm install

copy .env.example .env      # Windows
# cp .env.example .env       # macOS/Linux

npm run dev
```

Open the printed URL (typically `http://localhost:5173`).

## Usage

1. Log in with the credentials from `backend/.env` (`ADMIN_USERNAME` / `ADMIN_PASSWORD`), or
   click **Create an account** to sign up your own username/email/password. Forgot a
   self-service password? Use **Forgot password?** on the login screen.
2. Click the **Mathematics** subject card.
3. Pick a topic module (Addition, Subtraction, Multiplication, Division, Tables, Areas, or
   All Topics), or type your own topic/question, then click **Next**.
4. Pick a grade (1-5) and how many questions you want (1-50, default 20), then click
   **Generate**.
5. A 4-slide lecture appears first. Optionally click **🎬 Watch Video Lecture** for a narrated
   video version (takes up to a minute to generate), or step through the slides with **Next**,
   then click **Start Test**.
6. Work through the test question by question — pick an option to see if you're right, then
   read the explanation, trick, and visual, then click **Next** (or **Finish Test** on the last
   question). Optionally click **🎬 Watch Explanation Video** for a short narrated video of
   that one question.
7. Review your **score and missed questions** on the summary screen, and click **Download
   Report (Word)** or **Download Report (PDF)** to save just the score/review as a file.
8. Click **Download as Word** or **Download as PDF** during the lecture or test screens to
   save the full lesson (lecture + all questions with tricks and explanations) — separate
   from the test report above.
9. Click **📝 My Tests** (top-right) any time to revisit every completed test — expand one to
   review all its questions, correct answers, and explanations.
10. Click **👤 Profile** (top-right) to see your total learning time and lessons completed, log
    out, or click **Edit** under "Profile details" to set your Name, Email, Phone, and Location.

## API Reference

### `POST /login`

Request: `{ "username": "...", "password": "..." }` (`username` accepts a username or an email
address). Returns `{ "success": true }` on match, or 401. Every other route below additionally
requires the same credentials on every request via `X-App-Username` / `X-App-Password` headers
(that's what the frontend does after a successful login).

### `GET /auth/google/config`

Returns `{ "configured": bool, "client_id": "..." }` — the frontend calls this to decide
whether to render the "Continue with Google" button at all.

### `POST /auth/google`

Request: `{ "id_token": "..." }` — the ID token returned by Google's Sign In client-side flow.
Verifies it against `GOOGLE_CLIENT_ID`, then returns `{ "username": "...", "password": "..." }`:
a real (freshly generated) credential pair for a self-service account matched or created by the
Google account's email, which the frontend stores exactly like a normal login. 400 if
`GOOGLE_CLIENT_ID` isn't set; 401 if the token is invalid or the email isn't verified.

### `POST /signup`

Request: `{ "username": "...", "email": "...", "password": "..." }`. Creates a self-service
account (username ≥ 3 chars, valid email, password ≥ 6 chars). 400 if the username or email is
already taken.

### `POST /forgot-password`

Request: `{ "username": "...", "email": "...", "new_password": "..." }`. If the username and
email match an existing self-service account, updates its password immediately (no email is
sent — see Login above) and returns `{ "success": true }`; otherwise 400.

### `POST /generate`

Request:

```json
{ "topic": "Fractions", "grade": 3, "num_questions": 20 }
```

Response:

```json
{
  "lesson": {
    "topic": "Fractions",
    "grade": 3,
    "concept_explanation": "...",
    "lecture_slides": [
      {
        "title": "What is it?",
        "content": "...",
        "visual": { "type": "none", "param1": 0, "param2": 0, "param3": 0, "label": "" }
      }
    ],
    "mcqs": [
      {
        "topic": "Fractions",
        "question_number": 1,
        "question": "...",
        "option_a": "...",
        "option_b": "...",
        "option_c": "...",
        "option_d": "...",
        "correct_answer": "B",
        "explanation": "...",
        "trick": "...",
        "visual": { "type": "pie", "param1": 4, "param2": 1, "param3": 0, "label": "1 of 4 parts" }
      }
    ]
  }
}
```

`visual.type` is one of `"groups"` (multiplication/division/counting), `"number_line"`
(addition/subtraction), `"pie"` (fractions), or `"none"`. The frontend renders it as an SVG
diagram; the Word/PDF exporters render a plain-text picture instead (see
`backend/visual_text.py`).

### `POST /download/docx` and `POST /download/pdf`

Request: `{ "lesson": { ...same shape as above... } }`

Returns the corresponding file as a download.

### `POST /download/report/docx` and `POST /download/report/pdf`

Request:

```json
{
  "topic": "Addition",
  "grade": 2,
  "result": {
    "score": 2,
    "total": 3,
    "missed": [
      { "question_number": 2, "topic": "Addition", "question": "...", "your_answer": "A", "correct_answer": "B" }
    ]
  }
}
```

Returns a short test-report file (score, percentage, encouragement message, missed-question
review) as `.docx` or `.pdf` — distinct from `/download/docx`/`/download/pdf`, which export the
full lesson content regardless of how the test went.

### `POST /lecture-video`

Request: `{ "lesson": { ...same shape as above... } }`. Returns an `.mp4` (narrated slideshow of
the lecture). Takes roughly 10-60 seconds depending on lecture length and machine speed — the
first call on a fresh machine may be slower while `imageio-ffmpeg` downloads its bundled ffmpeg
binary.

### `POST /question-video`

Request: `{ "mcq": { ...one MCQItem, same shape as in a lesson's "mcqs" array... }, "grade": 2 }`.
Returns an `.mp4` narrating that single question's answer, explanation, and trick over an image
of the question with the correct option highlighted — much faster than `/lecture-video` (roughly
10-20 seconds) since it's one short clip instead of four. Generated on demand per question
rather than upfront for the whole lesson, since generating one for every question (up to 50 per
lesson) eagerly would take many minutes.

## Security

The whole app requires the single login in `backend/.env` (`ADMIN_USERNAME`/`ADMIN_PASSWORD`,
checked via `X-App-Username`/`X-App-Password` headers on every request — see `backend/security.py`)
plus a per-IP rate limit on `/generate` and `/lecture-video`. Secrets live only in git-ignored
`.env` files.

## Troubleshooting

- **"GEMINI_API_KEY is not set" (400):** add it to `backend/.env` and restart the backend.
- **502 "unreadable response after retrying":** Gemini returned malformed JSON or the wrong
  question count across all retries — try again, or lower `num_questions`.
- **CORS errors:** make sure `CORS_ORIGINS` in `backend/.env` matches the frontend's origin.
- **429 "Too many requests":** the per-IP rate limit was hit — wait a minute and retry.
- **401 on every request after it used to work:** `ADMIN_USERNAME`/`ADMIN_PASSWORD` changed or
  are unset in `backend/.env` — set them and log in again (the frontend clears its stored
  credentials and shows the login screen automatically on a 401).
- **Video generation is slow or times out:** it runs TTS (needs internet) plus video encoding
  server-side; a 4-slide lecture typically takes 10-60 seconds. If it consistently fails, check
  the backend logs for an ffmpeg/network error.
