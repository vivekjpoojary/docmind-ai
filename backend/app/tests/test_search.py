"""Tests for the search endpoint."""

import io

import pytest


def _txt_file(content: str, filename: str):
    return {"file": (filename, io.BytesIO(content.encode()), "text/plain")}


@pytest.mark.asyncio
async def test_keyword_search_finds_exact_match(client, auth_headers):
    await client.post(
        "/api/v1/upload",
        files=_txt_file("PostgreSQL is a powerful open-source relational database.", "db.txt"),
        headers=auth_headers,
    )

    r = await client.post(
        "/api/v1/search",
        json={"query": "PostgreSQL", "mode": "keyword"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert len(body["results"]) >= 1
    assert body["results"][0]["match_type"] == "keyword"
    assert "PostgreSQL" in body["results"][0]["excerpt"]


@pytest.mark.asyncio
async def test_semantic_search_returns_results(client, auth_headers):
    await client.post(
        "/api/v1/upload",
        files=_txt_file("Machine learning models require large amounts of training data.", "ml.txt"),
        headers=auth_headers,
    )

    r = await client.post(
        "/api/v1/search",
        json={"query": "machine learning training data", "mode": "semantic"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert len(r.json()["results"]) >= 1


@pytest.mark.asyncio
async def test_hybrid_search_default_mode(client, auth_headers):
    await client.post(
        "/api/v1/upload",
        files=_txt_file("Kubernetes automates deployment and scaling of containers.", "k8s.txt"),
        headers=auth_headers,
    )

    r = await client.post("/api/v1/search", json={"query": "Kubernetes"}, headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["mode"] == "hybrid"
    assert len(body["results"]) >= 1


@pytest.mark.asyncio
async def test_search_filters_by_document_id(client, auth_headers):
    up1 = await client.post(
        "/api/v1/upload", files=_txt_file("Docker containers are lightweight.", "docker.txt"), headers=auth_headers
    )
    await client.post(
        "/api/v1/upload", files=_txt_file("Docker Compose orchestrates multi-container apps.", "compose.txt"),
        headers=auth_headers,
    )
    doc1_id = up1.json()["document"]["id"]

    r = await client.post(
        "/api/v1/search",
        json={"query": "Docker", "mode": "keyword", "document_ids": [doc1_id]},
        headers=auth_headers,
    )
    assert r.status_code == 200
    for result in r.json()["results"]:
        assert result["document_id"] == doc1_id


@pytest.mark.asyncio
async def test_search_requires_auth(client):
    r = await client.post("/api/v1/search", json={"query": "test"})
    assert r.status_code == 401
