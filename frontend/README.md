# NyayaHelper AI — Frontend

Next.js 16 judge-facing UI for NyayaHelper AI. Provides case management, document upload, and five AI-powered features with real-time streaming output.

---

## Tech Stack

| Component | Library |
|-----------|---------|
| Framework | Next.js 16.2 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui v4 (base-ui primitives) |
| Icons | Lucide React |
| Notifications | Sonner |
| Auth | JWT stored in `localStorage`, checked on layout mount |
| API Client | Native `fetch` + async SSE streaming |

---

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx                     Root layout (fonts, Toaster)
│   ├── page.tsx                       Redirects → /dashboard
│   ├── (auth)/
│   │   └── login/page.tsx             Login + Register form
│   └── (dashboard)/
│       ├── layout.tsx                 Auth guard + sidebar nav
│       ├── page.tsx                   Redirects → /dashboard
│       ├── dashboard/page.tsx         Stats cards + recent cases
│       ├── cases/
│       │   ├── page.tsx               Searchable cases table
│       │   └── new/page.tsx           New case form
│       └── cases/[id]/
│           ├── layout.tsx             Case tabs (Overview|Insights|Research|Draft)
│           ├── page.tsx               Case details + document upload
│           ├── insights/page.tsx      Summarize, Extract Issues, Generate Brief
│           ├── research/page.tsx      Chat-style legal research Q&A
│           └── draft/page.tsx         Editable judgment draft
│
├── components/
│   ├── ai-panel.tsx                   Streaming AI output card (reusable)
│   ├── document-upload.tsx            Drag-drop upload + document card
│   └── ui/                            shadcn/ui v4 components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── textarea.tsx
│       ├── badge.tsx
│       ├── tabs.tsx
│       ├── table.tsx
│       ├── skeleton.tsx
│       ├── select.tsx
│       ├── dialog.tsx
│       └── sonner.tsx
│
└── lib/
    ├── api.ts                          Typed API client + SSE stream reader
    ├── auth.ts                         JWT helpers (get/set/clear token)
    └── utils.ts                        cn() utility (clsx + tailwind-merge)
```

---

## Setup

### 1. Environment

```bash
cp .env.local.example .env.local
```

`.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> For production, set this to your deployed backend URL.

### 2. Install dependencies

```bash
npm install
```

### 3. Ensure backend is running

The frontend requires the FastAPI backend at the URL configured in `NEXT_PUBLIC_API_URL`. See `../backend/README.md`.

---

## Running

### Development

```bash
npm run dev
```

Opens at `http://localhost:3000`. Uses Turbopack by default (Next.js 16) — fast HMR.

### Production build

```bash
npm run build
npm run start
```

### Type checking

```bash
npx tsc --noEmit
```

### Lint

```bash
npm run lint
```

---

## Routes

| Route | Description |
|-------|-------------|
| `/` | Redirects to `/dashboard` |
| `/login` | Login + Register |
| `/dashboard` | Stats overview + recent cases |
| `/cases` | All cases table with search |
| `/cases/new` | New case form |
| `/cases/[id]` | Case overview + document upload |
| `/cases/[id]/insights` | AI Summarize / Issues / Brief |
| `/cases/[id]/research` | Legal research chat |
| `/cases/[id]/draft` | Judgment draft generation |

---

## Key Components

### `AIPanel` (`components/ai-panel.tsx`)

Reusable component that calls an AI endpoint and streams the response.

```tsx
<AIPanel
  title="Document Summary"
  description="Structured summary of uploaded documents"
  buttonLabel="Summarize Documents"
  endpoint="summarize"           // POST /ai/summarize
  body={{ case_id: id }}
  placeholder="Click to generate..."
/>
```

Features:
- Streams token-by-token via SSE
- Copy-to-clipboard button
- Skeleton loading state
- Error toast on failure

### `DocumentUpload` (`components/document-upload.tsx`)

Drag-and-drop file upload with language detection badges.

```tsx
<DocumentUpload
  caseId={id}
  onUploaded={(doc) => setDocuments(prev => [...prev, doc])}
/>
```

- Accepts PDF, DOCX, DOC, TXT
- Shows upload progress
- Displays language badge (HI, MR, TA, etc.) for non-English docs
- Shows "→ EN" badge when auto-translated

### `streamAI` (`lib/api.ts`)

Async generator for consuming SSE streams:

```typescript
for await (const chunk of streamAI("summarize", { case_id: id })) {
  setContent(prev => prev + chunk);
}
```

---

## Auth Flow

1. User submits login form → `POST /auth/login` → receives JWT
2. JWT stored in `localStorage` as `nyaya_token`
3. Dashboard layout reads token on mount; if missing, redirects to `/login`
4. All API calls include `Authorization: Bearer <token>` header
5. Sign out clears `localStorage` and redirects to `/login`

> **POC Note:** `localStorage` is fine for a POC. For production, use httpOnly cookies to prevent XSS token theft.

---

## AI Streaming (SSE)

The backend returns AI responses as Server-Sent Events. The frontend reads them with a native `ReadableStream`:

```typescript
const res = await fetch(`${API_BASE}/ai/${endpoint}`, { method: "POST", ... });
const reader = res.body!.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const data = line.slice(6);
      if (data === "[DONE]") return;
      yield data;
    }
  }
}
```

---

## shadcn/ui v4 Notes

This project uses **shadcn/ui v4** which is built on **`@base-ui/react`** (not Radix UI). Key differences from v3/older shadcn:

- **No `asChild` prop on `Button`** — use `<Link className={cn(buttonVariants({ variant: "..." }))}>` instead
- **`Select.onValueChange`** returns `string | null` — use `v ?? ""` when setting state
- Components are in `components/ui/` and import from `@base-ui/react/*`

---

## Adding a New AI Feature

1. **Backend**: Add a chain in `backend/services/ai_service.py` and a route in `backend/routers/ai.py`
2. **Frontend**: Drop in a new `<AIPanel>` on the insights page

Example:

```tsx
// In app/(dashboard)/cases/[id]/insights/page.tsx
<AIPanel
  title="Evidence Analysis"
  description="Categorise and assess the strength of evidence on record"
  buttonLabel="Analyse Evidence"
  endpoint="analyse-evidence"
  body={{ case_id: id }}
/>
```

---

## Build Output

```
Route (app)
├ ○ /                    Static — redirects to /dashboard
├ ○ /login               Static — login/register page
├ ○ /dashboard           Static — data fetched client-side
├ ○ /cases               Static — data fetched client-side
├ ○ /cases/new           Static — form page
├ ƒ /cases/[id]          Dynamic — case overview
├ ƒ /cases/[id]/insights Dynamic — AI insights tab
├ ƒ /cases/[id]/research Dynamic — research chat
└ ƒ /cases/[id]/draft    Dynamic — judgment draft
```

---

## Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| Login succeeds but redirects back to `/login` | Backend CORS not configured for your origin | Add your URL to `allow_origins` in `backend/main.py` |
| AI panel shows "AI request failed" | Backend not running or JWT expired | Check backend logs; sign out and back in |
| Documents upload but `processed: false` | Pinecone API key invalid | Check `PINECONE_API_KEY` in backend `.env` |
| Streaming stops mid-response | LLM rate limit or network timeout | Retry; check backend logs; try a smaller model |
| Blank page on `/dashboard` | Not authenticated — token missing | Go to `/login` and sign in |
