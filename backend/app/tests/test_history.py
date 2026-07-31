"""Tests for conversation/chat history endpoints."""

import io

import pytest


def _txt_file(content: str, filename: str = "history_doc.txt"):
    return {"file": (filename, io.BytesIO(content.encode()), "text/plain")}


@pytest.mark.asyncio
async def test_ask_creates_history_entry(client, auth_headers):
    await client.post(
        "/api/v1/upload",
        files=_txt_file("Kubernetes orchestrates containers across a cluster."),
        headers=auth_headers,
    )
    await client.post(
        "/api/v1/ask",
        json={"question": "What does Kubernetes orchestrate?"},
        headers=auth_headers,
    )

    r = await client.get("/api/v1/history", headers=auth_headers)
    assert r.status_code == 200
    conversations = r.json()
    assert len(conversations) == 1
    assert conversations[0]["title"]


@pytest.mark.asyncio
async def test_history_detail_includes_messages_and_sources(client, auth_headers):
    await client.post(
        "/api/v1/upload",
        files=_txt_file("Docker isolates applications using containers."),
        headers=auth_headers,
    )
    ask = await client.post(
        "/api/v1/ask",
        json={"question": "How does Docker isolate applications?"},
        headers=auth_headers,
    )
    conversation_id = ask.json()["conversation_id"]

    r = await client.get(f"/api/v1/history/{conversation_id}", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert len(body["messages"]) == 2  # user question + assistant answer
    assistant_msg = next(m for m in body["messages"] if m["role"] == "assistant")
    assert assistant_msg["sources"] is not None
    assert len(assistant_msg["sources"]) >= 1
    assert assistant_msg["confidence"] is not None


@pytest.mark.asyncio
async def test_delete_single_conversation(client, auth_headers):
    await client.post(
        "/api/v1/upload", files=_txt_file("Nginx is a reverse proxy."), headers=auth_headers
    )
    ask = await client.post(
        "/api/v1/ask", json={"question": "What is Nginx?"}, headers=auth_headers
    )
    conversation_id = ask.json()["conversation_id"]

    r = await client.delete(f"/api/v1/history/{conversation_id}", headers=auth_headers)
    assert r.status_code == 204

    r = await client.get(f"/api/v1/history/{conversation_id}", headers=auth_headers)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_clear_all_history(client, auth_headers):
    await client.post(
        "/api/v1/upload", files=_txt_file("Redis is an in-memory data store."), headers=auth_headers
    )
    await client.post("/api/v1/ask", json={"question": "What is Redis?"}, headers=auth_headers)
    await client.post("/api/v1/ask", json={"question": "Is Redis fast?"}, headers=auth_headers)

    r = await client.delete("/api/v1/history", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["deleted_conversations"] == 2

    r = await client.get("/api/v1/history", headers=auth_headers)
    assert r.json() == []


@pytest.mark.asyncio
async def test_history_requires_auth(client):
    r = await client.get("/api/v1/history")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_user_analytics(client, auth_headers):
    await client.post(
        "/api/v1/upload", files=_txt_file("Terraform manages infrastructure as code."), headers=auth_headers
    )
    await client.post("/api/v1/ask", json={"question": "What does Terraform manage?"}, headers=auth_headers)

    r = await client.get("/api/v1/analytics", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["total_documents"] == 1
    assert body["total_conversations"] == 1
    assert body["total_questions_asked"] == 1
    assert body["storage_bytes"] > 0
