"""
All AI chains for NyayaHelper. Each function returns an async generator
that yields text chunks, suitable for FastAPI StreamingResponse (SSE).
"""
from typing import AsyncGenerator

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain.chains.summarize import load_summarize_chain
from langchain.schema import Document as LCDocument
from langchain_core.output_parsers import StrOutputParser

from config import settings
from services.document_processor import chunk_text
from services.vector_store import search


def _llm(streaming: bool = True) -> ChatOpenAI:
    return ChatOpenAI(
        base_url=settings.openai_api_base,
        api_key=settings.openai_api_key,
        model=settings.model_name,
        temperature=0.2,
        streaming=streaming,
    )


def _get_case_text(db, case_id: str, doc_ids: list[str] | None = None) -> str:
    """Fetch raw/translated text from DB documents for the given case."""
    from models import Document
    query = db.query(Document).filter(Document.case_id == case_id, Document.processed == True)
    if doc_ids:
        query = query.filter(Document.id.in_(doc_ids))
    docs = query.all()
    parts = []
    for doc in docs:
        content = doc.translated_content or doc.raw_content or ""
        if content:
            parts.append(f"--- Document: {doc.filename} ---\n{content}")
    return "\n\n".join(parts)


def _case_metadata_str(case) -> str:
    return (
        f"Case Title: {case.title}\n"
        f"Case Number: {case.case_number}\n"
        f"Court: {case.court}\n"
        f"Case Type: {case.case_type}\n"
        f"Petitioner: {case.petitioner}\n"
        f"Respondent: {case.respondent}\n"
    )


# ── 1. Summarization ──────────────────────────────────────────────────────────

async def stream_summarize(case_id: str, doc_ids: list[str] | None, db) -> AsyncGenerator[str, None]:
    from models import Case
    case = db.query(Case).filter(Case.id == case_id).first()
    text = _get_case_text(db, case_id, doc_ids)
    if not text:
        yield "No processed documents found for this case."
        return

    system = (
        "You are an expert Indian legal assistant helping a civil court judge. "
        "Summarize the following case documents clearly and concisely. "
        "Structure your summary as:\n"
        "1. PARTIES: Who are the petitioner and respondent?\n"
        "2. BACKGROUND: Key facts and chronology of events\n"
        "3. RELIEF SOUGHT: What does the petitioner want?\n"
        "4. RESPONDENT'S POSITION: Key defences raised\n"
        "5. KEY EVIDENCE: Important documents/witnesses mentioned\n"
        "6. APPLICABLE LAWS: Statutes and acts referenced\n\n"
        "Be precise and use legal terminology appropriate for Indian civil courts."
    )

    # For very long documents, chunk and use map-reduce approach
    chunks = chunk_text(text, chunk_size=3000, overlap=200)
    lc_docs = [LCDocument(page_content=c) for c in chunks]
    llm = _llm(streaming=False)

    if len(chunks) == 1:
        messages = [SystemMessage(content=system), HumanMessage(content=text)]
        llm_stream = _llm(streaming=True)
        async for chunk in llm_stream.astream(messages):
            if chunk.content:
                yield chunk.content
    else:
        # Map: summarize each chunk
        map_prompt = ChatPromptTemplate.from_messages([
            ("system", "Summarize this section of an Indian legal document, preserving all key facts, parties, dates, and legal arguments."),
            ("human", "{text}"),
        ])
        map_chain = map_prompt | llm | StrOutputParser()

        chunk_summaries = []
        for doc in lc_docs:
            summary = map_chain.invoke({"text": doc.page_content})
            chunk_summaries.append(summary)

        combined = "\n\n".join(chunk_summaries)
        reduce_messages = [
            SystemMessage(content=system),
            HumanMessage(content=f"Case Metadata:\n{_case_metadata_str(case)}\n\nDocument Summaries:\n{combined}"),
        ]
        llm_stream = _llm(streaming=True)
        async for chunk in llm_stream.astream(reduce_messages):
            if chunk.content:
                yield chunk.content


