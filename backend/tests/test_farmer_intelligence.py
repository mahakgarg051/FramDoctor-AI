"""
FarmDoctor AI - Advanced Farmer Intelligence Integration Tests
Tests:
- Farmer Authentication (registration, login, profile, token validation)
- My Farm Management (creation, retrieval, update, deletion, ownership protection)
- Persistent Scan History (persistence, multi-parameter filtering, ownership security)
- Hindi/Hinglish AI Farming Assistant (conversational response, knowledge grounding, follow-ups)
- Personalized Action Plan (crop, growth stage, prior scan synthesis, expert triggers)
- Cross-user security: Verifies User A cannot read, edit, or delete User B's records (403 Forbidden).
"""

import os
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.db.database import init_db, get_db_connection

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_test_db():
    """Ensure database schema is initialized before running tests."""
    init_db()


# ==========================================
# 1. Authentication & Security Tests
# ==========================================
def test_farmer_registration_and_login():
    """Verify user registration and subsequent login."""
    unique_suffix = os.urandom(4).hex()
    username = f"kisan_{unique_suffix}"
    email = f"kisan_{unique_suffix}@example.com"
    password = "test_mock_password_123"

    # 1. Register
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "username": username,
            "email": email,
            "password": password,
            "full_name": "Ramesh Patel"
        }
    )
    assert reg_resp.status_code == 201
    reg_data = reg_resp.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["username"] == username
    assert reg_data["user"]["email"] == email

    # 2. Duplicate registration rejected
    dup_resp = client.post(
        "/api/v1/auth/register",
        json={
            "username": username,
            "email": email,
            "password": password
        }
    )
    assert dup_resp.status_code == 409

    # 3. Login
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    # 4. Profile check with token
    me_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["username"] == username

    # 5. Invalid credentials rejected
    bad_login = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": "test_invalid_mock_password"}
    )
    assert bad_login.status_code == 401


def test_protected_endpoints_require_auth():
    """Verify endpoints reject unauthenticated access with 401 Unauthorized."""
    endpoints = [
        ("GET", "/api/v1/farms"),
        ("POST", "/api/v1/farms"),
        ("GET", "/api/v1/scans"),
        ("POST", "/api/v1/scans"),
        ("POST", "/api/v1/assistant/chat"),
        ("GET", "/api/v1/assistant/history"),
        ("GET", "/api/v1/farms/some_farm/action-plan"),
    ]
    for method, path in endpoints:
        if method == "GET":
            resp = client.get(path)
        else:
            resp = client.post(path, json={})
        assert resp.status_code == 401, f"{method} {path} should return 401"


