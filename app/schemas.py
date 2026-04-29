from datetime import datetime
from typing import List, Optional

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    NonNegativeFloat,
    NonNegativeInt,
    PositiveInt,
)

# Enums vêm de models.py (única fonte da verdade)
from .models import MovementType, PurchaseOrderStatus, SaleStatus

__all__ = ["MovementType", "PurchaseOrderStatus", "SaleStatus"]


# Authentication Schemas
class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


# Supplier
class SupplierBase(BaseModel):
    nome: str = Field(..., min_length=1)
    email: Optional[str] = None
    telefone: Optional[str] = None
    cnpj: Optional[str] = None
    observacoes: Optional[str] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=1)
    email: Optional[str] = None
    telefone: Optional[str] = None
    cnpj: Optional[str] = None
    observacoes: Optional[str] = None


class SupplierOut(SupplierBase):
    id: int
    criado_em: datetime

    class Config:
        from_attributes = True


class Supplier(SupplierBase):
    id: int
    user_id: int
    criado_em: datetime

    class Config:
        from_attributes = True


# Product
class ProductBase(BaseModel):
    codigo: str = Field(..., min_length=1)
    nome: str = Field(..., min_length=1)
    categoria: Optional[str] = None
    quantidade: NonNegativeInt = 0
    preco: NonNegativeFloat = 0.0
    descricao: Optional[str] = None
    fornecedor_id: Optional[int] = None
    estoque_minimo: NonNegativeInt = 5
    lead_time_days: NonNegativeInt = 7
    safety_stock: NonNegativeInt = 2


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=1)
    categoria: Optional[str] = None
    quantidade: Optional[NonNegativeInt] = None
    preco: Optional[NonNegativeFloat] = None
    descricao: Optional[str] = None
    fornecedor_id: Optional[int] = None
    estoque_minimo: Optional[NonNegativeInt] = None
    lead_time_days: Optional[NonNegativeInt] = None
    safety_stock: Optional[NonNegativeInt] = None


class ProductOut(BaseModel):
    id: int
    codigo: str
    nome: str
    categoria: Optional[str]
    quantidade: int
    preco: float
    descricao: Optional[str]
    fornecedor_id: Optional[int]
    estoque_minimo: int
    lead_time_days: int
    safety_stock: int
    last_sale_date: Optional[datetime]
    criado_em: datetime
    atualizado_em: datetime
    em_estoque_baixo: bool

    class Config:
        from_attributes = True


class Product(ProductBase):
    id: int
    user_id: int
    last_sale_date: Optional[datetime] = None
    criado_em: datetime
    atualizado_em: datetime
    em_estoque_baixo: bool

    class Config:
        from_attributes = True


# Sales
class SaleItemBase(BaseModel):
    produto_id: int
    quantidade: int
    preco_unitario: float
    preco_total: float


class SaleItemCreate(SaleItemBase):
    pass


class SaleItemOut(BaseModel):
    id: int
    produto_id: int
    quantidade: int
    preco_unitario: float
    preco_total: float
    criado_em: datetime
    produto_nome: str
    produto_codigo: str

    class Config:
        from_attributes = True


class SaleItem(SaleItemBase):
    id: int
    sale_id: int
    criado_em: datetime

    class Config:
        from_attributes = True


class SaleBase(BaseModel):
    total_value: float = 0.0
    status: SaleStatus = SaleStatus.COMPLETED


class SaleCreate(SaleBase):
    items: List[SaleItemCreate]


class SaleOut(BaseModel):
    id: int
    total_value: float
    status: SaleStatus
    criado_em: datetime
    items: List[SaleItemOut]

    class Config:
        from_attributes = True


class Sale(SaleBase):
    id: int
    user_id: int
    criado_em: datetime
    items: List[SaleItem] = []

    class Config:
        from_attributes = True


# Stock
class StockChangeIn(BaseModel):
    quantidade: PositiveInt
    motivo: Optional[str] = None


class StockSetIn(BaseModel):
    quantidade: NonNegativeInt
    motivo: Optional[str] = None


class StockMovementBase(BaseModel):
    tipo: MovementType
    quantidade_alterada: int
    quantidade_resultante: int
    motivo: Optional[str] = None


class StockMovementCreate(StockMovementBase):
    pass


class StockMovement(StockMovementBase):
    id: int
    produto_id: int
    criado_em: datetime

    class Config:
        from_attributes = True


# Purchase Orders
class PurchaseOrderItemBase(BaseModel):
    produto_id: int
    quantidade_solicitada: int
    preco_unitario: float


class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass


class PurchaseOrderItemOut(BaseModel):
    id: int
    produto_id: int
    quantidade_solicitada: int
    quantidade_recebida: Optional[int] = 0
    preco_unitario: float
    criado_em: datetime
    produto_nome: str
    produto_codigo: str

    class Config:
        from_attributes = True


class PurchaseOrderItem(PurchaseOrderItemBase):
    id: int
    purchase_order_id: int
    criado_em: datetime

    class Config:
        from_attributes = True


class PurchaseOrderBase(BaseModel):
    fornecedor_id: int
    status: PurchaseOrderStatus = PurchaseOrderStatus.DRAFT
    total_value: float = 0.0
    observacoes: Optional[str] = None


class PurchaseOrderCreate(PurchaseOrderBase):
    items: List[PurchaseOrderItemCreate]


class PurchaseOrderUpdate(BaseModel):
    status: Optional[PurchaseOrderStatus] = None
    observacoes: Optional[str] = None


class PurchaseOrderOut(BaseModel):
    id: int
    fornecedor_id: int
    status: PurchaseOrderStatus
    total_value: float
    observacoes: Optional[str]
    criado_em: datetime
    aprovado_em: Optional[datetime]
    rejeitado_em: Optional[datetime]
    motivo_rejeicao: Optional[str]
    fornecedor_nome: str
    items: List[PurchaseOrderItemOut]

    class Config:
        from_attributes = True


class PurchaseOrder(PurchaseOrderBase):
    id: int
    user_id: int
    criado_em: datetime
    items: List[PurchaseOrderItem] = []

    class Config:
        from_attributes = True
