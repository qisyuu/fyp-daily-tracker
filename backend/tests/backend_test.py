"""
Backend tests for Daily Tracker FYP prototype.
Covers: health, auth (register/login/me), staff CRUD, holidays CRUD, attendance.
"""
import os
import uuid
from datetime import datetime, timezone

import pytest
import requests
from dotenv import load_dotenv
from pathlib import Path

# Load frontend .env to get public REACT_APP_BACKEND_URL
load_dotenv(Path("/app/frontend/.env"))

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@dailytracker.com"
ADMIN_PASSWORD = "admin123"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(http):
    r = http.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---------- Health ----------
class TestHealth:
    def test_health_ok(self, http):
        r = http.get(f"{API}/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert data["db"] == "daily_tracker"


# ---------- Auth ----------
class TestAuth:
    def test_register_success(self, http):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        payload = {"email": email, "password": "secret123", "name": "Test User", "role": "user"}
        r = http.post(f"{API}/auth/register", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 10
        assert data["user"]["email"] == email
        assert data["user"]["role"] == "user"
        assert "id" in data["user"]

    def test_register_duplicate(self, http):
        email = f"dup_{uuid.uuid4().hex[:8]}@example.com"
        payload = {"email": email, "password": "secret123", "name": "Dup User"}
        r1 = http.post(f"{API}/auth/register", json=payload)
        assert r1.status_code == 200
        r2 = http.post(f"{API}/auth/register", json=payload)
        assert r2.status_code == 400
        assert "already" in r2.json().get("detail", "").lower()

    def test_login_admin_success(self, http):
        r = http.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == ADMIN_EMAIL
        assert isinstance(data["token"], str)

    def test_login_wrong_password(self, http):
        r = http.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrongpass"})
        assert r.status_code == 401

    def test_me_with_token(self, http, admin_headers):
        r = http.get(f"{API}/auth/me", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"

    def test_me_without_token(self, http):
        # Use a fresh session without any leftover auth header
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------- Staff ----------
class TestStaff:
    def test_list_active_seed(self, http, admin_headers):
        r = http.get(f"{API}/staff?status=active", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        agent_ids = {s["agent_id"] for s in data}
        for expected in ["A001", "A002", "A003", "A004"]:
            assert expected in agent_ids, f"Missing seeded active staff {expected}. Got {agent_ids}"

    def test_list_resigned_seed(self, http, admin_headers):
        r = http.get(f"{API}/staff?status=resigned", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        agent_ids = {s["agent_id"] for s in data}
        assert "R001" in agent_ids

    def test_create_update_delete_staff(self, http, admin_headers):
        agent_id = f"TEST_{uuid.uuid4().hex[:6].upper()}"
        # Create
        create_payload = {
            "agent_id": agent_id,
            "display_name": "Tester",
            "fullname": "TEST Full Name",
            "position": "Agent",
            "shift": "Day",
            "contact_number": "+60100000000",
            "status": "active",
        }
        r = http.post(f"{API}/staff", json=create_payload, headers=admin_headers)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["agent_id"] == agent_id
        assert "id" in created
        staff_id = created["id"]

        # Duplicate -> 400
        r_dup = http.post(f"{API}/staff", json=create_payload, headers=admin_headers)
        assert r_dup.status_code == 400

        # GET to verify
        r_list = http.get(f"{API}/staff?status=active", headers=admin_headers)
        assert any(s["id"] == staff_id for s in r_list.json())

        # Update
        r_upd = http.put(
            f"{API}/staff/{staff_id}",
            json={"display_name": "Tester Updated"},
            headers=admin_headers,
        )
        assert r_upd.status_code == 200
        assert r_upd.json()["display_name"] == "Tester Updated"

        # Delete
        r_del = http.delete(f"{API}/staff/{staff_id}", headers=admin_headers)
        assert r_del.status_code == 200

        # Verify deletion via update -> 404
        r_chk = http.put(
            f"{API}/staff/{staff_id}",
            json={"display_name": "Should fail"},
            headers=admin_headers,
        )
        assert r_chk.status_code == 404

    def test_create_staff_forbidden_for_non_admin(self, http):
        # Register a regular user
        email = f"user_{uuid.uuid4().hex[:8]}@example.com"
        reg = http.post(
            f"{API}/auth/register",
            json={"email": email, "password": "secret123", "name": "Reg User", "role": "user"},
        )
        assert reg.status_code == 200
        token = reg.json()["token"]
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        r = http.post(
            f"{API}/staff",
            json={
                "agent_id": f"TEST_F_{uuid.uuid4().hex[:4]}",
                "display_name": "x",
                "fullname": "x x",
            },
            headers=headers,
        )
        assert r.status_code == 403


# ---------- Holidays ----------
class TestHolidays:
    def test_list_holidays_current_year(self, http, admin_headers):
        year = datetime.now(timezone.utc).year
        r = http.get(f"{API}/holidays?year={year}", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 6, f"Expected >=6 seeded holidays, got {len(data)}"
        for h in data:
            assert h["date"].startswith(str(year))

    def test_holiday_crud(self, http, admin_headers):
        year = datetime.now(timezone.utc).year
        payload = {
            "date": f"{year}-07-15",
            "region": "National",
            "occasion": "TEST_Holiday",
            "details": "test",
        }
        r = http.post(f"{API}/holidays", json=payload, headers=admin_headers)
        assert r.status_code == 200, r.text
        hid = r.json()["id"]

        r_upd = http.put(
            f"{API}/holidays/{hid}", json={"occasion": "TEST_Updated"}, headers=admin_headers
        )
        assert r_upd.status_code == 200
        assert r_upd.json()["occasion"] == "TEST_Updated"

        r_del = http.delete(f"{API}/holidays/{hid}", headers=admin_headers)
        assert r_del.status_code == 200

        # Confirm removal: update should 404
        r_chk = http.put(
            f"{API}/holidays/{hid}", json={"occasion": "x"}, headers=admin_headers
        )
        assert r_chk.status_code == 404


# ---------- Attendance ----------
class TestAttendance:
    def test_create_and_upsert_attendance(self, http, admin_headers):
        date = "2026-03-15"
        agent_id = "A001"
        # Create
        r1 = http.post(
            f"{API}/attendance",
            json={"agent_id": agent_id, "date": date, "status": "present", "shift": "Day"},
            headers=admin_headers,
        )
        assert r1.status_code == 200, r1.text
        rec1 = r1.json()
        assert rec1["status"] == "present"
        rec_id = rec1["id"]

        # Upsert: same agent+date should update existing (same id)
        r2 = http.post(
            f"{API}/attendance",
            json={"agent_id": agent_id, "date": date, "status": "leave", "note": "Sick"},
            headers=admin_headers,
        )
        assert r2.status_code == 200
        rec2 = r2.json()
        assert rec2["id"] == rec_id, "Upsert should keep same id"
        assert rec2["status"] == "leave"

        # Filter by month + agent
        r3 = http.get(
            f"{API}/attendance?month=2026-03&agent_id={agent_id}", headers=admin_headers
        )
        assert r3.status_code == 200
        data = r3.json()
        assert any(d["id"] == rec_id and d["status"] == "leave" for d in data)
        for d in data:
            assert d["agent_id"] == agent_id
            assert d["date"].startswith("2026-03")

        # Cleanup
        http.delete(f"{API}/attendance/{rec_id}", headers=admin_headers)
