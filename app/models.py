"""Modelos SQLAlchemy do PC-Express (Equipe Big 5)."""

import enum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class MovementType(str, enum.Enum):
    IN = "IN"
    OUT = "OUT"
    ADJUST = "ADJUST"


class PurchaseOrderStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    CANCELLED = "CANCELLED"


class SaleStatus(str, enum.Enum):
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    suppliers = relationship(
        "Supplier", back_populates="user", cascade="all, delete-orphan"
    )
    products = relationship(
        "Product", back_populates="user", cascade="all, delete-orphan"
    )
    sales = relationship("Sale", back_populates="user", cascade="all, delete-orphan")
    purchase_orders = relationship(
        "PurchaseOrder", back_populates="user", cascade="all, delete-orphan"
    )


class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    nome = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    telefone = Column(String(50), nullable=True)
    cnpj = Column(String(50), nullable=True)
    observacoes = Column(Text, nullable=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="suppliers")
    produtos = relationship("Product", back_populates="fornecedor")
    purchase_orders = relationship("PurchaseOrder", back_populates="fornecedor")


class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    codigo = Column(String(100), unique=True, index=True, nullable=False)
    nome = Column(String(255), nullable=False)
    categoria = Column(
        String(100), nullable=True
    )  # ex.: processador, memoria, armazenamento...
    quantidade = Column(Integer, nullable=False, default=0)
    preco = Column(Float, nullable=False, default=0.0)
    descricao = Column(Text, nullable=True)
    fornecedor_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    estoque_minimo = Column(Integer, nullable=False, default=5)
    # New fields for advanced features
    lead_time_days = Column(
        Integer, nullable=False, default=7
    )  # Default 7 days lead time
    safety_stock = Column(
        Integer, nullable=False, default=2
    )  # Default 2 units safety stock
    last_sale_date = Column(
        DateTime(timezone=True), nullable=True
    )  # Track last sale for dead stock detection
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user = relationship("User", back_populates="products")
    fornecedor = relationship("Supplier", back_populates="produtos")
    movimentos = relationship(
        "StockMovement", back_populates="produto", cascade="all, delete-orphan"
    )
    purchase_order_items = relationship("PurchaseOrderItem", back_populates="produto")
    sales = relationship("SaleItem", back_populates="produto")

    @property
    def em_estoque_baixo(self):
        """Check if product is low on stock"""
        return self.quantidade <= self.estoque_minimo


class StockMovement(Base):
    __tablename__ = "stock_movements"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    produto_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    tipo = Column(Enum(MovementType), nullable=False)
    quantidade_alterada = Column(Integer, nullable=False)
    quantidade_resultante = Column(Integer, nullable=False)
    motivo = Column(String(255), nullable=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    produto = relationship("Product", back_populates="movimentos")


class Sale(Base):
    __tablename__ = "sales"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    total_value = Column(Float, nullable=False, default=0.0)
    status = Column(Enum(SaleStatus), nullable=False, default=SaleStatus.COMPLETED)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="sales")
    items = relationship(
        "SaleItem", back_populates="sale", cascade="all, delete-orphan"
    )


class SaleItem(Base):
    __tablename__ = "sale_items"
    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    produto_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantidade = Column(Integer, nullable=False)
    preco_unitario = Column(Float, nullable=False)
    preco_total = Column(Float, nullable=False)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    sale = relationship("Sale", back_populates="items")
    produto = relationship("Product", back_populates="sales")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    fornecedor_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    status = Column(
        Enum(PurchaseOrderStatus), nullable=False, default=PurchaseOrderStatus.DRAFT
    )
    total_value = Column(Float, nullable=False, default=0.0)
    observacoes = Column(Text, nullable=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    aprovado_em = Column(DateTime(timezone=True), nullable=True)
    rejeitado_em = Column(DateTime(timezone=True), nullable=True)
    motivo_rejeicao = Column(Text, nullable=True)

    user = relationship("User", back_populates="purchase_orders")
    fornecedor = relationship("Supplier", back_populates="purchase_orders")
    items = relationship(
        "PurchaseOrderItem",
        back_populates="purchase_order",
        cascade="all, delete-orphan",
    )


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"
    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(
        Integer, ForeignKey("purchase_orders.id"), nullable=False
    )
    produto_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantidade_solicitada = Column(Integer, nullable=False)
    quantidade_recebida = Column(Integer, nullable=True, default=0)
    preco_unitario = Column(Float, nullable=False)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    purchase_order = relationship("PurchaseOrder", back_populates="items")
    produto = relationship("Product", back_populates="purchase_order_items")
