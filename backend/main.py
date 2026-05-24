import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import init_db
from routers import ai, auth, cases, documents, legal_search

app = FastAPI(title="NyayaHelper AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(cases.router, prefix="/cases", tags=["cases"])
app.include_router(documents.router, prefix="/cases", tags=["documents"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(legal_search.router, prefix="/legal-search", tags=["legal-search"])


@app.on_event("startup")
def startup():
    os.makedirs(settings.upload_dir, exist_ok=True)
    init_db()


@app.get("/health")
def health():
    return {"status": "ok"}
