# tests/test_security_and_health.py
import pytest
from starlette.testclient import TestClient


def test_health_endpoint(client: TestClient):
    """Verify standard liveness probe returns healthy status."""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data


def test_ready_endpoint(client: TestClient):
    """Verify readiness probe checks database availability."""
    res = client.get("/ready")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ready"
    assert data["database"] == "connected"


def test_security_headers_present(client: TestClient):
    """Verify production security headers are attached to API responses."""
    res = client.get("/health")
    headers = res.headers

    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("X-XSS-Protection") == "1; mode=block"
    assert "Content-Security-Policy" in headers
    assert "Referrer-Policy" in headers


def test_docs_accessible(client: TestClient):
    """Verify Swagger UI and OpenAPI schema load successfully in development/test."""
    res = client.get("/docs")
    assert res.status_code == 200

    openapi_res = client.get("/openapi.json")
    assert openapi_res.status_code == 200
    assert "paths" in openapi_res.json()
