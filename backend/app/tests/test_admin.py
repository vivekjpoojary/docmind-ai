"""Tests for admin endpoints: user management, document moderation, platform analytics."""

import io

import pytest


def _txt_file(content: str, filename: str = "admin_doc.txt"):
    return {"file": (filename, io.BytesIO(content.encode()), "text/plain")}


async def _register_and_login(client, email: str, password: str = "supersecret123"):
    await client.post(
        "/api/v1/register", json={"email": email, "full_name": "Test User", "password": password}
    )
    r = await client.post("/api/v1/login", json={"email": email, "password": password})
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_first_user_is_admin_second_is_not(client, auth_headers):
    """auth_headers fixture registers the first user, who becomes admin automatically."""
    me = await client.get("/api/v1/me", headers=auth_headers)
    assert me.json()["is_admin"] is True

    second_headers = await _register_and_login(client, "second@example.com")
    me2 = await client.get("/api/v1/me", headers=second_headers)
    assert me2.json()["is_admin"] is False


@pytest.mark.asyncio
async def test_non_admin_cannot_access_admin_endpoints(client, auth_headers):
    # auth_headers is the first (admin) user; create a second, non-admin one
    second_headers = await _register_and_login(client, "notadmin@example.com")

    r = await client.get("/api/v1/admin/users", headers=second_headers)
    assert r.status_code == 403

    r = await client.get("/api/v1/admin/analytics", headers=second_headers)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_list_all_users(client, auth_headers):
    await _register_and_login(client, "someoneelse@example.com")

    r = await client.get("/api/v1/admin/users", headers=auth_headers)
    assert r.status_code == 200
    emails = [u["email"] for u in r.json()]
    assert "ragtest@example.com" in emails
    assert "someoneelse@example.com" in emails


@pytest.mark.asyncio
async def test_admin_cannot_delete_own_account(client, auth_headers):
    me = await client.get("/api/v1/me", headers=auth_headers)
    admin_id = me.json()["id"]

    r = await client.delete(f"/api/v1/admin/users/{admin_id}", headers=auth_headers)
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_admin_can_delete_another_users_document(client, auth_headers):
    second_headers = await _register_and_login(client, "docowner@example.com")
    upload = await client.post(
        "/api/v1/upload", files=_txt_file("Some content."), headers=second_headers
    )
    doc_id = upload.json()["document"]["id"]

    r = await client.delete(f"/api/v1/admin/documents/{doc_id}", headers=auth_headers)
    assert r.status_code == 204

    r = await client.get(f"/api/v1/document/{doc_id}", headers=second_headers)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_admin_platform_analytics(client, auth_headers):
    await _register_and_login(client, "analyticsuser@example.com")

    r = await client.get("/api/v1/admin/analytics", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["total_users"] >= 2
    assert "documents_by_status" in body


@pytest.mark.asyncio
async def test_admin_endpoints_require_auth(client):
    r = await client.get("/api/v1/admin/users")
    assert r.status_code == 401
