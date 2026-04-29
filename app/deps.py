# Re-export para evitar duplicação. Fonte da verdade: app/database.py
from .database import get_db

__all__ = ["get_db"]