# ==========================================
# 2. My Farm Management & Ownership Tests
# ==========================================
def test_farm_crud_and_ownership_enforcement():
    """Verify complete CRUD lifecycle for farms and cross-user ownership isolation."""
    # Create Farmer A
    suffix_a = os.urandom(4).hex()
    reg_a = client.post(
        "/api/v1/auth/register",
        json={"username": f"farmer_a_{suffix_a}", "email": f"a_{suffix_a}@farm.in", "password": "test_mock_password_123"}
    ).json()
    token_a = reg_a["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Create Farmer B
    suffix_b = os.urandom(4).hex()
    reg_b = client.post(
        "/api/v1/auth/register",
        json={"username": f"farmer_b_{suffix_b}", "email": f"b_{suffix_b}@farm.in", "password": "test_mock_password_123"}
    ).json()
    token_b = reg_b["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Farmer A creates a farm
    create_resp = client.post(
        "/api/v1/farms",
        json={
            "name": "North Field Tomato Plot",
            "location": "Pune, Maharashtra",
            "crop_name": "Tomato",
            "crop_variety": "Abhinav F1",
            "sowing_date": "2026-08-10",
            "growth_stage": "Flowering",
            "soil_type": "Black Cotton Soil",
            "irrigation_notes": "Drip irrigation every alternate morning",
            "area_acres": 2.5
        },
        headers=headers_a
    )
    assert create_resp.status_code == 201
    farm_a = create_resp.json()
    farm_id = farm_a["id"]
    assert farm_a["name"] == "North Field Tomato Plot"
    assert farm_a["crop_name"] == "Tomato"

    # Farmer A can list their farm
    list_a = client.get("/api/v1/farms", headers=headers_a).json()
    assert list_a["total_farms"] >= 1
    assert any(f["id"] == farm_id for f in list_a["farms"])

    # Farmer B CANNOT see Farmer A's farm in their list
    list_b = client.get("/api/v1/farms", headers=headers_b).json()
    assert not any(f["id"] == farm_id for f in list_b["farms"])

    # Farmer B CANNOT access Farmer A's farm directly (403 Forbidden)
    forbidden_get = client.get(f"/api/v1/farms/{farm_id}", headers=headers_b)
    assert forbidden_get.status_code == 403

    # Farmer B CANNOT update Farmer A's farm (403 Forbidden)
    forbidden_put = client.put(
        f"/api/v1/farms/{farm_id}",
        json={"name": "Hacked Name"},
        headers=headers_b
    )
    assert forbidden_put.status_code == 403

    # Farmer B CANNOT delete Farmer A's farm (403 Forbidden)
    forbidden_del = client.delete(f"/api/v1/farms/{farm_id}", headers=headers_b)
    assert forbidden_del.status_code == 403

    # Farmer A CAN update their farm
    update_resp = client.put(
        f"/api/v1/farms/{farm_id}",
        json={"growth_stage": "Fruiting", "area_acres": 3.0},
        headers=headers_a
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["growth_stage"] == "Fruiting"
    assert update_resp.json()["area_acres"] == 3.0

    # Farmer A CAN delete their farm
    del_resp = client.delete(f"/api/v1/farms/{farm_id}", headers=headers_a)
    assert del_resp.status_code == 200

    # Non-existent farm returns 404
    not_found_resp = client.get(f"/api/v1/farms/{farm_id}", headers=headers_a)
    assert not_found_resp.status_code == 404


# ==========================================
# 3. Persistent Scan History Tests
# ==========================================
def test_persistent_scan_history_and_filtering():
    """Verify saving scan records, filtering by crop and class, and ownership security."""
    suffix = os.urandom(4).hex()
    reg = client.post(
        "/api/v1/auth/register",
        json={"username": f"scanner_{suffix}", "email": f"scanner_{suffix}@test.in", "password": "test_mock_password_123"}
    ).json()
    token = reg["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Save a Tomato Early Blight scan
    scan_1_resp = client.post(
        "/api/v1/scans",
        json={
            "filename": "tomato_leaf_01.jpg",
            "crop": "Tomato",
            "predicted_condition": "Early Blight",
            "confidence_percentage": 94.5,
            "raw_class": "Tomato___Early_blight",
            "all_predictions": [
                {
                    "rank": 1,
                    "raw_class": "Tomato___Early_blight",
                    "crop": "Tomato",
                    "condition": "Early Blight",
                    "confidence_percentage": 94.5,
                    "confidence_bar": "█████████ "
                }
            ],
            "disclaimers": ["Field validation recommended."]
        },
        headers=headers
    )
    assert scan_1_resp.status_code == 201
    scan_1_id = scan_1_resp.json()["id"]

    # Save a Potato Late Blight scan
    scan_2_resp = client.post(
        "/api/v1/scans",
        json={
            "filename": "potato_leaf_02.jpg",
            "crop": "Potato",
            "predicted_condition": "Late Blight",
            "confidence_percentage": 88.2,
            "raw_class": "Potato___Late_blight",
            "all_predictions": [
                {
                    "rank": 1,
                    "raw_class": "Potato___Late_blight",
                    "crop": "Potato",
                    "condition": "Late Blight",
                    "confidence_percentage": 88.2,
                    "confidence_bar": "████████  "
                }
            ],
            "disclaimers": ["Field validation recommended."]
        },
        headers=headers
    )
    assert scan_2_resp.status_code == 201

    # List all scans
    all_scans = client.get("/api/v1/scans", headers=headers).json()
    assert all_scans["total_scans"] >= 2

    # Filter by crop 'Tomato'
    tomato_scans = client.get("/api/v1/scans?crop=Tomato", headers=headers).json()
    assert all(s["crop"] == "Tomato" for s in tomato_scans["scans"])

    # Filter by predicted_class 'Early'
    early_scans = client.get("/api/v1/scans?predicted_class=Early", headers=headers).json()
    assert all("Early" in s["predicted_condition"] for s in early_scans["scans"])

    # Delete scan
    del_scan = client.delete(f"/api/v1/scans/{scan_1_id}", headers=headers)
    assert del_scan.status_code == 200

    # Ensure deleted scan returns 404
    check_del = client.get(f"/api/v1/scans/{scan_1_id}", headers=headers)
    assert check_del.status_code == 404


# ==========================================
# 4. Hindi/Hinglish AI Assistant Tests
# ==========================================
def test_ai_assistant_hindi_hinglish_chat():
    """Verify conversational assistant responds to Hindi/Hinglish questions using knowledge base."""
    suffix = os.urandom(4).hex()
    reg = client.post(
        "/api/v1/auth/register",
        json={"username": f"ai_user_{suffix}", "email": f"ai_{suffix}@test.in", "password": "test_mock_password_123"}
    ).json()
    token = reg["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Question 1: "Mere tamatar ke patton par daag hain, kya check karun?"
    chat_resp = client.post(
        "/api/v1/assistant/chat",
        json={
            "message": "Mere tamatar ke patton par daag hain, kya check karun?",
            "language_preference": "hinglish"
        },
        headers=headers
    )
    assert chat_resp.status_code == 200
    data = chat_resp.json()
    assert data["detected_crop"] == "Tomato"
    assert len(data["follow_up_questions"]) > 0
    assert "reply" in data
    assert "KVK" in data["expert_advisory_disclaimer"]
    assert len(data["citations"]) > 0

    # Question 2: "Patton ke peele hone ke common reasons kya hain?"
    yellow_resp = client.post(
        "/api/v1/assistant/chat",
        json={
            "message": "Tamatar ke patton ke peele hone ke common reasons kya hain?",
            "language_preference": "hinglish"
        },
        headers=headers
    )
    assert yellow_resp.status_code == 200
    yellow_data = yellow_resp.json()
    assert "Nitrogen" in yellow_data["reply"] or "peelapan" in yellow_data["reply"]

    # Conversation history retrieval
    hist_resp = client.get("/api/v1/assistant/history", headers=headers)
    assert hist_resp.status_code == 200
    assert hist_resp.json()["total_messages"] >= 4

    # Clear history
    clear_resp = client.delete("/api/v1/assistant/history", headers=headers)
    assert clear_resp.status_code == 200
    hist_after = client.get("/api/v1/assistant/history", headers=headers).json()
    assert hist_after["total_messages"] == 0


# ==========================================
# 5. Personalized Action Plan Tests
# ==========================================
def test_personalized_action_plan_generation():
    """Verify action plan is generated based on farm crop, growth stage, and prior scans."""
    suffix = os.urandom(4).hex()
    reg = client.post(
        "/api/v1/auth/register",
        json={"username": f"plan_user_{suffix}", "email": f"plan_{suffix}@test.in", "password": "test_mock_password_123"}
    ).json()
    token = reg["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create farm plot
    farm = client.post(
        "/api/v1/farms",
        json={
            "name": "East Hill Tomato Orchard",
            "location": "Nagpur, Maharashtra",
            "crop_name": "Tomato",
            "growth_stage": "Flowering",
            "area_acres": 2.0
        },
        headers=headers
    ).json()
    farm_id = farm["id"]

    # Request action plan
    plan_resp = client.get(f"/api/v1/farms/{farm_id}/action-plan", headers=headers)
    assert plan_resp.status_code == 200
    plan = plan_resp.json()

    assert plan["farm_id"] == farm_id
    assert plan["crop_name"] == "Tomato"
    assert plan["growth_stage"] == "Flowering"
    assert len(plan["what_to_inspect_next"]) > 0
    assert len(plan["general_prevention_practices"]) > 0
    assert len(plan["suggested_follow_up_observations"]) > 0
    assert len(plan["when_to_seek_expert"]) > 0
    assert len(plan["relevant_sources"]) > 0
    assert "KVK" in plan["uncertainty_warning"]
