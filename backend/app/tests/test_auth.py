"""Tests for register / login / refresh / me flow."""

import pytest


@pytest.mark.asyncio
async def test_register_and_login(client):
    register_payload = {
        "email": "test@example.com",
        "full_name": "Test User",
        "password": "supersecret123",
    }
    r = await client.post("/api/v1/register", json=register_payload)
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == "test@example.com"
    assert body["is_admin"] is True  # first user becomes admin

    r = await client.post(
        "/api/v1/login",
        json={"email": "test@example.com", "password": "supersecret123"},
    )
    assert r.status_code == 200
    tokens = r.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens

    r = await client.get(
        "/api/v1/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert r.status_code == 200
    assert r.json()["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_duplicate_registration_rejected(client):
    payload = {"email": "dup@example.com", "full_name": "Dup", "password": "supersecret123"}
    r1 = await client.post("/api/v1/register", json=payload)
    assert r1.status_code == 201
    r2 = await client.post("/api/v1/register", json=payload)
    assert r2.status_code == 409


@pytest.mark.asyncio
async def test_login_wrong_password_rejected(client):
    payload = {"email": "wrong@example.com", "full_name": "Wrong", "password": "supersecret123"}
    await client.post("/api/v1/register", json=payload)
    r = await client.post(
        "/api/v1/login", json={"email": "wrong@example.com", "password": "bad_password"}
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_me_requires_auth(client):
    r = await client.get("/api/v1/me")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_health_check(client):
    r = await client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_security_headers_present(client):
    r = await client.get("/api/health")
    assert r.headers.get("X-Content-Type-Options") == "nosniff"
    assert r.headers.get("X-Frame-Options") == "DENY"


@pytest.mark.asyncio
async def test_ip_spoofing_does_not_bypass_rate_limiter(client):
    """
    Verify that prepending fake IPs in X-Forwarded-For does not bypass
    the rate limiter when the true client IP (rightmost IP) is identical.
    """
    from app.middleware.rate_limit import limiter
    limiter.enabled = True
    try:
        payload = {"email": "spoof@example.com", "password": "wrongpassword"}
        for i in range(10):
            fake_ip = f"192.168.1.{i}"
            # Prepend fake IP to X-Forwarded-For, rightmost is real client IP "203.0.113.195"
            headers = {"X-Forwarded-For": f"{fake_ip}, 203.0.113.195"}
            await client.post("/api/v1/login", json=payload, headers=headers)

        # 11th request from the same rightmost IP must trigger 429 Rate Limit Exceeded
        headers = {"X-Forwarded-For": "10.9.8.7, 203.0.113.195"}
        r = await client.post("/api/v1/login", json=payload, headers=headers)
        assert r.status_code == 429
    finally:
        limiter.enabled = False
