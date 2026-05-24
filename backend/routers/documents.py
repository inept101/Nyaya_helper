import os
import shutil

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models import Case, Document, User
from routers.auth import get_current_user_dep
from schemas import DocumentOut
from services.document_processor import extract_text
from services.language_service import detect_and_translate
from services.vector_store import upsert_document

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt"}


@router.post("/{case_id}/documents", response_model=DocumentOut, status_code=201)
async def upload_document(
    case_id: str,
    file: UploadFile,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    ext = os.path.splitext(file.filename or "")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    case_dir = os.path.join(settings.upload_dir, case_id)
    os.makedirs(case_dir, exist_ok=True)

    doc = Document(case_id=case_id, filename=file.filename, file_path="")
    db.add(doc)
    db.flush()  # get doc.id before commit

    file_path = os.path.join(case_dir, f"{doc.id}{ext}")
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    doc.file_path = file_path

    # Extract text
    raw_text = extract_text(file_path)
    doc.raw_content = raw_text

    # Detect language and translate if needed
    lang, translated = detect_and_translate(raw_text)
    doc.language_detected = lang
    if translated:
        doc.translated_content = translated
        doc.is_translated = True

    content_for_index = translated or raw_text

    # Index in Pinecone
    try:
        upsert_document(case_id=case_id, doc_id=doc.id, text=content_for_index)
        doc.processed = True
    except Exception as e:
        # Don't block upload on indexing failure
        doc.processed = False

    db.commit()
    db.refresh(doc)
    return doc


@router.get("/{case_id}/documents", response_model=list[DocumentOut])
def list_documents(
    case_id: str,
    current_user: User = Depends(get_current_user_dep),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return db.query(Document).filter(Document.case_id == case_id).order_by(Document.created_at).all()
