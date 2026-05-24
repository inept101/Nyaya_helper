# NyayaHelper AI ⚖️

An AI-powered assistant for Indian civil court judges that automates the most time-consuming parts of judicial work — document analysis, legal research, case briefs, and judgment drafting.

> **Nyaya** (न्याय) — Sanskrit/Hindi for _Justice_

---

## Why This Exists

India's courts face a severe backlog crisis: **54 million pending cases**, only 15 judges per million citizens, and each judge managing 2,200+ cases simultaneously. The biggest bottlenecks are:

- Reading and analysing hundreds of pages of pleadings per case
- Manual legal research across Manupatra, SCC Online, Indian Kanoon
- Repetitive judgment drafting following strict Indian court formats
- Language barriers — many documents are in Hindi or regional languages

NyayaHelper AI is a proof-of-concept targeting district/civil court judges with AI tools that directly address these bottlenecks.

---

## Features

### 1. Document Summarization

Upload PDF or Word documents (petitions, affidavits, written statements) and get a structured summary covering parties, background facts, relief sought, respondent's position, key evidence, and applicable laws. Handles 200+ page documents via map-reduce summarization.

### 2. Legal Issue Extraction

Automatically identifies every distinct legal issue in dispute — with the applicable statute/section (CPC, Evidence Act, etc.) and each party's position on that issue. Frames issues the way Indian courts do.

### 3. Case Brief Generation

Generates a complete Indian-format case brief ready for hearing preparation: parties, jurisdiction, chronological facts, issues, arguments from both sides, cited precedents (SCC/AIR format), applicable statutes, and reliefs claimed.

### 4. Legal Research Assistant (RAG)

A chat-style Q&A interface that retrieves relevant excerpts from uploaded case documents (via Pinecone vector search) and answers questions with citations to Indian law. Suggested starter questions included.

### 5. Judgment Draft Scaffolding

Generates a structured judgment template following standard Indian civil court format. Factual sections are pre-filled from case documents; reasoning and findings sections are marked `[JUDGE TO COMPLETE: ...]` for the judge to complete. The draft is fully editable in-browser.

### 6. Hindi / Regional Language Support

Documents uploaded in Hindi, Marathi, Tamil, Telugu, Kannada, Malayalam, Gujarati, Punjabi, Bengali, or Urdu are automatically detected and translated to English before indexing. All AI features then work on the translated content. The original is preserved.

### 7. OpenAI-Compatible — Use Any Model

The backend uses **LiteLLM**-backed `ChatOpenAI`. Change `MODEL_NAME` in `.env` to switch between GPT-4o, Claude 3.5 Sonnet, Mistral, a local Llama via Ollama, or any other OpenAI-compatible endpoint — no code changes needed.

---

## Architecture

```
NyayahelperAI/
├── backend/          Python FastAPI — AI services, auth, case/document CRUD
└── frontend/         Next.js 16 — judge-facing UI
```

```
Browser → Next.js 16 → FastAPI → LangChain → LiteLLM → Any LLM
                              ↓               ↓
                         Supabase         Pinecone
                        (PostgreSQL)    (Vector DB)
```

### Tech Stack

| Layer              | Technology                                                     |
| ------------------ | -------------------------------------------------------------- |
| Frontend           | Next.js 16 (Turbopack, React 19) + Tailwind CSS + shadcn/ui v4 |
| Backend            | Python FastAPI (async)                                         |
| AI Orchestration   | LangChain + LCEL chains                                        |
| LLM Routing        | LiteLLM — OpenAI-compatible, swap any model                    |
| Document Parsing   | PyMuPDF4LLM (PDF + OCR) + python-docx                          |
| Vector Database    | Pinecone serverless (free tier, namespace per case)            |
| Database           | Supabase PostgreSQL via SQLAlchemy                             |
| Auth               | Custom JWT (bcrypt + python-jose)                              |
| Language Detection | langdetect + LLM translation                                   |

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20.9+
- A Supabase project (free tier works)
- A Pinecone account (free tier: 1 serverless index, ~100K vectors)
- An OpenAI-compatible API key (OpenAI, Anthropic, Mistral, or local Ollama)

### 1. Clone and configure backend

```bash
cd backend
cp .env.example .env
# Edit .env — fill in all required values (see backend/README.md)
```

### 2. Run backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# API running at http://localhost:8000
# Interactive docs at http://localhost:8000/docs
```

### 3. Configure and run frontend

```bash
cd frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm install
npm run dev
# App running at http://localhost:3000
```

### 4. Use the app

1. Go to `http://localhost:3000` → redirects to `/login`
2. Register a new judge account
3. Create a case with case number, type, court, parties
4. Upload case documents (PDF/DOCX/TXT — Hindi docs auto-translated)
5. Use the **AI Insights**, **Research**, and **Draft Judgment** tabs

---

## Repository Structure

```
NyayahelperAI/
├── README.md                    ← you are here
├── backend/
│   ├── README.md                ← backend-specific docs
│   ├── .env.example
│   ├── requirements.txt
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── routers/
│   │   ├── auth.py              POST /auth/login, /register, /me
│   │   ├── cases.py             CRUD  /cases
│   │   ├── documents.py         POST  /cases/{id}/documents
│   │   └── ai.py               POST  /ai/summarize, /extract-issues, etc.
│   └── services/
│       ├── document_processor.py
│       ├── language_service.py
│       ├── vector_store.py
│       └── ai_service.py
└── frontend/
    ├── README.md                ← frontend-specific docs
    ├── .env.local.example
    ├── app/
    │   ├── (auth)/login/        Login + Register page
    │   ├── (dashboard)/
    │   │   ├── dashboard/       Stats overview
    │   │   ├── cases/           Cases list + new case form
    │   │   └── cases/[id]/      Case detail (Overview, Insights, Research, Draft)
    │   └── page.tsx             Redirects → /dashboard
    ├── components/
    │   ├── ai-panel.tsx         Streaming AI output component
    │   ├── document-upload.tsx  Drag-drop upload with language badges
    │   └── ui/                  shadcn/ui v4 primitives
    └── lib/
        ├── api.ts               Typed API client + SSE streaming
        └── auth.ts              JWT token helpers
```

---

## Indian Legal Context

The AI prompts are tuned for Indian civil courts:

- **Laws cited**: CPC 1908, Indian Evidence Act 1872, IPC 1860, and case-specific acts
- **Citation format**: SCC (`(2023) 4 SCC 225`) and AIR (`AIR 1994 SC 1918`) formats
- **Judgment structure**: Introduction → Facts → Issues → Findings → Order/Decree
- **Terminology**: Petitioner/Respondent, Plaintiff/Defendant, Relief, Decree, Injunction

---

## Roadmap (Post-POC)

- [ ] Live legal database integration (Indian Kanoon API, Manupatra)
- [ ] Witness deposition transcription (speech-to-text via Whisper)
- [ ] Case scheduling and next-date suggestions
- [ ] Multi-judge / court administrator roles
- [ ] Export judgments to PDF with court letterhead
- [ ] Integration with eCourts / NIC systems
- [ ] Support for criminal cases (CrPC, IPC)
      claude --resume 71509ef5-91cc-4034-818f-100bf1324f19
