"""
FarmDoctor AI - Personalized Farm Management Service
Handles CRUD operations for farm plots with strict user ownership enforcement.
Ensures farmers can only view, edit, or delete their own farm records.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from fastapi import HTTPException, status

from backend.app.db.database import get_db_connection
from backend.app.schemas import FarmCreateRequest, FarmUpdateRequest

logger = logging.getLogger("farmdoctor.farm_service")


class FarmService:
    """Service layer for personalized farm plot operations."""

    @staticmethod
    def create_farm(user_id: str, data: FarmCreateRequest) -> Dict[str, Any]:
        """Creates a new farm plot associated with the authenticated user."""
        farm_id = f"farm_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO farms (
                    id, user_id, name, location, crop_name, crop_variety,
                    sowing_date, growth_stage, soil_type, irrigation_notes,
                    area_acres, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    farm_id,
                    user_id,
                    data.name.strip(),
                    data.location.strip(),
                    data.crop_name.strip(),
                    data.crop_variety.strip() if data.crop_variety else None,
                    data.sowing_date.strip() if data.sowing_date else None,
                    data.growth_stage.strip() if data.growth_stage else "Vegetative",
                    data.soil_type.strip() if data.soil_type else None,
                    data.irrigation_notes.strip() if data.irrigation_notes else None,
                    data.area_acres or 1.0,
                    now_iso,
                    now_iso
                )
            )

        logger.info(f"Created farm '{data.name}' ({farm_id}) for user {user_id}")
        return FarmService.get_farm_by_id(user_id=user_id, farm_id=farm_id)

    @staticmethod
    def get_user_farms(user_id: str) -> List[Dict[str, Any]]:
        """Returns all farm plots owned by the authenticated user with scan counts."""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT f.*, COUNT(s.id) as scan_count
                FROM farms f
                LEFT JOIN scan_records s ON s.farm_id = f.id
                WHERE f.user_id = ?
                GROUP BY f.id
                ORDER BY f.created_at DESC
                """,
                (user_id,)
            )
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    @staticmethod
    def get_farm_by_id(user_id: str, farm_id: str) -> Dict[str, Any]:
        """
        Retrieves a farm plot and enforces strict ownership.
        Returns 404 if not found, 403 if owned by another user.
        """
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT f.*, COUNT(s.id) as scan_count
                FROM farms f
                LEFT JOIN scan_records s ON s.farm_id = f.id
                WHERE f.id = ?
                GROUP BY f.id
                """,
                (farm_id.strip(),)
            )
            row = cursor.fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Farm plot '{farm_id}' was not found."
            )

        if row["user_id"] != user_id:
            logger.warning(
                f"Unauthorized farm access attempt: user {user_id} tried to access farm {farm_id} owned by {row['user_id']}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access or modify this farm plot."
            )

        return dict(row)

    @staticmethod
    def update_farm(user_id: str, farm_id: str, data: FarmUpdateRequest) -> Dict[str, Any]:
        """
        Updates an existing farm plot with ownership verification.
        Only fields provided in update payload are modified.
        """
        # Enforce ownership check first
        FarmService.get_farm_by_id(user_id=user_id, farm_id=farm_id)

        update_fields = []
        params = []
        now_iso = datetime.now(timezone.utc).isoformat()

        if data.name is not None:
            update_fields.append("name = ?")
            params.append(data.name.strip())
        if data.location is not None:
            update_fields.append("location = ?")
            params.append(data.location.strip())
        if data.crop_name is not None:
            update_fields.append("crop_name = ?")
            params.append(data.crop_name.strip())
        if data.crop_variety is not None:
            update_fields.append("crop_variety = ?")
            params.append(data.crop_variety.strip() if data.crop_variety else None)
        if data.sowing_date is not None:
            update_fields.append("sowing_date = ?")
            params.append(data.sowing_date.strip() if data.sowing_date else None)
        if data.growth_stage is not None:
            update_fields.append("growth_stage = ?")
            params.append(data.growth_stage.strip())
        if data.soil_type is not None:
            update_fields.append("soil_type = ?")
            params.append(data.soil_type.strip() if data.soil_type else None)
        if data.irrigation_notes is not None:
            update_fields.append("irrigation_notes = ?")
            params.append(data.irrigation_notes.strip() if data.irrigation_notes else None)
        if data.area_acres is not None:
            update_fields.append("area_acres = ?")
            params.append(data.area_acres)

        if not update_fields:
            return FarmService.get_farm_by_id(user_id=user_id, farm_id=farm_id)

        update_fields.append("updated_at = ?")
        params.append(now_iso)
        params.append(farm_id)
        params.append(user_id)

        with get_db_connection() as conn:
            cursor = conn.cursor()
            query = f"""
                UPDATE farms
                SET {", ".join(update_fields)}
                WHERE id = ? AND user_id = ?
            """
            cursor.execute(query, tuple(params))

        logger.info(f"Updated farm plot {farm_id} for user {user_id}")
        return FarmService.get_farm_by_id(user_id=user_id, farm_id=farm_id)

    @staticmethod
    def delete_farm(user_id: str, farm_id: str) -> bool:
        """Deletes a farm plot with ownership verification."""
        # Enforce ownership check
        FarmService.get_farm_by_id(user_id=user_id, farm_id=farm_id)

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM farms WHERE id = ? AND user_id = ?", (farm_id, user_id))
            deleted = cursor.rowcount > 0

        logger.info(f"Deleted farm plot {farm_id} for user {user_id}")
        return deleted
