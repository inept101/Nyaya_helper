const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("nyaya_token");
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers as Record<string, string> || {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function login(username: string, password: string): Promise<string> {
  const data = await apiFetch<{ access_token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  return data.access_token;
}

export async function register(username: string, password: string): Promise<void> {
  await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function getMe(): Promise<{ id: string; username: string }> {
  return apiFetch("/auth/me");
}

// ── Cases ─────────────────────────────────────────────────────────────────────

export interface CaseOut {
  id: string;
  title: string;
  case_number: string;
  court: string;
  case_type: string;
  petitioner: string;
  respondent: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentOut {
  id: string;
  filename: string;
  language_detected: string | null;
  is_translated: boolean;
  processed: boolean;
  created_at: string;
}

export interface CaseDetailOut extends CaseOut {
  documents: DocumentOut[];
}

export interface CaseCreate {
  title: string;
  case_number: string;
  court: string;
  case_type: string;
  petitioner: string;
  respondent: string;
  notes?: string;
}

export async function listCases(): Promise<CaseOut[]> {
  return apiFetch("/cases");
}

export async function createCase(data: CaseCreate): Promise<CaseOut> {
  return apiFetch("/cases", { method: "POST", body: JSON.stringify(data) });
}

export async function getCase(id: string): Promise<CaseDetailOut> {
  return apiFetch(`/cases/${id}`);
}

export async function updateCase(id: string, data: Partial<CaseCreate & { status: string }>): Promise<CaseOut> {
  return apiFetch(`/cases/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteCase(id: string): Promise<void> {
  await apiFetch(`/cases/${id}`, { method: "DELETE" });
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function uploadDocument(caseId: string, file: File): Promise<DocumentOut> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/cases/${caseId}/documents`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function listDocuments(caseId: string): Promise<DocumentOut[]> {
  return apiFetch(`/cases/${caseId}/documents`);
}

// ── AI Streaming ───────────────────────────────────────────────────────────────

export async function* streamAI(
  endpoint: string,
  body: Record<string, unknown>
): AsyncGenerator<string> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/ai/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "AI request failed");
  }

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
}
