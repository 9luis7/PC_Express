from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..auth import get_current_active_user
from ..database import get_db
from ..models import User

router = APIRouter(prefix="/products", tags=["Products"])


@router.post("", response_model=schemas.Product)
def create_product(
    payload: schemas.ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return crud.create_product(db, payload, current_user.id)


@router.get("", response_model=List[schemas.Product])
def list_products(
    nome: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    fornecedor_id: Optional[int] = Query(None),
    em_estoque_baixo: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return crud.list_products(
        db, current_user.id, nome, categoria, fornecedor_id, em_estoque_baixo
    )


@router.get("/low-stock", response_model=List[schemas.Product])
def low_stock(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return crud.list_products(db, current_user.id, low_stock=True)


@router.get("/{product_id}", response_model=schemas.Product)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return crud.get_product(db, product_id, current_user.id)


@router.put("/{product_id}", response_model=schemas.Product)
def update_product(
    product_id: int,
    payload: schemas.ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return crud.update_product(db, product_id, payload, current_user.id)


@router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    crud.delete_product(db, product_id, current_user.id)
    return
