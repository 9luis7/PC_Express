import logging
import random
from datetime import datetime, timedelta
from typing import List

from sqlalchemy.orm import Session

from ..models import MovementType, Product, Sale, SaleItem, StockMovement

logger = logging.getLogger(__name__)


class CashFlowSimulator:
    def __init__(self, db: Session):
        self.db = db

    def generate_initial_sales_data(self, days_back: int, user_id: int) -> List[Sale]:
        """Generate initial sales data only if no sales exist - for system setup.

        user_id é obrigatório para evitar geração cross-tenant.
        """
        if not user_id:
            raise ValueError("user_id is required for generate_initial_sales_data")

        try:
            existing_sales = self.db.query(Sale).filter(Sale.user_id == user_id).first()
            if existing_sales:
                return []  # Don't generate if sales already exist

            products = (
                self.db.query(Product)
                .filter(Product.quantidade > 0, Product.user_id == user_id)
                .all()
            )

            if not products:
                return []

            generated_sales = []

            # Generate realistic initial data based on product characteristics
            for day_offset in range(days_back, 0, -1):
                date = datetime.now() - timedelta(days=day_offset)

                # Generate sales based on product demand patterns
                for product in products:
                    if product.quantidade <= 0:
                        continue

                    # Calculate daily demand based on product price and category
                    base_demand = self._calculate_base_demand(product)

                    # Apply day-of-week patterns (weekends have more sales)
                    day_factor = 1.5 if date.weekday() >= 5 else 1.0  # Weekend boost

                    # Apply seasonal patterns (more sales in certain months)
                    month_factor = 1.2 if date.month in [11, 12] else 1.0  # Holiday season

                    daily_demand = base_demand * day_factor * month_factor

                    # Generate sale if demand threshold is met
                    if daily_demand >= 0.3:  # 30% chance of sale for high-demand products
                        quantity = min(
                            int(daily_demand), product.quantidade, 3
                        )  # Max 3 units per sale

                        if quantity > 0:
                            total_value = quantity * product.preco

                            # Create sale record
                            sale = Sale(
                                total_value=total_value, status="COMPLETED", user_id=user_id
                            )
                            self.db.add(sale)
                            self.db.flush()

                            # Create sale item
                            sale_item = SaleItem(
                                sale_id=sale.id,
                                produto_id=product.id,
                                quantidade=quantity,
                                preco_unitario=product.preco,
                                preco_total=total_value,
                            )
                            self.db.add(sale_item)

                            # Update product stock
                            product.quantidade -= quantity
                            product.last_sale_date = date

                            # Create stock movement
                            movement = StockMovement(
                                produto_id=product.id,
                                tipo=MovementType.OUT,
                                quantidade_alterada=-quantity,
                                quantidade_resultante=product.quantidade,
                                motivo="Initial Sale",
                                user_id=user_id,
                            )
                            self.db.add(movement)

                            generated_sales.append(sale)

            self.db.commit()
            return generated_sales

        except Exception as e:
            self.db.rollback()
            raise e

    def _calculate_base_demand(self, product) -> float:
        """Calculate base daily demand based on product characteristics"""
        # Base demand based on price (cheaper products sell more)
        price_factor = max(0.1, 1.0 - (product.preco / 1000))  # Higher price = lower demand

        # Category-based demand
        category_demand = {
            "processador": 0.8,  # High demand
            "memoria": 1.2,  # Very high demand
            "armazenamento": 1.0,  # Medium demand
            "placa de video": 0.6,  # Lower demand
            "monitor": 0.4,  # Lower demand
            "teclado": 1.5,  # Very high demand
            "mouse": 1.5,  # Very high demand
            "headset": 0.9,  # Medium-high demand
        }

        category_factor = category_demand.get((product.categoria or "").lower(), 1.0)

        # Stock level factor (more stock = more visibility = more sales)
        stock_factor = min(2.0, product.quantidade / 10) if product.quantidade > 0 else 0

        return price_factor * category_factor * stock_factor * 0.5  # Base multiplier
