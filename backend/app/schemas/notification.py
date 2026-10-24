"""
Pydantic schemas for In-App Notifications.
"""

from datetime import datetime
from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: int
    company_id: int
    title: str
    message: str
    type: str
    link: str | None = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UnreadCountResponse(BaseModel):
    unread_count: int


class ConvertComingSoonRequest(BaseModel):
    actual_tons: float
