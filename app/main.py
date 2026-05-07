"""PC-Express — API de gerenciamento de inventário (Equipe Big 5).

Autoria e termos completos no LICENSE / TERMS_OF_USE.md.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import (
    alerts,
    auth,
    auto_restock,
    insights,
    products,
    purchase_orders,
    sales,
    simulation,
    stock,
    suppliers,
)

# cria as tabelas no primeiro run
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PC Express API",
    description="API para gerenciamento de estoque de produtos de informática",
    version="1.0.0",
    # Otimizações integradas do sistema
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Configuração CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(suppliers.router)
app.include_router(products.router)
app.include_router(stock.router)
app.include_router(alerts.router)
app.include_router(purchase_orders.router)
app.include_router(sales.router)
app.include_router(insights.router)
app.include_router(auto_restock.router)
app.include_router(simulation.router)


@app.get("/")
def root():
    return {"message": "PC Express API", "version": "1.0.0", "status": "running"}


@app.get("/health")
def health():
    return {"status": "ok"}
