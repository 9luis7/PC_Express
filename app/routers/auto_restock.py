import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_active_user
from ..database import get_db
from ..models import MovementType, Product, StockMovement, Supplier, User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auto-restock", tags=["auto-restock"])


@router.get("/analysis")
def get_stock_analysis(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)
):
    """Analyze current stock levels and provide restock recommendations"""
    try:
        products = db.query(Product).filter(Product.user_id == current_user.id).all()

        restock_items = []

        for product in products:
            # Calculate recommended stock level (2x minimum stock for safety)
            recommended_stock = product.estoque_minimo * 2
            current_stock = product.quantidade
            restock_needed = max(0, recommended_stock - current_stock)

            # Only include products that actually need restocking
            # Critical: out of stock (0)
            # High: below minimum stock
            # Medium: below recommended stock (2x minimum)
            if current_stock < recommended_stock:
                # Get supplier info
                supplier = None
                if product.fornecedor_id:
                    supplier = (
                        db.query(Supplier)
                        .filter(
                            Supplier.id == product.fornecedor_id,
                            Supplier.user_id == current_user.id,
                        )
                        .first()
                    )

                restock_items.append(
                    {
                        "product": {
                            "id": product.id,
                            "nome": product.nome,
                            "codigo": product.codigo,
                            "categoria": product.categoria,
                            "quantidade": current_stock,
                            "estoque_minimo": product.estoque_minimo,
                            "preco": product.preco,
                        },
                        "supplier": (
                            {
                                "id": supplier.id if supplier else None,
                                "nome": (
                                    supplier.nome
                                    if supplier
                                    else "No supplier assigned"
                                ),
                            }
                            if supplier
                            else None
                        ),
                        "restock_info": {
                            "current_stock": current_stock,
                            "recommended_stock": recommended_stock,
                            "restock_needed": restock_needed,
                            "estimated_cost": restock_needed * product.preco,
                            "urgency": (
                                "critical"
                                if current_stock == 0
                                else (
                                    "high"
                                    if current_stock <= product.estoque_minimo
                                    else (
                                        "medium"
                                        if current_stock < recommended_stock
                                        else "low"
                                    )
                                )
                            ),
                        },
                    }
                )

        # Sort by urgency (critical first, then high, then medium, then low)
        urgency_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        restock_items.sort(key=lambda x: urgency_order[x["restock_info"]["urgency"]])

        return {
            "restock_items": restock_items,
            "total_items": len(restock_items),
            "total_cost": sum(
                item["restock_info"]["estimated_cost"] for item in restock_items
            ),
            "critical_count": len(
                [
                    item
                    for item in restock_items
                    if item["restock_info"]["urgency"] == "critical"
                ]
            ),
            "high_count": len(
                [
                    item
                    for item in restock_items
                    if item["restock_info"]["urgency"] == "high"
                ]
            ),
            "medium_count": len(
                [
                    item
                    for item in restock_items
                    if item["restock_info"]["urgency"] == "medium"
                ]
            ),
            "low_count": len(
                [
                    item
                    for item in restock_items
                    if item["restock_info"]["urgency"] == "low"
                ]
            ),
        }
    except Exception:
        logger.exception("analyze stock failed")
        raise HTTPException(status_code=500, detail="Failed to analyze stock.")


@router.post("/restock-all")
def restock_all_products(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)
):
    """Restock all products to recommended levels with one click - Direct stock update"""
    try:
        products = db.query(Product).filter(Product.user_id == current_user.id).all()

        restocked_products = []
        total_value = 0

        for product in products:
            # Calculate recommended stock level
            recommended_stock = product.estoque_minimo * 2
            current_stock = product.quantidade
            restock_needed = max(0, recommended_stock - current_stock)

            # Only restock if needed
            if current_stock < recommended_stock:
                # Update stock directly
                product.quantidade = recommended_stock

                # Create stock movement record
                movement = StockMovement(
                    user_id=current_user.id,
                    produto_id=product.id,
                    tipo=MovementType.IN,
                    quantidade_alterada=restock_needed,
                    quantidade_resultante=recommended_stock,
                    motivo=f"Auto-restock: Reposição automática para {recommended_stock} unidades",
                )
                db.add(movement)

                # Calculate cost
                restock_cost = restock_needed * product.preco
                total_value += restock_cost

                restocked_products.append(
                    {
                        "product": product.nome,
                        "product_id": product.id,
                        "previous_stock": current_stock,
                        "new_stock": recommended_stock,
                        "restock_amount": restock_needed,
                        "cost": restock_cost,
                    }
                )

        db.commit()

        return {
            "message": f"Successfully restocked {len(restocked_products)} products",
            "restocked_products": restocked_products,
            "total_value": total_value,
            "products_restocked": len(restocked_products),
        }
    except Exception:
        db.rollback()
        logger.exception("restock products failed")
        raise HTTPException(status_code=500, detail="Failed to restock products.")


@router.post("/restock-product/{product_id}")
def restock_single_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Restock a specific product to recommended levels - Direct stock update"""
    try:
        product = (
            db.query(Product)
            .filter(Product.id == product_id, Product.user_id == current_user.id)
            .first()
        )

        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        # Calculate recommended stock level
        recommended_stock = product.estoque_minimo * 2
        current_stock = product.quantidade
        restock_needed = max(0, recommended_stock - current_stock)

        if current_stock >= recommended_stock:
            return {"message": "Product is already at recommended stock levels"}

        # Update stock directly
        product.quantidade = recommended_stock

        # Create stock movement record
        movement = StockMovement(
            user_id=current_user.id,
            produto_id=product.id,
            tipo=MovementType.IN,
            quantidade_alterada=restock_needed,
            quantidade_resultante=recommended_stock,
            motivo=f"Auto-restock: Reposição automática para {recommended_stock} unidades",
        )
        db.add(movement)

        db.commit()

        return {
            "message": "Product restocked successfully",
            "restock_info": {
                "product": product.nome,
                "product_id": product.id,
                "previous_stock": current_stock,
                "new_stock": recommended_stock,
                "restock_amount": restock_needed,
                "cost": restock_needed * product.preco,
            },
        }
    except Exception:
        db.rollback()
        logger.exception("restock product failed")
        raise HTTPException(status_code=500, detail="Failed to restock product.")
