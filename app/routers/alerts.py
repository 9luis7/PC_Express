from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..auth import get_current_active_user
from ..database import get_db
from ..models import User

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("/low-stock", response_model=List[schemas.Product])
def low_stock(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    products = crud.list_products(db, current_user.id, low_stock=True)
    return products
