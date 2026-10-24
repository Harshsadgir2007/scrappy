"""
Notifications router — retrieve in-app alerts, mark as read, get unread badge count.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.notification import NotificationResponse, UnreadCountResponse
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationResponse])
def get_notifications(
    limit: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve recent notifications for the authenticated company."""
    if not current_user.company_id:
        return []
    return notification_service.get_company_notifications(
        db=db,
        company_id=current_user.company_id,
        limit=limit,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return count of unread notifications for badge display."""
    if not current_user.company_id:
        return UnreadCountResponse(unread_count=0)
    count = notification_service.get_unread_count(db=db, company_id=current_user.company_id)
    return UnreadCountResponse(unread_count=count)


@router.put("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a single notification as read."""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No company profile")
    success = notification_service.mark_as_read(db, notification_id, current_user.company_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return {"message": "Notification marked as read"}


@router.put("/read-all")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all notifications as read for current company."""
    if not current_user.company_id:
        return {"updated": 0}
    updated = notification_service.mark_all_as_read(db, current_user.company_id)
    return {"message": "All notifications marked as read", "updated": updated}
