from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..auth import get_current_active_user
from ..database import get_db
from ..models import User

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


@router.post("", response_model=schemas.Supplier)
def create_supplier(
    payload: schemas.SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return crud.create_supplier(db, payload, current_user.id)


@router.get("", response_model=List[schemas.Supplier])
def list_suppliers(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)
):
    return crud.list_suppliers(db, current_user.id)


@router.get("/{supplier_id}", response_model=schemas.Supplier)
def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return crud.get_supplier(db, supplier_id, current_user.id)


@router.put("/{supplier_id}", response_model=schemas.Supplier)
def update_supplier(
    supplier_id: int,
    payload: schemas.SupplierUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return crud.update_supplier(db, supplier_id, payload, current_user.id)


@router.delete("/{supplier_id}", status_code=204)
def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    crud.delete_supplier(db, supplier_id, current_user.id)
    return
