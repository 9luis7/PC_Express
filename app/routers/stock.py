from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..auth import get_current_active_user
from ..database import get_db
from ..models import User

router = APIRouter(prefix="/products", tags=["Stock"])


@router.post("/{product_id}/stock/add", response_model=schemas.Product)
def add_stock(
    product_id: int,
    payload: schemas.StockChangeIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    product = crud.add_stock(db, product_id, payload.quantidade, payload.motivo, current_user.id)
    return product


@router.post("/{product_id}/stock/remove", response_model=schemas.Product)
def remove_stock(
    product_id: int,
    payload: schemas.StockChangeIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    product = crud.remove_stock(db, product_id, payload.quantidade, payload.motivo, current_user.id)
    return product


@router.put("/{product_id}/stock/set", response_model=schemas.Product)
def set_stock(
    product_id: int,
    payload: schemas.StockSetIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    product = crud.set_stock(db, product_id, payload.quantidade, payload.motivo, current_user.id)
    return product


@router.get("/{product_id}/movements", response_model=List[schemas.StockMovement])
def list_movements(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return crud.list_movements(db, product_id, current_user.id)
