import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from database import Base


def utcnow():
    return datetime.now(timezone.utc)


def new_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=new_uuid)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    cases = relationship("Case", back_populates="owner", cascade="all, delete-orphan")


class Case(Base):
    __tablename__ = "cases"

    id = Column(String, primary_key=True, default=new_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(300), nullable=False)
    case_number = Column(String(100), nullable=False)
    court = Column(String(200), nullable=False)
    case_type = Column(String(100), nullable=False)
    petitioner = Column(String(300), nullable=False)
    respondent = Column(String(300), nullable=False)
    status = Column(String(50), nullable=False, default="active")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    owner = relationship("User", back_populates="cases")
    documents = relationship("Document", back_populates="case", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=new_uuid)
    case_id = Column(String, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(300), nullable=False)
    file_path = Column(String(500), nullable=False)
    language_detected = Column(String(10), nullable=True)
    is_translated = Column(Boolean, default=False)
    translated_content = Column(Text, nullable=True)
    raw_content = Column(Text, nullable=True)
    processed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    case = relationship("Case", back_populates="documents")


class LegalSearchCache(Base):
    __tablename__ = "legal_search_cache"

    cache_key = Column(String(64), primary_key=True)
    endpoint = Column(String(50), nullable=False, index=True)
    response_json = Column(Text, nullable=False)
    fetched_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