# ── 2. Extract Legal Issues ───────────────────────────────────────────────────

async def stream_extract_issues(case_id: str, db) -> AsyncGenerator[str, None]:
    from models import Case
    case = db.query(Case).filter(Case.id == case_id).first()
    text = _get_case_text(db, case_id)
    if not text:
        yield "No processed documents found for this case."
        return

    context = text[:8000]  # Use first 8000 chars for issue extraction
    messages = [
        SystemMessage(content=(
            "You are an expert Indian civil court legal analyst. "
            "Identify and list ALL distinct legal issues/questions of law and fact in dispute in this case. "
            "For each issue, provide:\n"
            "- ISSUE: The specific legal question\n"
            "- APPLICABLE LAW: Relevant section/act (e.g., Section 9 CPC, Section 27 Evidence Act)\n"
            "- PETITIONER'S POSITION: Their argument on this issue\n"
            "- RESPONDENT'S POSITION: Their argument on this issue\n\n"
            "Format as a numbered list. Be exhaustive — miss no issue."
        )),
        HumanMessage(content=(
            f"Case Metadata:\n{_case_metadata_str(case)}\n\n"
            f"Case Documents:\n{context}"
        )),
    ]
    llm_stream = _llm(streaming=True)
    async for chunk in llm_stream.astream(messages):
        if chunk.content:
            yield chunk.content


# ── 3. Generate Case Brief ────────────────────────────────────────────────────

async def stream_generate_brief(case_id: str, db) -> AsyncGenerator[str, None]:
    from models import Case
    case = db.query(Case).filter(Case.id == case_id).first()
    text = _get_case_text(db, case_id)
    if not text:
        yield "No processed documents found for this case."
        return

    context = text[:10000]
    messages = [
        SystemMessage(content=(
            "You are a senior Indian civil court advocate preparing a comprehensive case brief "
            "for the presiding judge. Generate a structured brief following this Indian court format:\n\n"
            "IN THE COURT OF [Court Name]\n"
            "[Case Number]\n\n"
            "CASE BRIEF\n\n"
            "A. PARTIES\n"
            "B. JURISDICTION\n"
            "C. FACTS OF THE CASE (chronological)\n"
            "D. ISSUES FRAMED\n"
            "E. PETITIONER'S ARGUMENTS (with statutory references)\n"
            "F. RESPONDENT'S ARGUMENTS (with statutory references)\n"
            "G. RELEVANT PRECEDENTS (cite any Indian case law mentioned)\n"
            "H. APPLICABLE STATUTES AND PROVISIONS\n"
            "I. RELIEFS CLAIMED\n"
            "J. DOCUMENTS ON RECORD\n\n"
            "Be thorough, formal, and use proper legal language as used in Indian courts."
        )),
        HumanMessage(content=(
            f"Case Metadata:\n{_case_metadata_str(case)}\n\n"
            f"Case Documents:\n{context}"
        )),
    ]
    llm_stream = _llm(streaming=True)
    async for chunk in llm_stream.astream(messages):
        if chunk.content:
            yield chunk.content


# ── 4. Legal Research (RAG) ───────────────────────────────────────────────────

async def stream_research(case_id: str, question: str, db) -> AsyncGenerator[str, None]:
    from models import Case
    case = db.query(Case).filter(Case.id == case_id).first()

    # Retrieve relevant chunks from Pinecone
    relevant_chunks = search(case_id=case_id, query=question, top_k=6)
    context = "\n\n---\n\n".join(relevant_chunks) if relevant_chunks else "No relevant documents found."

    messages = [
        SystemMessage(content=(
            "You are an expert Indian legal research assistant helping a civil court judge. "
            "Answer the judge's question based on the case documents provided. "
            "Where relevant, cite applicable Indian laws (IPC, CPC, CrPC, Evidence Act, specific acts), "
            "and mention any Indian case law citations (SCC, AIR format) if you are aware of relevant precedents. "
            "Be precise, factual, and reference specific document sections where possible. "
            "If the answer cannot be determined from the documents, say so clearly."
        )),
        HumanMessage(content=(
            f"Case: {case.title} ({case.case_number})\n"
            f"Petitioner: {case.petitioner} vs Respondent: {case.respondent}\n\n"
            f"RELEVANT DOCUMENT EXCERPTS:\n{context}\n\n"
            f"JUDGE'S QUESTION: {question}"
        )),
    ]
    llm_stream = _llm(streaming=True)
    async for chunk in llm_stream.astream(messages):
        if chunk.content:
            yield chunk.content


