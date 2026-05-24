from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from models import Case, Document, User
from routers.auth import get_current_user_dep
from schemas import (
    DraftJudgmentRequest,
    ExtractIssuesRequest,
    GenerateBriefRequest,
    ResearchRequest,
    SummarizeRequest,
    TranslateRequest,
)
from services import ai_service

router = APIRouter()


def _sse(generator):
    """Wrap an async generator as SSE text/event-stream."""
    async def event_stream():
        async for chunk in generator:
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"
    return StreamingResponse(event_stream(), media_type="text/event-stream")


def _verify_case(case_id: str, user: User, db: Session) -> Case:
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == user.id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.post("/summarize")
async def summarize(
    body: SummarizeRequest,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    _verify_case(body.case_id, current_user, db)
    return _sse(ai_service.stream_summarize(body.case_id, body.doc_ids, db))


@router.post("/extract-issues")
async def extract_issues(
    body: ExtractIssuesRequest,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    _verify_case(body.case_id, current_user, db)
    return _sse(ai_service.stream_extract_issues(body.case_id, db))


@router.post("/generate-brief")
async def generate_brief(
    body: GenerateBriefRequest,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    _verify_case(body.case_id, current_user, db)
    return _sse(ai_service.stream_generate_brief(body.case_id, db))


@router.post("/research")
async def research(
    body: ResearchRequest,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    _verify_case(body.case_id, current_user, db)
    return _sse(ai_service.stream_research(body.case_id, body.question, db))


@router.post("/draft-judgment")
async def draft_judgment(
    body: DraftJudgmentRequest,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    _verify_case(body.case_id, current_user, db)
    return _sse(ai_service.stream_draft_judgment(body.case_id, db))


@router.post("/translate")
async def translate(
    body: TranslateRequest,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(Document.id == body.doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    _verify_case(doc.case_id, current_user, db)
    return _sse(ai_service.stream_translate(body.doc_id, db))
