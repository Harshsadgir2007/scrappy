"""
Notification Service — handles dispatching alerts to companies.
"""

from sqlalchemy.orm import Session
from app.models.notification import Notification


def create_notification(
    db: Session,
    company_id: int,
    title: str,
    message: str,
    notif_type: str = "general",
    link: str | None = None,
) -> Notification:
    """Create and persist an in-app notification."""
    notif = Notification(
        company_id=company_id,
        title=title,
        message=message,
        type=notif_type,
        link=link,
        is_read=False,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def get_company_notifications(
    db: Session,
    company_id: int,
    limit: int = 30,
) -> list[Notification]:
    """Retrieve notifications for a company, newest first."""
    return (
        db.query(Notification)
        .filter(Notification.company_id == company_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )


def get_unread_count(db: Session, company_id: int) -> int:
    """Return count of unread notifications for a company."""
    return (
        db.query(Notification)
        .filter(Notification.company_id == company_id, Notification.is_read == False)
        .count()
    )


def mark_as_read(db: Session, notification_id: int, company_id: int) -> bool:
    """Mark a notification as read if it belongs to the company."""
    notif = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.company_id == company_id)
        .first()
    )
    if notif:
        notif.is_read = True
        db.commit()
        return True
    return False


def mark_all_as_read(db: Session, company_id: int) -> int:
    """Mark all notifications for a company as read."""
    updated = (
        db.query(Notification)
        .filter(Notification.company_id == company_id, Notification.is_read == False)
        .update({"is_read": True})
    )
    db.commit()
    return updated
