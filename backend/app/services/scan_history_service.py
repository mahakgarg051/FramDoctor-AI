"""
FarmDoctor AI - Persistent Scan History Service
Manages storage, retrieval, filtering, and deletion of diagnostic scan records.
Enforces strict user ownership and validates file upload paths.
"""

import os
import json
import uuid
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from fastapi import HTTPException, status

from backend.app.db.database import get_db_connection
from backend.app.schemas import ScanSaveRequest, PredictionItem

logger = logging.getLogger("farmdoctor.scan_history")

# Local uploads directory for leaf scan images
DEFAULT_UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"
DEFAULT_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


class ScanHistoryService:
    """Service layer for persistent leaf scan inspections."""

    @staticmethod
    def get_uploads_dir() -> Path:
        """Returns safe uploads directory path."""
        DEFAULT_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        return DEFAULT_UPLOADS_DIR

    @staticmethod
    def save_scan(
        user_id: str,
        data: ScanSaveRequest,
        image_bytes: Optional[bytes] = None
    ) -> Dict[str, Any]:
        """
        Saves a successful prediction into persistent database storage.
        Verifies farm ownership if a farm_id is provided.
        """
        scan_id = f"scan_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()
        image_rel_path = None

        # Verify farm ownership if farm_id is provided
        if data.farm_id:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT id, user_id FROM farms WHERE id = ?", (data.farm_id.strip(),))
                farm_row = cursor.fetchone()
                if not farm_row or farm_row["user_id"] != user_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid farm_id: the selected farm does not exist or does not belong to your account."
                    )

        # Securely store image bytes on filesystem if provided
        if image_bytes:
            safe_ext = Path(data.filename).suffix.lower()
            if safe_ext not in [".jpg", ".jpeg", ".png", ".webp"]:
                safe_ext = ".jpg"
            stored_filename = f"{user_id}_{scan_id}{safe_ext}"
            file_dest = ScanHistoryService.get_uploads_dir() / stored_filename
            try:
                with open(file_dest, "wb") as f:
                    f.write(image_bytes)
                image_rel_path = stored_filename
            except Exception as e:
                logger.error(f"Failed to persist scan image file: {e}", exc_info=True)

        all_preds_json = json.dumps([p.model_dump() for p in data.all_predictions])
        disclaimers_json = json.dumps(data.disclaimers)

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO scan_records (
                    id, user_id, farm_id, filename, image_path, crop,
                    predicted_condition, confidence_percentage, raw_class,
                    all_predictions_json, disclaimers_json, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    scan_id,
                    user_id,
                    data.farm_id.strip() if data.farm_id else None,
                    data.filename.strip(),
                    image_rel_path,
                    data.crop.strip(),
                    data.predicted_condition.strip(),
                    data.confidence_percentage,
                    data.raw_class.strip(),
                    all_preds_json,
                    disclaimers_json,
                    now_iso
                )
            )

        logger.info(f"Persisted scan record {scan_id} for user {user_id} (crop: {data.crop})")
        return ScanHistoryService.get_scan_by_id(user_id=user_id, scan_id=scan_id)

    @staticmethod
    def get_user_scans(
        user_id: str,
        crop: Optional[str] = None,
        predicted_class: Optional[str] = None,
        farm_id: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Returns all diagnostic scans owned by the user, with optional multi-parameter filtering.
        Never returns records belonging to other users.
        """
        query = """
            SELECT s.*, f.name as farm_name
            FROM scan_records s
            LEFT JOIN farms f ON f.id = s.farm_id
            WHERE s.user_id = ?
        """
        params: List[Any] = [user_id]

        if crop and crop.lower() != "all":
            query += " AND LOWER(s.crop) = LOWER(?)"
            params.append(crop.strip())

        if predicted_class and predicted_class.strip():
            query += " AND (LOWER(s.predicted_condition) LIKE ? OR LOWER(s.raw_class) LIKE ?)"
            term = f"%{predicted_class.strip().lower()}%"
            params.extend([term, term])

        if farm_id and farm_id.strip():
            query += " AND s.farm_id = ?"
            params.append(farm_id.strip())

        if date_from and date_from.strip():
            query += " AND s.created_at >= ?"
            params.append(date_from.strip())

        if date_to and date_to.strip():
            query += " AND s.created_at <= ?"
            params.append(date_to.strip() + "T23:59:59")

        query += " ORDER BY s.created_at DESC"

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, tuple(params))
            rows = cursor.fetchall()

        results = []
        for row in rows:
            rec = dict(row)
            rec["all_predictions"] = [
                PredictionItem(**item) for item in json.loads(rec["all_predictions_json"])
            ]
            rec["disclaimers"] = json.loads(rec["disclaimers_json"])
            rec["image_url"] = f"/api/v1/scans/{rec['id']}/image" if rec.get("image_path") else None
            results.append(rec)
        return results

    @staticmethod
    def get_scan_by_id(user_id: str, scan_id: str) -> Dict[str, Any]:
        """
        Retrieves a single scan record with strict user ownership enforcement.
        Raises 404 if record doesn't exist, 403 if owned by another user.
        """
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT s.*, f.name as farm_name
                FROM scan_records s
                LEFT JOIN farms f ON f.id = s.farm_id
                WHERE s.id = ?
                """,
                (scan_id.strip(),)
            )
            row = cursor.fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Scan record '{scan_id}' was not found."
            )

        if row["user_id"] != user_id:
            logger.warning(
                f"Unauthorized scan access attempt: user {user_id} tried to read scan {scan_id} owned by {row['user_id']}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this scan record."
            )

        rec = dict(row)
        rec["all_predictions"] = [
            PredictionItem(**item) for item in json.loads(rec["all_predictions_json"])
        ]
        rec["disclaimers"] = json.loads(rec["disclaimers_json"])
        rec["image_url"] = f"/api/v1/scans/{rec['id']}/image" if rec.get("image_path") else None
        return rec

    @staticmethod
    def delete_scan(user_id: str, scan_id: str) -> bool:
        """Deletes a scan record and its associated image file with ownership check."""
        scan = ScanHistoryService.get_scan_by_id(user_id=user_id, scan_id=scan_id)

        # Delete image file if present
        if scan.get("image_path"):
            img_file = ScanHistoryService.get_uploads_dir() / scan["image_path"]
            if img_file.exists():
                try:
                    img_file.unlink()
                except Exception as e:
                    logger.warning(f"Failed to delete scan image file: {e}")

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM scan_records WHERE id = ? AND user_id = ?", (scan_id, user_id))
            deleted = cursor.rowcount > 0

        logger.info(f"Deleted scan record {scan_id} for user {user_id}")
        return deleted

    @staticmethod
    def get_scan_image_path(user_id: str, scan_id: str) -> Path:
        """Returns verified safe image file path for a scan owned by the user."""
        scan = ScanHistoryService.get_scan_by_id(user_id=user_id, scan_id=scan_id)
        if not scan.get("image_path"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No image file is stored for this scan record."
            )

        img_file = ScanHistoryService.get_uploads_dir() / scan["image_path"]
        # Path traversal guard
        if not str(img_file.resolve()).startswith(str(ScanHistoryService.get_uploads_dir().resolve())):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid file path."
            )

        if not img_file.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Scan image file not found on disk."
            )
        return img_file
