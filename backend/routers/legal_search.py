from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User
from routers.auth import get_current_user_dep
from schemas import LegalDocResponse, LegalSearchRequest, LegalSearchResponse
from services import legal_search_service

router = APIRouter()


@router.post("/search", response_model=LegalSearchResponse)
def search_legal_db(
    body: LegalSearchRequest,
    _user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    if not body.query.strip():
        raise HTTPException(status_code=400, detail="Query is required")
    try:
        result = legal_search_service.search(
            db=db,
            query=body.query,
            doctypes=body.doctypes,
            fromdate=body.fromdate,
            todate=body.todate,
            pagenum=body.pagenum,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    return LegalSearchResponse(query=body.query, **result)


@router.get("/doc/{docid}", response_model=LegalDocResponse)
def get_legal_doc(
    docid: str,
    _user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    try:
        result = legal_search_service.get_doc(db, docid)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    return LegalDocResponse(**result)
