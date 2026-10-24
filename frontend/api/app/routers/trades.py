"""
Trade History Router.

Provides endpoints to view permanent transaction ledgers recorded at both
the buyer's and seller's ends.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.trade import TradeHistory
from app.models.user import User
from app.schemas.trade import TradeHistoryResponse, TradeStatsResponse
from app.services import trade_service

router = APIRouter(prefix="/trades", tags=["Trade History"])


@router.get("/history", response_model=list[TradeHistoryResponse])
def get_trade_history(
    role: str | None = None,  # "all", "buyer", "seller"
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """View recorded trade history for caller's company (buyer end or seller end)."""
    if not current_user.company_id:
        return []
    return trade_service.list_trade_history(
        company_id=current_user.company_id,
        role=role,
        db=db,
    )


@router.get("/stats", response_model=TradeStatsResponse)
def get_trade_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get trade statistics, aggregated tons, valuation, and CO2 offset metrics."""
    if not current_user.company_id:
        return TradeStatsResponse(
            total_trades_count=0,
            total_traded_tons=0,
            total_traded_value_inr=0,
            total_co2_offset_kg=0,
            as_buyer_trades=0,
            as_seller_trades=0,
        )
    return trade_service.get_trade_stats(
        company_id=current_user.company_id,
        db=db,
    )


@router.get("/{trade_id}", response_model=TradeHistoryResponse)
def get_trade_details(
    trade_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """View digital trade certificate and detailed landed cost breakdown."""
    trade = db.query(TradeHistory).filter(TradeHistory.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trade record not found")

    if current_user.company_id not in (trade.buyer_company_id, trade.seller_company_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return trade_service.serialize_trade_history(trade, current_user.company_id)
