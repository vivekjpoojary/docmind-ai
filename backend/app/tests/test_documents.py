"""Tests for document upload/processing and the ask (RAG) pipeline."""

import io

import pytest


def _txt_file(content: str, filename: str = "docker_guide.txt"):
    return {"file": (filename, io.BytesIO(content.encode()), "text/plain")}


@pytest.mark.asyncio
async def test_unauthenticated_guest_access_rejected(client):
    """Verify that unauthenticated guest requests to RAG endpoints return 401 Unauthorized."""
    r_ask = await client.post("/api/v1/ask", json={"question": "What is Docker?"})
    assert r_ask.status_code == 401

    r_docs = await client.get("/api/v1/documents")
    assert r_docs.status_code == 401


@pytest.mark.asyncio
async def test_upload_txt_document_is_processed(client, auth_headers):
    content = "Docker isolates applications using containers that package all dependencies."
    r = await client.post("/api/v1/upload", files=_txt_file(content), headers=auth_headers)
    assert r.status_code == 201
    body = r.json()
    assert body["document"]["status"] == "ready"
    assert body["document"]["chunk_count"] >= 1
    assert body["document"]["page_count"] == 1


@pytest.mark.asyncio
async def test_duplicate_filename_rejected(client, auth_headers):
    content = "Some content about containers."
    await client.post("/api/v1/upload", files=_txt_file(content), headers=auth_headers)
    r = await client.post("/api/v1/upload", files=_txt_file(content), headers=auth_headers)
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_unsupported_extension_rejected(client, auth_headers):
    files = {"file": ("malware.exe", io.BytesIO(b"not a real exe"), "application/octet-stream")}
    r = await client.post("/api/v1/upload", files=files, headers=auth_headers)
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_list_documents(client, auth_headers):
    await client.post("/api/v1/upload", files=_txt_file("Docker containers are lightweight."), headers=auth_headers)
    r = await client.get("/api/v1/documents", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json()) == 1


@pytest.mark.asyncio
async def test_ask_returns_grounded_answer_with_citation(client, auth_headers):
    content = "Docker isolates applications using containers that package all dependencies."
    await client.post("/api/v1/upload", files=_txt_file(content), headers=auth_headers)

    r = await client.post(
        "/api/v1/ask",
        json={"question": "How does Docker isolate applications?"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["found_relevant_context"] is True
    assert len(body["sources"]) >= 1
    assert body["sources"][0]["filename"] == "docker_guide.txt"
    assert body["confidence"] > 0


@pytest.mark.asyncio
async def test_ask_with_no_documents_says_not_found(client, auth_headers):
    r = await client.post(
        "/api/v1/ask",
        json={"question": "What is the capital of France?"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["found_relevant_context"] is False
    assert "couldn't find relevant information" in body["answer"]
    assert body["sources"] == []


@pytest.mark.asyncio
async def test_delete_document(client, auth_headers):
    upload = await client.post(
        "/api/v1/upload", files=_txt_file("Kubernetes orchestrates containers."), headers=auth_headers
    )
    doc_id = upload.json()["document"]["id"]

    r = await client.delete(f"/api/v1/document/{doc_id}", headers=auth_headers)
    assert r.status_code == 204

    r = await client.get(f"/api/v1/document/{doc_id}", headers=auth_headers)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_upload_requires_auth(client):
    r = await client.post("/api/v1/upload", files=_txt_file("test"))
    assert r.status_code == 401
