"""
Indian Kanoon API client with DB-backed caching and mock mode.

API docs: https://api.indiankanoon.org/documentation/
Auth: `Authorization: Token <api_token>` header.
Billing: per page returned — keep maxpages low, cache aggressively.
"""
import hashlib
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

import httpx
from sqlalchemy.orm import Session

from config import settings
from models import LegalSearchCache

IK_BASE_URL = "https://api.indiankanoon.org"
MOCK_FIXTURE_PATH = Path(__file__).parent / "mock_data" / "indian_kanoon_mock.json"

_mock_cache: Optional[dict] = None


def _load_mock() -> dict:
    global _mock_cache
    if _mock_cache is None:
        with open(MOCK_FIXTURE_PATH, encoding="utf-8") as f:
            _mock_cache = json.load(f)
    return _mock_cache


def _cache_key(endpoint: str, params: dict) -> str:
    payload = json.dumps({"endpoint": endpoint, "params": params}, sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()


def _cache_get(db: Session, key: str) -> Optional[dict]:
    row = db.query(LegalSearchCache).filter(LegalSearchCache.cache_key == key).first()
    if not row:
        return None
    fetched = row.fetched_at if row.fetched_at.tzinfo else row.fetched_at.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) - fetched > timedelta(hours=settings.legal_search_cache_ttl_hours):
        return None
    return json.loads(row.response_json)


def _cache_put(db: Session, key: str, endpoint: str, data: dict) -> None:
    existing = db.query(LegalSearchCache).filter(LegalSearchCache.cache_key == key).first()
    if existing:
        existing.response_json = json.dumps(data)
        existing.fetched_at = datetime.now(timezone.utc)
    else:
        db.add(LegalSearchCache(
            cache_key=key,
            endpoint=endpoint,
            response_json=json.dumps(data),
            fetched_at=datetime.now(timezone.utc),
        ))
    db.commit()


def _ik_post(path: str, params: dict) -> dict:
    """POST to Indian Kanoon API. They use POST for search (params in querystring)."""
    if not settings.indian_kanoon_api_token:
        raise RuntimeError(
            "INDIAN_KANOON_API_TOKEN not set. Either configure it in .env or "
            "set LEGAL_SEARCH_MOCK_MODE=true to use mock data."
        )
    headers = {
        "Authorization": f"Token {settings.indian_kanoon_api_token}",
        "Accept": "application/json",
    }
    url = f"{IK_BASE_URL}{path}"
    with httpx.Client(timeout=30.0) as client:
        resp = client.post(url, params=params, headers=headers)
        resp.raise_for_status()
        return resp.json()


def search(
    db: Session,
    query: str,
    doctypes: Optional[str] = None,
    fromdate: Optional[str] = None,
    todate: Optional[str] = None,
    pagenum: int = 0,
) -> dict:
    """
    Search Indian Kanoon. Returns {hits, total_found, from_cache, mock}.
    Each hit: {docid, title, headline, court, docsource, publishdate, citation}
    """
    params: dict[str, Any] = {"formInput": query, "pagenum": pagenum}
    if doctypes:
        params["doctypes"] = doctypes
    if fromdate:
        params["fromdate"] = fromdate
    if todate:
        params["todate"] = todate

    key = _cache_key("search", params)
    cached = _cache_get(db, key)
    if cached is not None:
        return {**cached, "from_cache": True}

    if settings.legal_search_mock_mode:
        mock = _load_mock()
        q_lower = query.lower()
        hits = [
            h for h in mock["search_results"]
            if any(term in h["title"].lower() or term in h["headline"].lower()
                   for term in q_lower.split())
        ]
        if not hits:
            hits = mock["search_results"][:3]
        result = {
            "hits": hits,
            "total_found": len(hits),
            "from_cache": False,
            "mock": True,
        }
        _cache_put(db, key, "search", result)
        return result

    raw = _ik_post("/search/", params)
    hits = []
    for item in raw.get("docs", []):
        hits.append({
            "docid": str(item.get("tid", "")),
            "title": item.get("title", "").strip(),
            "headline": item.get("headline", "").strip(),
            "court": item.get("docsource"),
            "docsource": item.get("docsource"),
            "publishdate": item.get("publishdate"),
            "citation": item.get("citation"),
        })
    result = {
        "hits": hits,
        "total_found": int(raw.get("found", len(hits))),
        "from_cache": False,
        "mock": False,
    }
    _cache_put(db, key, "search", result)
    return result


def get_doc(db: Session, docid: str) -> dict:
    """Fetch a full document. Returns {docid, title, doc, court, publishdate}."""
    key = _cache_key("doc", {"docid": docid})
    cached = _cache_get(db, key)
    if cached is not None:
        return {**cached, "from_cache": True}

    if settings.legal_search_mock_mode:
        mock = _load_mock()
        doc = mock["documents"].get(str(docid))
        if not doc:
            # Fall back to first available mock doc so the UI still has content
            first_id = next(iter(mock["documents"]))
            doc = mock["documents"][first_id]
        result = {**doc, "from_cache": False, "mock": True}
        _cache_put(db, key, "doc", result)
        return result

    raw = _ik_post(f"/doc/{docid}/", {})
    result = {
        "docid": str(docid),
        "title": raw.get("title", "").strip(),
        "doc": raw.get("doc", ""),
        "court": raw.get("docsource"),
        "publishdate": raw.get("publishdate"),
        "from_cache": False,
        "mock": False,
    }
    _cache_put(db, key, "doc", result)
    return result
