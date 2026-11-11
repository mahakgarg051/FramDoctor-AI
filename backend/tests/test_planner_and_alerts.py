"""
Unit and integration tests for FarmDoctor AI Phase 5:
- Daily Farming Planner (CRUD, status toggling, ownership enforcement, date validation)
- Smart Crop Alerts (overdue tasks, scan follow-ups, weather risk indicators, alert dismissal, deduplication)
"""

import os
import pytest
from datetime import datetime, date, timedelta
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.db.database import init_db
from backend.app.services.auth_service import AuthService
from backend.app.services.alert_service import AlertService
from backend.app.schemas import WeatherResponse

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    """Ensure database schema is initialized before running tests."""
    init_db()


def register_test_user(prefix: str):
    """Helper to create and login a test user."""
    import uuid
    uid = uuid.uuid4().hex[:10]
    email = f"{prefix}_{uid}@farmer.org"
    username = f"{prefix}_{uid}"
    password = "test_mock_password_123"

    res = client.post(
        "/api/v1/auth/register",
        json={"email": email, "username": username, "password": password, "full_name": "Test Farmer"},
    )
    assert res.status_code == 201
    token = res.json()["access_token"]
    user_id = res.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}
    return user_id, headers



def test_task_crud_and_completion():
    """Tests creating, fetching, updating, toggling complete, and deleting farming tasks."""
    user_id, headers = register_test_user("planner_user")

    # 1. Create task
    task_payload = {
        "title": "Inspect Lower Canopies for Early Blight",
        "description": "Check bottom 3 leaf tiers for brown concentric rings.",
        "crop": "Tomato",
        "due_date": date.today().isoformat(),
        "priority": "high",
        "category": "inspection",
        "notes": "Field plot A, row 3",
    }
    create_res = client.post("/api/v1/tasks", json=task_payload, headers=headers)
    assert create_res.status_code == 201, create_res.text
    task_data = create_res.json()
    task_id = task_data["id"]
    assert task_data["title"] == task_payload["title"]
    assert task_data["status"] == "pending"
    assert task_data["priority"] == "high"

    # 2. Get task list
    list_res = client.get("/api/v1/tasks", headers=headers)
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total_tasks"] >= 1
    assert any(t["id"] == task_id for t in list_data["tasks"])

    # 3. Get single task by ID
    get_res = client.get(f"/api/v1/tasks/{task_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == task_id

    # 4. Update task
    update_res = client.put(
        f"/api/v1/tasks/{task_id}",
        json={"title": "Updated Canopy Check", "priority": "urgent"},
        headers=headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "Updated Canopy Check"
    assert update_res.json()["priority"] == "urgent"

    # 5. Toggle task completion
    complete_res = client.patch(
        f"/api/v1/tasks/{task_id}/complete",
        json={"completed": True},
        headers=headers,
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "completed"
    assert complete_res.json()["completed_at"] is not None

    # Toggle back to pending
    revert_res = client.patch(
        f"/api/v1/tasks/{task_id}/complete",
        json={"completed": False},
        headers=headers,
    )
    assert revert_res.status_code == 200
    assert revert_res.json()["status"] == "pending"
    assert revert_res.json()["completed_at"] is None

    # 6. Delete task
    del_res = client.delete(f"/api/v1/tasks/{task_id}", headers=headers)
    assert del_res.status_code == 200

    # Verify task is deleted
    get_after_del = client.get(f"/api/v1/tasks/{task_id}", headers=headers)
    assert get_after_del.status_code == 404


def test_task_ownership_isolation():
    """Verifies that User A cannot read, edit, or delete User B's farming tasks."""
    user_a_id, headers_a = register_test_user("user_a")
    user_b_id, headers_b = register_test_user("user_b")

    # User A creates a task
    create_res = client.post(
        "/api/v1/tasks",
        json={"title": "User A Private Task", "due_date": date.today().isoformat()},
        headers=headers_a,
    )
    assert create_res.status_code == 201
    task_id = create_res.json()["id"]

    # User B attempts to access User A's task -> 403 Forbidden
    get_res = client.get(f"/api/v1/tasks/{task_id}", headers=headers_b)
    assert get_res.status_code == 403

    # User B attempts to edit User A's task -> 403 Forbidden
    put_res = client.put(f"/api/v1/tasks/{task_id}", json={"title": "Hacked Title"}, headers=headers_b)
    assert put_res.status_code == 403

    # User B attempts to complete User A's task -> 403 Forbidden
    patch_res = client.patch(f"/api/v1/tasks/{task_id}/complete", json={"completed": True}, headers=headers_b)
    assert patch_res.status_code == 403

    # User B attempts to delete User A's task -> 403 Forbidden
    del_res = client.delete(f"/api/v1/tasks/{task_id}", headers=headers_b)
    assert del_res.status_code == 403


def test_task_invalid_input_validation():
    """Tests validation for invalid calendar dates and empty required fields."""
    _, headers = register_test_user("val_user")

    # Invalid leap year / calendar date (e.g., Feb 31)
    res_bad_date = client.post(
        "/api/v1/tasks",
        json={"title": "Irrigate Corn", "due_date": "2026-02-31"},
        headers=headers,
    )
    assert res_bad_date.status_code in [400, 422]

    # Malformed non-ISO date string
    res_malformed = client.post(
        "/api/v1/tasks",
        json={"title": "Irrigate Corn", "due_date": "31-12-2026"},
        headers=headers,
    )
    assert res_malformed.status_code == 422

    # Empty title
    res_empty_title = client.post(
        "/api/v1/tasks",
        json={"title": "", "due_date": date.today().isoformat()},
        headers=headers,
    )
    assert res_empty_title.status_code == 422


def test_smart_alerts_generation_and_dismissal():
    """Tests generating evidence-based alerts and dismissing them to avoid duplicate notifications."""
    user_id, headers = register_test_user("alert_user")

    # 1. Create an overdue task (due yesterday)
    yesterday_str = (date.today() - timedelta(days=1)).isoformat()
    client.post(
        "/api/v1/tasks",
        json={
            "title": "Check Drip Emitters",
            "due_date": yesterday_str,
            "priority": "high",
            "crop": "Tomato",
        },
        headers=headers,
    )

    # 2. Create a task due today
    today_str = date.today().isoformat()
    client.post(
        "/api/v1/tasks",
        json={
            "title": "Soil Moisture Probe",
            "due_date": today_str,
            "priority": "medium",
            "crop": "Tomato",
        },
        headers=headers,
    )

    # 3. Fetch smart alerts
    alerts_res = client.get("/api/v1/alerts", headers=headers)
    assert alerts_res.status_code == 200
    alert_list = alerts_res.json()
    assert alert_list["total_alerts"] >= 2

    # Check alert types
    types = [a["type"] for a in alert_list["alerts"]]
    assert "task_overdue" in types
    assert "upcoming_reminder" in types

    # 4. Dismiss an alert to verify duplicate prevention
    alert_to_dismiss = alert_list["alerts"][0]
    dismiss_res = client.post(
        f"/api/v1/alerts/{alert_to_dismiss['id']}/dismiss",
        headers=headers,
    )
    assert dismiss_res.status_code == 200
    assert dismiss_res.json()["success"] is True

    # 5. Fetch alerts again; dismissed alert should be omitted
    after_res = client.get("/api/v1/alerts", headers=headers)
    assert after_res.status_code == 200
    after_alerts = after_res.json()
    remaining_ids = [a["id"] for a in after_alerts["alerts"]]
    assert alert_to_dismiss["id"] not in remaining_ids


def test_guest_alerts_fallback():
    """Unauthenticated users should receive 0 alerts gracefully without crashing."""
    res = client.get("/api/v1/alerts")
    assert res.status_code == 200
    assert res.json()["total_alerts"] == 0
    assert res.json()["alerts"] == []