# ── 5. Draft Judgment ─────────────────────────────────────────────────────────

async def stream_draft_judgment(case_id: str, db) -> AsyncGenerator[str, None]:
    from models import Case
    case = db.query(Case).filter(Case.id == case_id).first()
    text = _get_case_text(db, case_id)

    context = text[:8000] if text else "No documents uploaded yet."
    messages = [
        SystemMessage(content=(
            "You are assisting an Indian civil court judge in drafting a judgment. "
            "Generate a structured judgment TEMPLATE/SKELETON following the standard Indian civil court format. "
            "Mark sections that the judge must fill in with [JUDGE TO COMPLETE: ...] placeholders. "
            "The skeleton should follow this structure:\n\n"
            "IN THE COURT OF [Court Name], [City]\n"
            "[Case Number]\n\n"
            "JUDGMENT\n\n"
            "Pronounced on: [Date]\n\n"
            "BEFORE: Hon'ble [Name], [Designation]\n\n"
            "PARTIES:\n"
            "Petitioner/Plaintiff: [Name] ... through Advocate [Name]\n"
            "Respondent/Defendant: [Name] ... through Advocate [Name]\n\n"
            "1. INTRODUCTION\n"
            "2. BRIEF FACTS\n"
            "3. ISSUES FRAMED\n"
            "4. FINDINGS ON EACH ISSUE\n"
            "   Issue No. 1: [state issue]\n"
            "   Discussion: [JUDGE TO COMPLETE: analysis and reasoning]\n"
            "   Finding: [JUDGE TO COMPLETE: decision]\n"
            "5. CONCLUSION\n"
            "6. ORDER/DECREE\n\n"
            "Fill in all factual details from the case documents. "
            "Leave legal reasoning and findings as [JUDGE TO COMPLETE] placeholders."
        )),
        HumanMessage(content=(
            f"Case Metadata:\n{_case_metadata_str(case)}\n\n"
            f"Case Documents:\n{context}"
        )),
    ]
    llm_stream = _llm(streaming=True)
    async for chunk in llm_stream.astream(messages):
        if chunk.content:
            yield chunk.content


# ── 6. On-Demand Translation ──────────────────────────────────────────────────

async def stream_translate(doc_id: str, db) -> AsyncGenerator[str, None]:
    from models import Document
    from services.language_service import INDIAN_LANGUAGE_NAMES, translate_to_english

    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        yield "Document not found."
        return
    if doc.is_translated and doc.translated_content:
        yield doc.translated_content
        return

    text = doc.raw_content or ""
    if not text:
        yield "No text content found in this document."
        return

    lang = doc.language_detected or "hi"
    lang_name = INDIAN_LANGUAGE_NAMES.get(lang, lang)

    llm_stream = _llm(streaming=True)
    messages = [
        SystemMessage(content=(
            f"Translate the following legal document from {lang_name} to English. "
            "Preserve all legal terminology, party names, case numbers, and dates exactly."
        )),
        HumanMessage(content=text[:15000]),
    ]
    translated_parts = []
    async for chunk in llm_stream.astream(messages):
        if chunk.content:
            translated_parts.append(chunk.content)
            yield chunk.content

    # Save translation to DB
    doc.translated_content = "".join(translated_parts)
    doc.is_translated = True
    db.commit()
