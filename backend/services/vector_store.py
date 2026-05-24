from typing import Optional

from config import settings
from services.document_processor import chunk_text

_pinecone_index = None


def _get_index():
    global _pinecone_index
    if _pinecone_index is None:
        from pinecone import Pinecone, ServerlessSpec
        pc = Pinecone(api_key=settings.pinecone_api_key)

        existing = [idx.name for idx in pc.list_indexes()]
        if settings.pinecone_index_name not in existing:
            pc.create_index(
                name=settings.pinecone_index_name,
                dimension=settings.embedding_dim,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1"),
            )
        _pinecone_index = pc.Index(settings.pinecone_index_name)
    return _pinecone_index


def _embed(texts: list[str]) -> list[list[float]]:
    from openai import OpenAI
    client = OpenAI(base_url=settings.openai_api_base, api_key=settings.openai_api_key)
    response = client.embeddings.create(model=settings.embedding_model, input=texts)
    return [item.embedding for item in response.data]


def upsert_document(case_id: str, doc_id: str, text: str) -> None:
    chunks = chunk_text(text, chunk_size=500, overlap=50)
    if not chunks:
        return

    index = _get_index()
    namespace = f"case_{case_id}"

    batch_size = 50
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        embeddings = _embed(batch)
        vectors = [
            {
                "id": f"{doc_id}_chunk_{i + j}",
                "values": embeddings[j],
                "metadata": {"doc_id": doc_id, "case_id": case_id, "text": batch[j]},
            }
            for j in range(len(batch))
        ]
        index.upsert(vectors=vectors, namespace=namespace)


def search(case_id: str, query: str, top_k: int = 8) -> list[str]:
    """Return list of relevant text chunks for the given query."""
    index = _get_index()
    namespace = f"case_{case_id}"

    query_embedding = _embed([query])[0]
    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True,
        namespace=namespace,
    )
    return [match.metadata["text"] for match in results.matches if match.metadata.get("text")]


def delete_case_vectors(case_id: str) -> None:
    index = _get_index()
    namespace = f"case_{case_id}"
    index.delete(delete_all=True, namespace=namespace)
