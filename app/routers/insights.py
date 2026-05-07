import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from ..auth import get_current_active_user
from ..database import get_db
from ..models import MovementType, Product, Sale, SaleItem, StockMovement, User
from ..services.cash_flow_simulator import CashFlowSimulator
from ..services.ml_predictor import MLPredictor
from ..services.model_registry import list_models, load_model, save_uploaded_model

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/insights", tags=["insights"])


def _server_error(action: str) -> HTTPException:
    """HTTPException 500 com mensagem genérica. Detalhe vai para o log, não para o cliente."""
    return HTTPException(status_code=500, detail=f"Failed to {action}.")


@router.get("/ml/models")
def get_available_models(
    current_user: User = Depends(get_current_active_user),
):
    """List available uploaded models in the server registry"""
    try:
        return {"models": list_models()}
    except Exception:
        logger.exception("list_models failed")
        raise _server_error("list models")


@router.post("/ml/models/upload")
async def upload_model(
    name: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
):
    """Upload a serialized model (joblib or pickle) trained externally (e.g., Colab).

    NOTA DE SEGURANÇA: arquivos joblib/pickle podem executar código arbitrário ao
    serem carregados (`joblib.load`). Endpoint exige autenticação. Em produção,
    valide origem do arquivo e considere um formato seguro (ONNX, JSON de pesos).
    """
    try:
        data = await file.read()
        # Accept both joblib and pickle (joblib can load pickle files too)
        path = save_uploaded_model(name, data)
        # Quick sanity: try loading
        model = load_model(name)
        if model is None:
            raise HTTPException(status_code=400, detail="Invalid model file or unsupported format")
        return {"message": "Model uploaded", "name": name, "path": path}
    except HTTPException:
        raise
    except Exception:
        logger.exception("upload_model failed")
        raise _server_error("upload model")


