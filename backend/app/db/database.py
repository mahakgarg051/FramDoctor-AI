"""
FarmDoctor AI - Database Connection & Migration Layer
Provides thread-safe SQLite connection management, schema initialization,
and indexing for Users, Farms, Persistent Scan Records, and AI Assistant Conversations.
"""

import os
import sqlite3
import logging
from pathlib import Path
from contextlib import contextmanager
from typing import Generator

logger = logging.getLogger("farmdoctor.db")

# Default database location inside backend/data/farmdoctor.db
DEFAULT_DB_DIR = Path(__file__).resolve().parent.parent / "data"
DEFAULT_DB_PATH = DEFAULT_DB_DIR / "farmdoctor.db"


def get_db_path() -> Path:
    """Returns database file path, allowing override via environment variable."""
    env_path = os.getenv("DATABASE_PATH")
    if env_path:
        return Path(env_path)
    DEFAULT_DB_DIR.mkdir(parents=True, exist_ok=True)
    return DEFAULT_DB_PATH


@contextmanager
def get_db_connection() -> Generator[sqlite3.Connection, None, None]:
    """
    Context manager providing a configured SQLite connection.
    Enables Write-Ahead Logging (WAL) and foreign key constraints.
    """
    db_path = get_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path), timeout=15.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conn
        conn.commit()
    except Exception as exc:
        conn.rollback()
        logger.error(f"Database transaction error: {exc}", exc_info=True)
        raise
    finally:
        conn.close()


def init_db() -> None:
    """
    Initializes database schema with required tables and indexes if they do not exist.
    Safe to execute multiple times (idempotent).
    """
    db_path = get_db_path()
    logger.info(f"Initializing FarmDoctor database at: {db_path}")

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # 1. Users Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                full_name TEXT,
                created_at TEXT NOT NULL
            );
        """)

        # 2. User Tokens Table (Session Management)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_tokens (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)

        # 3. Farms Table (Personalized Farm Management)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS farms (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                location TEXT NOT NULL,
                crop_name TEXT NOT NULL,
                crop_variety TEXT,
                sowing_date TEXT,
                growth_stage TEXT NOT NULL,
                soil_type TEXT,
                irrigation_notes TEXT,
                area_acres REAL DEFAULT 1.0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)

        # 4. Scan Records Table (Persistent Diagnostic Scans)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS scan_records (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                farm_id TEXT,
                filename TEXT NOT NULL,
                image_path TEXT,
                crop TEXT NOT NULL,
                predicted_condition TEXT NOT NULL,
                confidence_percentage REAL NOT NULL,
                raw_class TEXT NOT NULL,
                all_predictions_json TEXT NOT NULL,
                disclaimers_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE SET NULL
            );
        """)

        # 5. Assistant Messages Table (Conversational History)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS assistant_messages (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                farm_id TEXT,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                citations_json TEXT,
                suggested_followups_json TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE SET NULL
            );
        """)

        # 6. Farming Tasks Table (Daily Farming Planner)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS farming_tasks (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                farm_id TEXT,
                title TEXT NOT NULL,
                description TEXT,
                crop TEXT,
                due_date TEXT NOT NULL,
                priority TEXT NOT NULL DEFAULT 'medium',
                category TEXT NOT NULL DEFAULT 'inspection',
                status TEXT NOT NULL DEFAULT 'pending',
                notes TEXT,
                completed_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE SET NULL
            );
        """)

        # 7. Dismissed Alerts Table (Smart Crop Alert Deduplication & History)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS dismissed_alerts (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                alert_key TEXT NOT NULL,
                dismissed_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE (user_id, alert_key)
            );
        """)

        # Performance & Integrity Indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_farms_user_id ON farms(user_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_scan_records_user_id ON scan_records(user_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_scan_records_farm_id ON scan_records(farm_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_scan_records_crop ON scan_records(crop);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_assistant_messages_user_id ON assistant_messages(user_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_farming_tasks_user_id ON farming_tasks(user_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_farming_tasks_farm_id ON farming_tasks(farm_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_farming_tasks_due_date ON farming_tasks(due_date);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_farming_tasks_status ON farming_tasks(status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_dismissed_alerts_user_key ON dismissed_alerts(user_id, alert_key);")

        # Soft schema migrations
        try:
            cursor.execute("ALTER TABLE assistant_messages ADD COLUMN language TEXT;")
        except Exception:
            pass

        logger.info("Database schema initialized successfully.")
