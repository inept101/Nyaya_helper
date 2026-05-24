# NyayaHelper AI — Backend

Python FastAPI backend providing all AI features, authentication, case management, and document processing for NyayaHelper AI.

---

## Tech Stack

| Component | Library |
|-----------|---------|
| Framework | FastAPI 0.115 |
| ORM | SQLAlchemy 2 + psycopg2 |
| Database | Supabase PostgreSQL |
| Auth | python-jose (JWT) + passlib (bcrypt) |
| AI Orchestration | LangChain 0.3 + LCEL |
| LLM Routing | LiteLLM (OpenAI-compatible) |
| Vector DB | Pinecone SDK v6 (serverless) |
| Document Parsing | PyMuPDF4LLM, python-docx |
| Language Detection | langdetect |
| Validation | Pydantic v2 |

---

## Project Structure

```
backend/
├── main.py                  App entry point — routers, CORS, startup
├── config.py                Pydantic Settings (reads from .env)
├── database.py              SQLAlchemy engine, session factory, init_db()
├── models.py                ORM models: User, Case, Document
├── schemas.py               Pydantic request/response schemas
├── .env.example             Template for required environment variables
├── requirements.txt
│
├── routers/
│   ├── auth.py              POST /auth/register, /auth/login, GET /auth/me
│   ├── cases.py             GET/POST /cases, GET/PUT/DELETE /cases/{id}
│   ├── documents.py         POST /cases/{id}/documents, GET /cases/{id}/documents
│   └── ai.py                POST /ai/* — all AI endpoints (SSE streaming)
│
└── services/
    ├── document_processor.py  PDF/DOCX/TXT → plain text
    ├── language_service.py    langdetect + LLM translation
    ├── vector_store.py        Pinecone: upsert, search, delete per case
    └── ai_service.py          LangChain chains for all 5 AI features
```

---

## Setup

### 1. Environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in all values:

```env
# LLM — any OpenAI-compatible endpoint
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_API_KEY=sk-...
MODEL_NAME=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small

# Pinecone (free tier — 1 serverless index)
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX_NAME=nyayahelper

# Supabase PostgreSQL
# Use Transaction Mode pooler URL (port 6543, NOT 5432)
DATABASE_URL=postgresql://postgres:[password]@[host]:6543/postgres

# Auth
JWT_SECRET=replace-with-a-long-random-string
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# File uploads
UPLOAD_DIR=./uploads
```

### 2. Supabase setup

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **Settings → Database → Connection string**
3. Select **Transaction pooler** mode and copy the URI (port 6543)
4. Paste it as `DATABASE_URL` in `.env`

> **Note:** The free tier auto-pauses after 7 days of inactivity. Restore it from the Supabase dashboard if the API returns connection errors.

### 3. Pinecone setup