@router.post("/generate-sales-data")
def generate_sales_data(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Generate initial sales data only if no sales exist (for system setup)"""
    try:
        simulator = CashFlowSimulator(db)
        generated_sales = simulator.generate_initial_sales_data(days, current_user.id)

        if len(generated_sales) == 0:
            return {
                "message": "No initial data generated - sales already exist in the system",
                "sales_count": 0,
                "note": "Use real sales data for ML insights",
            }

        return {
            "message": f"Generated {len(generated_sales)} initial sales over the past {days} days",
            "sales_count": len(generated_sales),
            "note": "Initial data generated for system setup. Add real sales for better ML insights.",
        }
    except Exception:
        logger.exception("generate_sales_data failed")
        raise _server_error("generate initial sales data")


@router.get("/overview")
def get_insights_overview(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)
):
    """Get overview insights for all products"""
    try:
        products = db.query(Product).filter(Product.user_id == current_user.id).all()

        if not products:
            return {
                "message": "No products found. Add some products to see insights.",
                "inventory_summary": {
                    "total_products": 0,
                    "total_stock_value": 0,
                    "low_stock_count": 0,
                    "out_of_stock_count": 0,
                    "stock_health_percentage": 0,
                },
            }

        total_products = len(products)
        total_stock_value = sum(p.quantidade * p.preco for p in products)
        low_stock_count = len([p for p in products if p.em_estoque_baixo])
        out_of_stock_count = len([p for p in products if p.quantidade == 0])

        # Get recent stock movements (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_movements = (
            db.query(StockMovement)
            .filter(
                and_(
                    StockMovement.user_id == current_user.id,
                    StockMovement.criado_em >= thirty_days_ago,
                )
            )
            .all()
        )

        # Analyze movement patterns
        in_movements = [m for m in recent_movements if m.tipo == MovementType.IN]
        out_movements = [m for m in recent_movements if m.tipo == MovementType.OUT]

        total_in = sum(m.quantidade_alterada for m in in_movements)
        total_out = sum(abs(m.quantidade_alterada) for m in out_movements)

        # Get sales data (last 30 days)
        recent_sales = (
            db.query(Sale)
            .filter(and_(Sale.user_id == current_user.id, Sale.criado_em >= thirty_days_ago))
            .all()
        )

        total_sales_value = sum(s.total_value for s in recent_sales)
        total_sales_count = len(recent_sales)

        return {
            "inventory_summary": {
                "total_products": total_products,
                "total_stock_value": total_stock_value,
                "low_stock_count": low_stock_count,
                "out_of_stock_count": out_of_stock_count,
                "stock_health_percentage": (
                    ((total_products - low_stock_count - out_of_stock_count) / total_products * 100)
                    if total_products > 0
                    else 0
                ),
            },
            "movement_analysis": {
                "total_in_movements": len(in_movements),
                "total_out_movements": len(out_movements),
                "total_quantity_in": total_in,
                "total_quantity_out": total_out,
                "net_movement": total_in - total_out,
            },
            "sales_analysis": {
                "total_sales": total_sales_count,
                "total_sales_value": total_sales_value,
                "average_sale_value": (
                    total_sales_value / total_sales_count if total_sales_count > 0 else 0
                ),
                "period": "30 days",
            },
            "recommendations": _generate_recommendations(products, recent_movements, recent_sales),
        }
    except Exception:
        logger.exception("get insights overview failed")
        raise _server_error("get insights overview")


@router.get("/product/{product_id}")
def get_product_insights(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get detailed insights for a specific product"""
    try:
        product = (
            db.query(Product)
            .filter(Product.id == product_id, Product.user_id == current_user.id)
            .first()
        )

        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        # Get recent movements for this product
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_movements = (
            db.query(StockMovement)
            .filter(
                and_(
                    StockMovement.produto_id == product_id,
                    StockMovement.user_id == current_user.id,
                    StockMovement.criado_em >= thirty_days_ago,
                )
            )
            .order_by(StockMovement.criado_em.desc())
            .all()
        )

        # Get recent sales for this product
        recent_sales = (
            db.query(SaleItem)
            .filter(and_(SaleItem.produto_id == product_id, SaleItem.criado_em >= thirty_days_ago))
            .all()
        )

        # Calculate insights
        total_sold = sum(sale.quantidade for sale in recent_sales)
        total_sales_value = sum(sale.preco_total for sale in recent_sales)
        avg_sale_quantity = total_sold / len(recent_sales) if recent_sales else 0

        # Movement analysis
        in_movements = [m for m in recent_movements if m.tipo == MovementType.IN]
        out_movements = [m for m in recent_movements if m.tipo == MovementType.OUT]

        total_in = sum(m.quantidade_alterada for m in in_movements)
        total_out = sum(abs(m.quantidade_alterada) for m in out_movements)

        # Stock health analysis
        stock_health = "healthy"
        if product.quantidade == 0:
            stock_health = "out_of_stock"
        elif product.em_estoque_baixo:
            stock_health = "low_stock"

        # Price analysis
        price_analysis = _analyze_price(product, recent_sales)

        return {
            "product": {
                "id": product.id,
                "nome": product.nome,
                "codigo": product.codigo,
                "categoria": product.categoria,
                "quantidade": product.quantidade,
                "estoque_minimo": product.estoque_minimo,
                "preco": product.preco,
                "stock_health": stock_health,
            },
            "sales_analysis": {
                "total_sold_30d": total_sold,
                "total_sales_value_30d": total_sales_value,
                "average_sale_quantity": avg_sale_quantity,
                "sales_count": len(recent_sales),
            },
            "movement_analysis": {
                "total_in_30d": total_in,
                "total_out_30d": total_out,
                "net_movement": total_in - total_out,
                "movement_count": len(recent_movements),
            },
            "price_analysis": price_analysis,
            "recommendations": _generate_product_recommendations(
                product, recent_sales, recent_movements
            ),
        }
    except Exception:
        logger.exception("get product insights failed")
        raise _server_error("get product insights")


@router.get("/low-stock-alerts")
def get_low_stock_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Produtos com estoque abaixo do mínimo, classificados por severidade.

    - critical: estoque == 0
    - high: 0 < estoque <= estoque_minimo
    """
    try:
        low_stock = (
            db.query(Product)
            .filter(
                Product.user_id == current_user.id,
                Product.quantidade <= Product.estoque_minimo,
            )
            .order_by(Product.quantidade.asc(), Product.nome.asc())
            .all()
        )

        items = []
        critical_count = 0
        high_count = 0
        for p in low_stock:
            severity = "critical" if p.quantidade == 0 else "high"
            if severity == "critical":
                critical_count += 1
            else:
                high_count += 1
            items.append(
                {
                    "id": p.id,
                    "codigo": p.codigo,
                    "nome": p.nome,
                    "categoria": p.categoria,
                    "quantidade": p.quantidade,
                    "estoque_minimo": p.estoque_minimo,
                    "preco": p.preco,
                    "fornecedor_id": p.fornecedor_id,
                    "severity": severity,
                }
            )

        return {
            "low_stock_products": items,
            "total_low_stock": len(items),
            "critical_count": critical_count,
            "high_count": high_count,
        }
    except Exception:
        logger.exception("get low stock insights failed")
        raise _server_error("get low stock insights")


@router.get("/ml/demand-prediction/{product_id}")
def get_demand_prediction(
    product_id: int,
    days_ahead: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get ML-based demand prediction for a product using real data"""
    try:
        predictor = MLPredictor(db, current_user.id)
        prediction = predictor.predict_demand(product_id, days_ahead)
        return prediction
    except Exception:
        logger.exception("get demand prediction failed")
        raise _server_error("get demand prediction")


@router.get("/ml/price-optimization/{product_id}")
def get_price_optimization(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get ML-based price optimization for a product using real data"""
    try:
        predictor = MLPredictor(db, current_user.id)
        optimization = predictor.optimize_price(product_id)
        return optimization
    except Exception:
        logger.exception("get price optimization failed")
        raise _server_error("get price optimization")


@router.get("/ml/anomaly-detection")
def get_anomaly_detection(
    product_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get ML-based anomaly detection in sales using real data"""
    try:
        predictor = MLPredictor(db, current_user.id)
        anomalies = predictor.detect_anomalies(product_id)
        return anomalies
    except Exception:
        logger.exception("get anomaly detection failed")
        raise _server_error("get anomaly detection")


@router.get("/ml/stock-optimization/{product_id}")
def get_stock_optimization(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get ML-based stock optimization for a product using real data"""
    try:
        predictor = MLPredictor(db, current_user.id)
        optimization = predictor.get_stock_optimization(product_id)
        return optimization
    except Exception:
        logger.exception("get stock optimization failed")
        raise _server_error("get stock optimization")


@router.get("/ml/product-insights/{product_id}")
def get_ml_product_insights(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get comprehensive ML insights for a product using real data"""
    try:
        predictor = MLPredictor(db, current_user.id)
        insights = predictor.get_product_insights_summary(product_id)
        return insights
    except Exception:
        logger.exception("get ML insights failed")
        raise _server_error("get ML insights")


def _generate_recommendations(products, movements, sales):
    """Generate business recommendations based on data"""
    recommendations = []

    # Low stock recommendations
    low_stock_products = [p for p in products if p.em_estoque_baixo]
    if low_stock_products:
        recommendations.append(
            {
                "type": "restock",
                "priority": "high",
                "message": f"Restock {len(low_stock_products)} products that are running low on stock",
                "action": "Review auto-restock recommendations",
            }
        )

    # Price optimization recommendations
    high_value_products = [p for p in products if p.preco > 100 and p.quantidade > 0]
    if high_value_products:
        recommendations.append(
            {
                "type": "pricing",
                "priority": "medium",
                "message": f"Consider price optimization for {len(high_value_products)} high-value products",
                "action": "Review pricing strategy",
            }
        )

    # Inventory optimization
    if len(products) > 10:
        recommendations.append(
            {
                "type": "inventory",
                "priority": "medium",
                "message": "Consider inventory optimization to reduce carrying costs",
                "action": "Review product mix and stock levels",
            }
        )

    return recommendations


def _generate_product_recommendations(product, sales, movements):
    """Generate recommendations for a specific product"""
    recommendations = []

    if product.quantidade == 0:
        recommendations.append(
            {
                "type": "restock",
                "priority": "critical",
                "message": "Product is out of stock - immediate restocking required",
                "action": "Create restock order",
            }
        )
    elif product.em_estoque_baixo:
        recommendations.append(
            {
                "type": "restock",
                "priority": "high",
                "message": "Product is running low on stock",
                "action": "Consider restocking",
            }
        )

    # Price recommendations based on sales
    if sales:
        avg_sale_price = sum(sale.preco_unitario for sale in sales) / len(sales)
        if avg_sale_price < product.preco * 0.9:
            recommendations.append(
                {
                    "type": "pricing",
                    "priority": "medium",
                    "message": "Recent sales suggest price might be too high",
                    "action": "Consider price reduction",
                }
            )

    return recommendations


def _analyze_price(product, sales):
    """Analyze pricing based on sales data"""
    if not sales:
        return {
            "analysis": "No recent sales data available",
            "recommendation": "Monitor sales performance",
        }

    avg_sale_price = sum(sale.preco_unitario for sale in sales) / len(sales)
    price_variance = product.preco - avg_sale_price

    if price_variance > product.preco * 0.1:
        return {
            "analysis": "Recent sales are significantly below current price",
            "recommendation": "Consider price reduction",
            "avg_sale_price": avg_sale_price,
            "current_price": product.preco,
            "variance": price_variance,
        }
    elif price_variance < -product.preco * 0.1:
        return {
            "analysis": "Recent sales are above current price",
            "recommendation": "Consider price increase",
            "avg_sale_price": avg_sale_price,
            "current_price": product.preco,
            "variance": price_variance,
        }
    else:
        return {
            "analysis": "Price appears to be well-positioned",
            "recommendation": "Maintain current pricing",
            "avg_sale_price": avg_sale_price,
            "current_price": product.preco,
            "variance": price_variance,
        }
