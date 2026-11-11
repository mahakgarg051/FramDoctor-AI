"""
FarmDoctor AI - Farmer Authentication & Security Service
Implements bcrypt password hashing, cryptographic bearer session tokens,
and strict ownership validation for protected farmer endpoints.
"""

import uuid
import secrets
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

import uuid
import secrets
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

import bcrypt
from fastapi import Header, HTTPException, status

from backend.app.db.database import get_db_connection

logger = logging.getLogger("farmdoctor.auth")

# Session token expiration duration
TOKEN_EXPIRE_DAYS = 30


class AuthService:
    """Manages farmer registration, secure password hashing, and token authentication."""

    @staticmethod
    def hash_password(password: str) -> str:
        """Hashes plaintext password with bcrypt salt (safe 72-byte limit)."""
        pw_bytes = password.encode("utf-8")[:72]
        return bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode("utf-8")

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verifies plaintext password against stored bcrypt hash."""
        try:
            pw_bytes = plain_password.encode("utf-8")[:72]
            return bcrypt.checkpw(pw_bytes, hashed_password.encode("utf-8"))
        except Exception:
            return False

    @staticmethod
    def register_user(
        username: str,
        email: str,
        password: str,
        full_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Registers a new farmer account with unique username and email.
        Returns newly issued access token and sanitized user profile.
        """
        username_clean = username.strip().lower()
        email_clean = email.strip().lower()

        with get_db_connection() as conn:
            cursor = conn.cursor()

            # Check for existing username or email
            cursor.execute(
                "SELECT id FROM users WHERE username = ? OR email = ?",
                (username_clean, email_clean)
            )
            existing = cursor.fetchone()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A farmer account with this username or email already exists."
                )

            user_id = str(uuid.uuid4())
            hashed = AuthService.hash_password(password)
            now_iso = datetime.now(timezone.utc).isoformat()

            cursor.execute(
                """
                INSERT INTO users (id, username, email, hashed_password, full_name, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (user_id, username_clean, email_clean, hashed, full_name.strip() if full_name else None, now_iso)
            )

            # Issue session token
            token = secrets.token_urlsafe(32)
            expires_at = (datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS)).isoformat()
            cursor.execute(
                """
                INSERT INTO user_tokens (token, user_id, created_at, expires_at)
                VALUES (?, ?, ?, ?)
                """,
                (token, user_id, now_iso, expires_at)
            )

        logger.info(f"Registered new farmer user: {username_clean} ({user_id})")
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "username": username_clean,
                "email": email_clean,
                "full_name": full_name,
                "created_at": now_iso
            }
        }

    @staticmethod
    def authenticate_user(username_or_email: str, password: str) -> Dict[str, Any]:
        """
        Authenticates a farmer by username or email.
        Returns a new session token upon successful password verification.
        """
        ident = username_or_email.strip().lower()

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, username, email, hashed_password, full_name, created_at
                FROM users
                WHERE username = ? OR email = ?
                """,
                (ident, ident)
            )
            row = cursor.fetchone()
            if not row or not AuthService.verify_password(password, row["hashed_password"]):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid username or password."
                )

            user_id = row["id"]
            token = secrets.token_urlsafe(32)
            now_iso = datetime.now(timezone.utc).isoformat()
            expires_at = (datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS)).isoformat()

            cursor.execute(
                """
                INSERT INTO user_tokens (token, user_id, created_at, expires_at)
                VALUES (?, ?, ?, ?)
                """,
                (token, user_id, now_iso, expires_at)
            )

        logger.info(f"Farmer logged in successfully: {row['username']} ({user_id})")
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": row["id"],
                "username": row["username"],
                "email": row["email"],
                "full_name": row["full_name"],
                "created_at": row["created_at"]
            }
        }

    @staticmethod
    def get_user_by_token(token: str) -> Optional[Dict[str, Any]]:
        """Validates token and returns user profile if valid and non-expired."""
        if not token:
            return None

        clean_token = token.strip()
        now_iso = datetime.now(timezone.utc).isoformat()

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT u.id, u.username, u.email, u.full_name, u.created_at, t.expires_at
                FROM user_tokens t
                JOIN users u ON u.id = t.user_id
                WHERE t.token = ?
                """,
                (clean_token,)
            )
            row = cursor.fetchone()
            if not row:
                return None

            # Check expiration
            if row["expires_at"] < now_iso:
                cursor.execute("DELETE FROM user_tokens WHERE token = ?", (clean_token,))
                return None

            return {
                "id": row["id"],
                "username": row["username"],
                "email": row["email"],
                "full_name": row["full_name"],
                "created_at": row["created_at"]
            }

    @staticmethod
    def logout_user(token: str) -> bool:
        """Invalidates a session token."""
        if not token:
            return False
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM user_tokens WHERE token = ?", (token.strip(),))
            return cursor.rowcount > 0


# ==========================================
# FastAPI Security Dependencies
# ==========================================
def extract_bearer_token(authorization: Optional[str]) -> Optional[str]:
    """Extracts raw token string from Authorization header."""
    if not authorization:
        return None
    parts = authorization.strip().split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    if len(parts) == 1:
        return parts[0]
    return None


async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    FastAPI dependency that enforces authentication.
    Raises 401 Unauthorized if token is missing, invalid, or expired.
    """
    token = extract_bearer_token(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user = AuthService.get_user_by_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or token is invalid. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user


async def get_optional_current_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """
    FastAPI dependency for endpoints that support both authenticated and guest access.
    """
    token = extract_bearer_token(authorization)
    if not token:
        return None
    return AuthService.get_user_by_token(token)