1. Create a free account at [pinecone.io](https://www.pinecone.io)
2. Copy your **API key** from the console
3. The index is created automatically on first startup (`dimension=1536`, `metric=cosine`, serverless on AWS us-east-1)

> **Note:** Free tier supports 1 serverless index and ~100K vectors at 1536 dimensions — sufficient for a POC with dozens of cases.

### 4. Install and run

```bash
# Create virtual environment (recommended)
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt

uvicorn main:app --reload
```

The API starts at `http://localhost:8000`.

---

## Running

### Development (with auto-reload)

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Production

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Interactive API docs

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Health check: `http://localhost:8000/health`

---

## API Reference

### Auth

| Method | Path | Body | Response |
|--------|------|------|----------|
| `POST` | `/auth/register` | `{ username, password }` | `{ id, username, created_at }` |
| `POST` | `/auth/login` | `{ username, password }` | `{ access_token, token_type }` |
| `GET` | `/auth/me` | — (Bearer token) | `{ id, username, created_at }` |

All subsequent endpoints require `Authorization: Bearer <token>`.

### Cases

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cases` | List all cases for the current user |
| `POST` | `/cases` | Create a new case |
| `GET` | `/cases/{id}` | Get case with documents list |
| `PUT` | `/cases/{id}` | Update case fields |
| `DELETE` | `/cases/{id}` | Delete case (cascades to documents) |

**Case create/update body:**
```json
{
  "title": "Sharma vs State of Maharashtra",
  "case_number": "CS/123/2024",
  "court": "District Court",
  "case_type": "Civil Suit",
  "petitioner": "Ramesh Sharma",
  "respondent": "State of Maharashtra",
  "notes": "Complex property dispute, multiple documents"
}
```

### Documents

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/cases/{id}/documents` | Upload a document (multipart/form-data, field: `file`) |
| `GET` | `/cases/{id}/documents` | List all documents for a case |

**Supported formats:** PDF, DOCX, DOC, TXT

**On upload:**
1. File saved to `UPLOAD_DIR/case_{id}/`
2. Text extracted via PyMuPDF4LLM or python-docx
3. Language detected via langdetect
4. If non-English Indian language → auto-translated via LLM
5. Text chunked and embedded → upserted to Pinecone (namespace: `case_{case_id}`)

### AI Endpoints (all return SSE streams)

All AI endpoints respond with `text/event-stream`. Each event is:
```
data: <text chunk>\n\n
```
The stream ends with:
```
data: [DONE]\n\n
```

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `POST` | `/ai/summarize` | `{ case_id, doc_ids? }` | Map-reduce summarization of documents |
| `POST` | `/ai/extract-issues` | `{ case_id }` | List legal issues with applicable law |
| `POST` | `/ai/generate-brief` | `{ case_id }` | Full Indian-format case brief |
| `POST` | `/ai/research` | `{ case_id, question }` | RAG Q&A over case documents |
| `POST` | `/ai/draft-judgment` | `{ case_id }` | Judgment skeleton with placeholders |
| `POST` | `/ai/translate` | `{ doc_id }` | Translate a document on demand |

---

## Database Schema

```sql
-- Users
CREATE TABLE users (
    id VARCHAR PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cases
CREATE TABLE cases (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    case_number VARCHAR(100) NOT NULL,
    court VARCHAR(200) NOT NULL,
    case_type VARCHAR(100) NOT NULL,
    petitioner VARCHAR(300) NOT NULL,
    respondent VARCHAR(300) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
    id VARCHAR PRIMARY KEY,
    case_id VARCHAR REFERENCES cases(id) ON DELETE CASCADE,
    filename VARCHAR(300) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    language_detected VARCHAR(10),
    is_translated BOOLEAN DEFAULT FALSE,
    translated_content TEXT,
    raw_content TEXT,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Tables are created automatically on startup via `Base.metadata.create_all()`.

---

## AI Architecture

### LLM Configuration

All AI features use a LiteLLM-backed `ChatOpenAI` instance:

```python
ChatOpenAI(
    base_url=settings.openai_api_base,  # any OpenAI-compatible URL
    api_key=settings.openai_api_key,
    model=settings.model_name,
    streaming=True,
)
```

To switch models, change `MODEL_NAME` in `.env`. Compatible with:
- OpenAI: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`
- Anthropic (via proxy): `claude-3-5-sonnet-20241022`
- Mistral: `mistral-large-latest`
- Local (Ollama): `llama3.2`, `mistral` — set `OPENAI_API_BASE=http://localhost:11434/v1`

### Vector Store

Pinecone is used with one namespace per case:
- **Namespace**: `case_{case_id}`
- **Dimension**: 1536 (matches `text-embedding-3-small`)
- **Metric**: cosine similarity
- **Chunk size**: 500 words with 50-word overlap
- **Batch size**: 50 vectors per upsert

### Summarization Strategy

Long documents (200+ page pleadings) use a **map-reduce** approach:
1. Document split into 3000-word chunks
2. Each chunk summarised independently (map)
3. Chunk summaries combined and reduced to final output (reduce)

This avoids context window overflow while preserving all key facts.

---

## Switching to a Different LLM

No code changes required — only `.env` changes:

**OpenAI GPT-4o:**
```env
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_API_KEY=sk-...
MODEL_NAME=gpt-4o
EMBEDDING_MODEL=text-embedding-3-small
```

**Local Ollama (free, no API key):**
```env
OPENAI_API_BASE=http://localhost:11434/v1
OPENAI_API_KEY=ollama
MODEL_NAME=llama3.2
EMBEDDING_MODEL=nomic-embed-text
```

**Groq (fast inference):**
```env
OPENAI_API_BASE=https://api.groq.com/openai/v1
OPENAI_API_KEY=gsk_...
MODEL_NAME=llama-3.3-70b-versatile
EMBEDDING_MODEL=text-embedding-3-small  # still use OpenAI for embeddings
```

---

## Testing

Currently no automated test suite (POC stage). Manual testing via:

```bash
# 1. Health check
curl http://localhost:8000/health

# 2. Register
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "judge1", "password": "test1234"}'

# 3. Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "judge1", "password": "test1234"}'
# → copy the access_token

# 4. Create case
curl -X POST http://localhost:8000/cases \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Case", "case_number": "CS/1/2024",
    "court": "District Court", "case_type": "Civil Suit",
    "petitioner": "Ramesh", "respondent": "Suresh"
  }'

# 5. Upload document
curl -X POST http://localhost:8000/cases/<case_id>/documents \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/petition.pdf"

# 6. Stream AI summary
curl -X POST http://localhost:8000/ai/summarize \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"case_id": "<case_id>"}' \
  --no-buffer
```

Or use the interactive Swagger UI at `http://localhost:8000/docs` — it supports file uploads and JWT auth via the **Authorize** button.

---

## Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| `connection refused` on startup | Supabase free tier auto-paused | Resume project at supabase.com |
| `PineconeApiException: NOT_FOUND` | Index not created yet | It auto-creates on first upload; wait 30s |
| `langdetect: No features in text` | Document too short to detect language | Treated as English, no translation |
| `tiktoken` errors | Missing tokenizer for model | `pip install tiktoken` |
| PDF extracts empty text | Scanned PDF (image-only) | PyMuPDF4LLM falls back to OCR; ensure `pymupdf4llm>=0.0.17` |
