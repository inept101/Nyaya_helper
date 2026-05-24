from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    username: str
    created_at: datetime


# ── Case ──────────────────────────────────────────────────────────────────────

class CaseCreate(BaseModel):
    title: str
    case_number: str
    court: str
    case_type: str
    petitioner: str
    respondent: str
    notes: Optional[str] = None


class CaseUpdate(BaseModel):
    title: Optional[str] = None
    case_number: Optional[str] = None
    court: Optional[str] = None
    case_type: Optional[str] = None
    petitioner: Optional[str] = None
    respondent: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    filename: str
    language_detected: Optional[str]
    is_translated: bool
    processed: bool
    created_at: datetime


class CaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    case_number: str
    court: str
    case_type: str
    petitioner: str
    respondent: str
    status: str
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime


class CaseDetailOut(CaseOut):
    documents: list[DocumentOut] = []


# ── AI requests ───────────────────────────────────────────────────────────────

class SummarizeRequest(BaseModel):
    case_id: str
    doc_ids: Optional[list[str]] = None


class ExtractIssuesRequest(BaseModel):
    case_id: str


class GenerateBriefRequest(BaseModel):
    case_id: str


class ResearchRequest(BaseModel):
    case_id: str
    question: str


class DraftJudgmentRequest(BaseModel):
    case_id: str


class TranslateRequest(BaseModel):
    doc_id: str


# ── Legal Search (Indian Kanoon) ─────────────────────────────────────────────

class LegalSearchRequest(BaseModel):
    query: str
    doctypes: Optional[str] = None  # e.g. "supremecourt,highcourts"
    fromdate: Optional[str] = None  # DD-MM-YYYY
    todate: Optional[str] = None    # DD-MM-YYYY
    pagenum: int = 0


class LegalSearchHit(BaseModel):
    docid: str
    title: str
    headline: str
    court: Optional[str] = None
    docsource: Optional[str] = None
    publishdate: Optional[str] = None
    citation: Optional[str] = None


class LegalSearchResponse(BaseModel):
    query: str
    total_found: int
    hits: list[LegalSearchHit]
    from_cache: bool = False
    mock: bool = False


class LegalDocResponse(BaseModel):
    docid: str
    title: str
    doc: str
    court: Optional[str] = None
    publishdate: Optional[str] = None
    from_cache: bool = False
    mock: bool = False
