"""
FarmDoctor AI - Daily Farming Planner Service
Provides persistent task scheduling, crop inspection tracking, task completion,
and strict farmer ownership enforcement.
"""

import uuid
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status

from backend.app.db.database import get_db_connection
from backend.app.schemas import (
    TaskCreateRequest,
    TaskUpdateRequest,
    TaskResponse,
    TaskListResponse,
)

logger = logging.getLogger("farmdoctor.planner")


class PlannerService:
    """Manages farmer crop care tasks, upcoming inspections, and daily reminders."""

    @staticmethod
    def _validate_date(date_str: str) -> None:
        """Ensures date_str is a legitimate calendar date in YYYY-MM-DD format."""
        try:
            datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid calendar date '{date_str}'. Expected format is YYYY-MM-DD.",
            )

    @classmethod
    def create_task(cls, user_id: str, data: TaskCreateRequest) -> TaskResponse:
        """Creates and stores a new farming task with ownership validation."""
        cls._validate_date(data.due_date)

        farm_name = None
        now_iso = datetime.utcnow().isoformat()
        task_id = str(uuid.uuid4())

        with get_db_connection() as conn:
            # If farm_id is provided, verify farmer ownership
            if data.farm_id:
                farm_row = conn.execute(
                    "SELECT id, user_id, name, crop_name FROM farms WHERE id = ?;",
                    (data.farm_id,),
                ).fetchone()

                if not farm_row:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Associated farm plot not found.",
                    )
                if farm_row["user_id"] != user_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied. You do not own this farm plot.",
                    )
                farm_name = farm_row["name"]
                if not data.crop and farm_row["crop_name"]:
                    data.crop = farm_row["crop_name"]

            conn.execute(
                """
                INSERT INTO farming_tasks (
                    id, user_id, farm_id, title, description, crop,
                    due_date, priority, category, status, notes,
                    completed_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    task_id,
                    user_id,
                    data.farm_id,
                    data.title.strip(),
                    data.description.strip() if data.description else None,
                    data.crop.strip() if data.crop else None,
                    data.due_date,
                    data.priority.lower() if data.priority else "medium",
                    data.category.lower() if data.category else "inspection",
                    "pending",
                    data.notes.strip() if data.notes else None,
                    None,
                    now_iso,
                    now_iso,
                ),
            )
            conn.commit()

        logger.info(f"Task created: {task_id} ('{data.title}') for user {user_id}")
        return TaskResponse(
            id=task_id,
            user_id=user_id,
            farm_id=data.farm_id,
            farm_name=farm_name,
            title=data.title.strip(),
            description=data.description.strip() if data.description else None,
            crop=data.crop.strip() if data.crop else None,
            due_date=data.due_date,
            priority=data.priority.lower() if data.priority else "medium",
            category=data.category.lower() if data.category else "inspection",
            status="pending",
            notes=data.notes.strip() if data.notes else None,
            completed_at=None,
            created_at=now_iso,
            updated_at=now_iso,
        )

    @classmethod
    def get_user_tasks(
        cls,
        user_id: str,
        farm_id: Optional[str] = None,
        status_filter: Optional[str] = None,
        date_filter: Optional[str] = None,
    ) -> TaskListResponse:
        """Retrieves user farming tasks with optional filtering by farm, status, or date."""
        query = """
            SELECT t.*, f.name AS farm_name
            FROM farming_tasks t
            LEFT JOIN farms f ON t.farm_id = f.id
            WHERE t.user_id = ?
        """
        params: List[Any] = [user_id]

        if farm_id:
            query += " AND t.farm_id = ?"
            params.append(farm_id)

        if status_filter:
            query += " AND t.status = ?"
            params.append(status_filter.lower())

        if date_filter:
            query += " AND t.due_date = ?"
            params.append(date_filter)

        query += " ORDER BY CASE WHEN t.status = 'pending' THEN 0 ELSE 1 END, t.due_date ASC, t.created_at DESC;"

        with get_db_connection() as conn:
            rows = conn.execute(query, params).fetchall()

        tasks: List[TaskResponse] = []
        pending_count = 0
        completed_count = 0

        for r in rows:
            is_pending = r["status"] == "pending"
            if is_pending:
                pending_count += 1
            elif r["status"] == "completed":
                completed_count += 1

            tasks.append(
                TaskResponse(
                    id=r["id"],
                    user_id=r["user_id"],
                    farm_id=r["farm_id"],
                    farm_name=r["farm_name"],
                    title=r["title"],
                    description=r["description"],
                    crop=r["crop"],
                    due_date=r["due_date"],
                    priority=r["priority"],
                    category=r["category"],
                    status=r["status"],
                    notes=r["notes"],
                    completed_at=r["completed_at"],
                    created_at=r["created_at"],
                    updated_at=r["updated_at"],
                )
            )

        return TaskListResponse(
            total_tasks=len(tasks),
            pending_count=pending_count,
            completed_count=completed_count,
            tasks=tasks,
        )

    @classmethod
    def get_task_by_id(cls, task_id: str, user_id: str) -> TaskResponse:
        """Fetches a single task by ID, enforcing user ownership."""
        with get_db_connection() as conn:
            row = conn.execute(
                """
                SELECT t.*, f.name AS farm_name
                FROM farming_tasks t
                LEFT JOIN farms f ON t.farm_id = f.id
                WHERE t.id = ?;
                """,
                (task_id,),
            ).fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Farming task not found.",
            )

        if row["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You do not own this task record.",
            )

        return TaskResponse(
            id=row["id"],
            user_id=row["user_id"],
            farm_id=row["farm_id"],
            farm_name=row["farm_name"],
            title=row["title"],
            description=row["description"],
            crop=row["crop"],
            due_date=row["due_date"],
            priority=row["priority"],
            category=row["category"],
            status=row["status"],
            notes=row["notes"],
            completed_at=row["completed_at"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    @classmethod
    def update_task(cls, task_id: str, user_id: str, data: TaskUpdateRequest) -> TaskResponse:
        """Updates fields of an existing task with strict ownership checks."""
        # Check task existence & ownership
        existing = cls.get_task_by_id(task_id, user_id)

        if data.due_date is not None:
            cls._validate_date(data.due_date)

        new_farm_name = existing.farm_name
        farm_id_to_save = existing.farm_id

        with get_db_connection() as conn:
            # If changing farm_id, verify ownership of target farm
            if data.farm_id is not None and data.farm_id != existing.farm_id:
                if data.farm_id != "":
                    farm_row = conn.execute(
                        "SELECT id, user_id, name FROM farms WHERE id = ?;",
                        (data.farm_id,),
                    ).fetchone()
                    if not farm_row:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail="Target farm not found.",
                        )
                    if farm_row["user_id"] != user_id:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Access denied to target farm.",
                        )
                    new_farm_name = farm_row["name"]
                    farm_id_to_save = data.farm_id
                else:
                    farm_id_to_save = None
                    new_farm_name = None

            now_iso = datetime.utcnow().isoformat()
            title = data.title.strip() if data.title is not None else existing.title
            description = data.description.strip() if data.description is not None else existing.description
            crop = data.crop.strip() if data.crop is not None else existing.crop
            due_date = data.due_date if data.due_date is not None else existing.due_date
            priority = data.priority.lower() if data.priority is not None else existing.priority
            category = data.category.lower() if data.category is not None else existing.category
            new_status = data.status.lower() if data.status is not None else existing.status
            notes = data.notes.strip() if data.notes is not None else existing.notes

            completed_at = existing.completed_at
            if new_status == "completed" and existing.status != "completed":
                completed_at = now_iso
            elif new_status == "pending":
                completed_at = None

            conn.execute(
                """
                UPDATE farming_tasks
                SET farm_id = ?, title = ?, description = ?, crop = ?,
                    due_date = ?, priority = ?, category = ?, status = ?,
                    notes = ?, completed_at = ?, updated_at = ?
                WHERE id = ? AND user_id = ?;
                """,
                (
                    farm_id_to_save,
                    title,
                    description,
                    crop,
                    due_date,
                    priority,
                    category,
                    new_status,
                    notes,
                    completed_at,
                    now_iso,
                    task_id,
                    user_id,
                ),
            )
            conn.commit()

        logger.info(f"Task updated: {task_id} by user {user_id}")
        return TaskResponse(
            id=task_id,
            user_id=user_id,
            farm_id=farm_id_to_save,
            farm_name=new_farm_name,
            title=title,
            description=description,
            crop=crop,
            due_date=due_date,
            priority=priority,
            category=category,
            status=new_status,
            notes=notes,
            completed_at=completed_at,
            created_at=existing.created_at,
            updated_at=now_iso,
        )

    @classmethod
    def toggle_complete(cls, task_id: str, user_id: str, completed: bool = True) -> TaskResponse:
        """Toggles a task between 'completed' and 'pending'."""
        existing = cls.get_task_by_id(task_id, user_id)
        now_iso = datetime.utcnow().isoformat()

        new_status = "completed" if completed else "pending"
        completed_at = now_iso if completed else None

        with get_db_connection() as conn:
            conn.execute(
                """
                UPDATE farming_tasks
                SET status = ?, completed_at = ?, updated_at = ?
                WHERE id = ? AND user_id = ?;
                """,
                (new_status, completed_at, now_iso, task_id, user_id),
            )
            conn.commit()

        logger.info(f"Task status toggled: {task_id} -> {new_status}")
        return TaskResponse(
            id=task_id,
            user_id=user_id,
            farm_id=existing.farm_id,
            farm_name=existing.farm_name,
            title=existing.title,
            description=existing.description,
            crop=existing.crop,
            due_date=existing.due_date,
            priority=existing.priority,
            category=existing.category,
            status=new_status,
            notes=existing.notes,
            completed_at=completed_at,
            created_at=existing.created_at,
            updated_at=now_iso,
        )

    @classmethod
    def delete_task(cls, task_id: str, user_id: str) -> None:
        """Deletes a task after verifying ownership."""
        cls.get_task_by_id(task_id, user_id)

        with get_db_connection() as conn:
            conn.execute(
                "DELETE FROM farming_tasks WHERE id = ? AND user_id = ?;",
                (task_id, user_id),
            )
            conn.commit()

        logger.info(f"Task deleted: {task_id} by user {user_id}")
