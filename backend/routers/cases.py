from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Case, User
from routers.auth import get_current_user_dep
from schemas import CaseCreate, CaseDetailOut, CaseOut, CaseUpdate

router = APIRouter()


def _get_case_or_404(case_id: str, user: User, db: Session) -> Case:
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == user.id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.get("", response_model=list[CaseOut])
def list_cases(
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    return db.query(Case).filter(Case.user_id == current_user.id).order_by(Case.created_at.desc()).all()


@router.post("", response_model=CaseOut, status_code=201)
def create_case(
    body: CaseCreate,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    case = Case(user_id=current_user.id, **body.model_dump())
    db.add(case)
    db.commit()
    db.refresh(case)
    return case


@router.get("/{case_id}", response_model=CaseDetailOut)
def get_case(
    case_id: str,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    return _get_case_or_404(case_id, current_user, db)


@router.put("/{case_id}", response_model=CaseOut)
def update_case(
    case_id: str,
    body: CaseUpdate,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    case = _get_case_or_404(case_id, current_user, db)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(case, field, value)
    db.commit()
    db.refresh(case)
    return case


@router.delete("/{case_id}", status_code=204)
def delete_case(
    case_id: str,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    case = _get_case_or_404(case_id, current_user, db)
    db.delete(case)
    db.commit()
