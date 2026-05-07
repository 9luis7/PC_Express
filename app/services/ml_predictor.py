try:
    import joblib
    import numpy as np
    import pandas as pd
    from sklearn.ensemble import IsolationForest
    from sklearn.linear_model import LinearRegression
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
    from sklearn.preprocessing import StandardScaler

    ML_AVAILABLE = True
except ImportError as e:
    print(f"Warning: ML dependencies not available ({e}), ML features will be disabled")
    ML_AVAILABLE = False

import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from sqlalchemy import and_, func, text
from sqlalchemy.orm import Session

from ..models import MovementType, Product, Sale, SaleItem, SaleStatus, StockMovement


class MLPredictor:
    def __init__(self, db: Session, user_id: int):
        self.db = db
        self.user_id = user_id
        self.models_dir = "ml_models"
        self._ensure_models_directory()

    def _ensure_models_directory(self):
        """Create models directory if it doesn't exist"""
        if not os.path.exists(self.models_dir):
            os.makedirs(self.models_dir)

    def _get_sales_data(self, product_id: Optional[int] = None, days: int = 90):
        """Get real sales data from SQLite database"""
        if not ML_AVAILABLE:
            return None
        start_date = datetime.now() - timedelta(days=days)

        # Query real sales data
        query = (
            self.db.query(
                SaleItem.produto_id,
                SaleItem.quantidade,
                SaleItem.preco_unitario,
                SaleItem.preco_total,
                SaleItem.criado_em,
                Product.nome,
                Product.categoria,
            )
            .join(Product, SaleItem.produto_id == Product.id)
            .join(Sale, SaleItem.sale_id == Sale.id)
            .filter(
                and_(
                    Sale.user_id == self.user_id,
                    Sale.criado_em >= start_date,
                    Sale.status == SaleStatus.COMPLETED,
                )
            )
        )

        if product_id:
            query = query.filter(SaleItem.produto_id == product_id)

        sales_data = query.all()

        if not sales_data:
            return pd.DataFrame()

        # Convert to DataFrame
        df = pd.DataFrame(
            sales_data,
            columns=[
                "produto_id",
                "quantidade",
                "preco_unitario",
                "preco_total",
                "criado_em",
                "nome",
                "categoria",
            ],
        )

        # Convert to datetime and add features
        df["criado_em"] = pd.to_datetime(df["criado_em"])
        df["data"] = df["criado_em"].dt.date
        df["dia_semana"] = df["criado_em"].dt.dayofweek
        df["mes"] = df["criado_em"].dt.month
        df["ano"] = df["criado_em"].dt.year

        return df

    def _get_stock_movements(self, product_id: Optional[int] = None, days: int = 90):
        """Get real stock movement data from SQLite database"""
        if not ML_AVAILABLE:
            return None
        start_date = datetime.now() - timedelta(days=days)

        query = (
            self.db.query(
                StockMovement.produto_id,
                StockMovement.tipo,
                StockMovement.quantidade_alterada,
                StockMovement.quantidade_resultante,
                StockMovement.motivo,
                StockMovement.criado_em,
                Product.nome,
            )
            .join(Product, StockMovement.produto_id == Product.id)
            .filter(
                and_(StockMovement.user_id == self.user_id, StockMovement.criado_em >= start_date)
            )
        )

        if product_id:
            query = query.filter(StockMovement.produto_id == product_id)

        movements_data = query.all()

        if not movements_data:
            return pd.DataFrame()

        df = pd.DataFrame(
            movements_data,
            columns=[
                "produto_id",
                "tipo",
                "quantidade_alterada",
                "quantidade_resultante",
                "motivo",
                "criado_em",
                "nome",
            ],
        )

        df["criado_em"] = pd.to_datetime(df["criado_em"])
        df["data"] = df["criado_em"].dt.date

        return df

    def predict_demand(self, product_id: int, days_ahead: int = 30) -> Dict:
        """Predict future demand using real historical data"""
        if not ML_AVAILABLE:
            return {
                "success": False,
                "message": "ML features are not available. Please install required dependencies.",
                "predictions": [],
            }
        try:
            # If an external model exists, use it
            try:
                from .model_registry import load_model
                external = load_model(f"demand_{product_id}") or load_model("demand_global")
            except Exception:
                external = None

            # Get real historical sales data
            sales_df = self._get_sales_data(product_id, days=180)

            if sales_df.empty:
                return {
                    "success": False,
                    "message": "No sales data available for this product",
                    "predictions": [],
                }

            # Aggregate daily sales
            daily_sales = (
                sales_df.groupby("data")
                .agg({"quantidade": "sum", "preco_total": "sum", "produto_id": "count"})
                .reset_index()
            )

            daily_sales.columns = ["data", "total_quantity", "total_revenue", "sales_count"]
            daily_sales["data"] = pd.to_datetime(daily_sales["data"])
            daily_sales = daily_sales.sort_values("data")

            # Ensure we have enough data
            if len(daily_sales) < 14:  # At least 2 weeks of data
                return {
                    "success": False,
                    "message": "Need at least 14 days of sales data for prediction",
                    "predictions": [],
                }

            # Create time series features
            daily_sales["dia_semana"] = daily_sales["data"].dt.dayofweek
            daily_sales["mes"] = daily_sales["data"].dt.month
            daily_sales["lag_1"] = daily_sales["total_quantity"].shift(1)
            daily_sales["lag_7"] = daily_sales["total_quantity"].shift(7)
            daily_sales["rolling_mean_7"] = (
                daily_sales["total_quantity"].rolling(7, min_periods=1).mean()
            )
            daily_sales["rolling_mean_14"] = (
                daily_sales["total_quantity"].rolling(14, min_periods=1).mean()
            )
            daily_sales["rolling_std_7"] = (
                daily_sales["total_quantity"].rolling(7, min_periods=1).std()
            )

            # Remove NaN values
            daily_sales = daily_sales.dropna()

            if len(daily_sales) < 7:
                return {
                    "success": False,
                    "message": "Insufficient data after feature engineering",
                    "predictions": [],
                }

            # Prepare features for prediction
            features = [
                "dia_semana",
                "mes",
                "lag_1",
                "lag_7",
                "rolling_mean_7",
                "rolling_mean_14",
                "rolling_std_7",
            ]
            X = daily_sales[features].values
            y = daily_sales["total_quantity"].values

            # Train or use external model
            if external is not None:
                model = external
            else:
                model = LinearRegression()
                model.fit(X, y)

            # Generate future dates
            last_date = daily_sales["data"].max()
            future_dates = pd.date_range(
                start=last_date + timedelta(days=1), periods=days_ahead, freq="D"
            )

            # Prepare future features
            future_predictions = []
            current_lag_1 = daily_sales["total_quantity"].iloc[-1]
            current_lag_7 = (
                daily_sales["total_quantity"].iloc[-7] if len(daily_sales) >= 7 else current_lag_1
            )
            current_rolling_7 = daily_sales["rolling_mean_7"].iloc[-1]
            current_rolling_14 = daily_sales["rolling_mean_14"].iloc[-1]
            current_rolling_std_7 = daily_sales["rolling_std_7"].iloc[-1]

            for i, date in enumerate(future_dates):
                # Update lags for next prediction
                if i == 0:
                    lag_1 = current_lag_1
                    lag_7 = current_lag_7
                else:
                    lag_1 = future_predictions[i - 1]["predicted_quantity"]
                    lag_7 = (
                        future_predictions[i - 6]["predicted_quantity"] if i >= 6 else current_lag_7
                    )

                # Predict
                features = [
                    date.dayofweek,
                    date.month,
                    lag_1,
                    lag_7,
                    current_rolling_7,
                    current_rolling_14,
                    current_rolling_std_7,
                ]

                prediction = max(0, model.predict([features])[0])  # Ensure non-negative

                future_predictions.append(
                    {
                        "date": date.strftime("%Y-%m-%d"),
                        "predicted_quantity": round(prediction, 2),
                        "day_of_week": date.dayofweek,
                        "month": date.month,
                    }
                )

                # Update rolling means for next iteration
                if i > 0:
                    current_rolling_7 = (current_rolling_7 * 6 + prediction) / 7
                    current_rolling_14 = (current_rolling_14 * 13 + prediction) / 14

            # Calculate model performance
            try:
                y_pred = model.predict(X)
            except Exception:
                # If external model has different interface, fallback to zeros
                y_pred = np.zeros_like(y)
            mae = mean_absolute_error(y, y_pred)
            r2 = r2_score(y, y_pred)

            return {
                "success": True,
                "model_accuracy": round(r2, 3),
                "mean_absolute_error": round(mae, 3),
                "predictions": future_predictions,
                "total_predicted_demand": sum(p["predicted_quantity"] for p in future_predictions),
                "avg_daily_demand": sum(p["predicted_quantity"] for p in future_predictions)
                / len(future_predictions),
                "historical_data_points": len(daily_sales),
                "last_actual_sale": (
                    daily_sales["total_quantity"].iloc[-1] if len(daily_sales) > 0 else 0
                ),
            }

        except Exception as e:
            return {
                "success": False,
                "message": f"Error in demand prediction: {str(e)}",
                "predictions": [],
            }

    def optimize_price(self, product_id: int) -> Dict:
        """Optimize product price using real sales data"""
        if not ML_AVAILABLE:
            return {
                "success": False,
                "message": "ML features are not available. Please install required dependencies.",
            }
        try:
            # Get real sales data with price variations
            sales_df = self._get_sales_data(product_id, days=180)

            if sales_df.empty:
                return {
                    "success": False,
                    "message": "No sales data available for price optimization",
                }

            # Get current product info
            product = (
                self.db.query(Product)
                .filter(Product.id == product_id, Product.user_id == self.user_id)
                .first()
            )

            if not product:
                return {"success": False, "message": "Product not found"}

            current_price = product.preco
            current_quantity = product.quantidade

            # Analyze price-quantity relationship
            price_analysis = (
                sales_df.groupby("preco_unitario")
                .agg({"quantidade": ["sum", "count", "mean"], "preco_total": "sum"})
                .reset_index()
            )

            price_analysis.columns = [
                "price",
                "total_quantity",
                "sales_count",
                "avg_quantity",
                "total_revenue",
            ]

            if len(price_analysis) < 2:
                return {
                    "success": False,
                    "message": "Insufficient price variation for optimization",
                }

            # Calculate price elasticity
            X = price_analysis["price"].values.reshape(-1, 1)
            y = price_analysis["total_quantity"].values

            # Train price-demand model
            model = LinearRegression()
            model.fit(X, y)

            # Generate price scenarios
            min_price = max(0.1, current_price * 0.7)
            max_price = current_price * 1.5
            price_scenarios = np.linspace(min_price, max_price, 20)
            revenue_scenarios = []

            for price in price_scenarios:
                predicted_quantity = max(0, model.predict([[price]])[0])
                revenue = price * predicted_quantity
                revenue_scenarios.append(
                    {
                        "price": round(price, 2),
                        "predicted_quantity": round(predicted_quantity, 2),
                        "revenue": round(revenue, 2),
                    }
                )

            # Find optimal price
            optimal_scenario = max(revenue_scenarios, key=lambda x: x["revenue"])

            # Calculate price elasticity
            elasticity = (
                model.coef_[0] * (current_price / current_quantity) if current_quantity > 0 else 0
            )

            # Calculate revenue impact
            current_revenue = current_price * current_quantity
            revenue_increase = (
                ((optimal_scenario["revenue"] - current_revenue) / current_revenue * 100)
                if current_revenue > 0
                else 0
            )

            return {
                "success": True,
                "current_price": current_price,
                "optimal_price": optimal_scenario["price"],
                "price_elasticity": round(elasticity, 3),
                "revenue_increase": round(revenue_increase, 2),
                "price_scenarios": revenue_scenarios,
                "model_accuracy": round(model.score(X, y), 3),
                "data_points": len(price_analysis),
            }

        except Exception as e:
            return {"success": False, "message": f"Error in price optimization: {str(e)}"}

    def detect_anomalies(self, product_id: Optional[int] = None) -> Dict:
        """Detect anomalies in real sales patterns"""
        if not ML_AVAILABLE:
            return {
                "success": False,
                "message": "ML features are not available. Please install required dependencies.",
            }
        try:
            # Get real sales data
            sales_df = self._get_sales_data(product_id, days=90)

            if sales_df.empty:
                return {
                    "success": False,
                    "message": "No sales data available for anomaly detection",
                }

            # Prepare features for anomaly detection
            daily_features = (
                sales_df.groupby("data")
                .agg({"quantidade": ["sum", "count", "std"], "preco_total": ["sum", "mean"]})
                .reset_index()
            )

            daily_features.columns = [
                "data",
                "total_quantity",
                "sales_count",
                "quantity_std",
                "total_revenue",
                "avg_revenue",
            ]
            daily_features = daily_features.fillna(0)

            if len(daily_features) < 7:
                return {
                    "success": False,
                    "message": "Need at least 7 days of data for anomaly detection",
                }

            # Normalize features
            scaler = StandardScaler()
            features = [
                "total_quantity",
                "sales_count",
                "quantity_std",
                "total_revenue",
                "avg_revenue",
            ]
            X_scaled = scaler.fit_transform(daily_features[features])

            # Train isolation forest
            contamination = min(0.1, max(0.05, 1.0 / len(daily_features)))  # Adaptive contamination
            iso_forest = IsolationForest(contamination=contamination, random_state=42)
            anomalies = iso_forest.fit_predict(X_scaled)

            # Get anomaly dates
            anomaly_dates = daily_features[anomalies == -1]["data"].tolist()
            anomaly_scores = iso_forest.decision_function(X_scaled)

            # Get detailed anomaly information
            anomaly_details = []
            for i, (idx, row) in enumerate(daily_features.iterrows()):
                if anomalies[i] == -1:
                    anomaly_details.append(
                        {
                            "date": row["data"].strftime("%Y-%m-%d"),
                            "total_quantity": row["total_quantity"],
                            "sales_count": row["sales_count"],
                            "total_revenue": row["total_revenue"],
                            "anomaly_score": round(anomaly_scores[i], 3),
                        }
                    )

            return {
                "success": True,
                "total_anomalies": len(anomaly_dates),
                "anomaly_dates": [d.strftime("%Y-%m-%d") for d in anomaly_dates],
                "anomaly_details": anomaly_details,
                "model_contamination": contamination,
                "data_points": len(daily_features),
            }

        except Exception as e:
            return {"success": False, "message": f"Error in anomaly detection: {str(e)}"}

    def get_stock_optimization(self, product_id: int) -> Dict:
        """Get stock optimization recommendations based on real data"""
        if not ML_AVAILABLE:
            return {
                "success": False,
                "message": "ML features are not available. Please install required dependencies.",
            }
        try:
            # Get product info
            product = (
                self.db.query(Product)
                .filter(Product.id == product_id, Product.user_id == self.user_id)
                .first()
            )

            if not product:
                return {"success": False, "message": "Product not found"}

            # Get demand prediction
            demand_prediction = self.predict_demand(product_id, days_ahead=30)

            if not demand_prediction.get("success"):
                return {
                    "success": False,
                    "message": "Cannot optimize stock without demand prediction",
                }

            avg_daily_demand = demand_prediction.get("avg_daily_demand", 0)
            lead_time_days = product.lead_time_days or 7
            safety_stock = product.safety_stock or 2

            # Calculate optimal stock levels
            reorder_point = (avg_daily_demand * lead_time_days) + safety_stock
            optimal_stock = reorder_point * 1.5  # 1.5x reorder point for buffer

            # Calculate current stock status
            current_stock = product.quantidade
            stock_cover_days = (
                current_stock / avg_daily_demand if avg_daily_demand > 0 else float("inf")
            )

            # Get recent stock movements
            movements_df = self._get_stock_movements(product_id, days=30)
            recent_movements = len(movements_df) if not movements_df.empty else 0

            return {
                "success": True,
                "current_stock": current_stock,
                "reorder_point": round(reorder_point, 2),
                "optimal_stock": round(optimal_stock, 2),
                "stock_cover_days": round(stock_cover_days, 1),
                "avg_daily_demand": round(avg_daily_demand, 2),
                "lead_time_days": lead_time_days,
                "safety_stock": safety_stock,
                "recent_movements": recent_movements,
                "recommendations": self._generate_stock_recommendations(
                    current_stock, reorder_point, stock_cover_days, avg_daily_demand
                ),
            }

        except Exception as e:
            return {"success": False, "message": f"Error in stock optimization: {str(e)}"}

    def _generate_stock_recommendations(
        self, current_stock: float, reorder_point: float, stock_cover_days: float, avg_demand: float
    ) -> List[Dict]:
        """Generate stock recommendations based on real data"""
        recommendations = []

        if current_stock <= 0:
            recommendations.append(
                {
                    "type": "critical",
                    "message": "Product is out of stock",
                    "action": "Immediate restocking required",
                }
            )
        elif current_stock <= reorder_point:
            recommendations.append(
                {
                    "type": "high",
                    "message": f"Stock below reorder point ({reorder_point:.1f})",
                    "action": "Order more stock soon",
                }
            )

        if stock_cover_days < 7:
            recommendations.append(
                {
                    "type": "medium",
                    "message": f"Low stock coverage ({stock_cover_days:.1f} days)",
                    "action": "Consider increasing stock levels",
                }
            )
        elif stock_cover_days > 60:
            recommendations.append(
                {
                    "type": "low",
                    "message": f"High stock coverage ({stock_cover_days:.1f} days)",
                    "action": "Consider reducing stock levels",
                }
            )

        if avg_demand > 5:
            recommendations.append(
                {
                    "type": "info",
                    "message": f"High demand product ({avg_demand:.1f} units/day)",
                    "action": "Monitor stock levels closely",
                }
            )

        return recommendations

    def get_product_insights_summary(self, product_id: int) -> Dict:
        """Get comprehensive ML insights for a product using real data"""
        demand_prediction = self.predict_demand(product_id, days_ahead=30)
        price_optimization = self.optimize_price(product_id)
        anomalies = self.detect_anomalies(product_id)
        stock_optimization = self.get_stock_optimization(product_id)

        return {
            "product_id": product_id,
            "demand_prediction": demand_prediction,
            "price_optimization": price_optimization,
            "anomaly_detection": anomalies,
            "stock_optimization": stock_optimization,
            "summary": {
                "has_sufficient_data": demand_prediction.get("success", False),
                "recommended_actions": self._generate_ml_recommendations(
                    demand_prediction, price_optimization, anomalies, stock_optimization
                ),
            },
        }

    def _generate_ml_recommendations(
        self,
        demand_prediction: Dict,
        price_optimization: Dict,
        anomalies: Dict,
        stock_optimization: Dict,
    ) -> List[Dict]:
        """Generate recommendations based on real ML analysis"""
        recommendations = []

        # Demand-based recommendations
        if demand_prediction.get("success"):
            avg_demand = demand_prediction.get("avg_daily_demand", 0)
            total_demand = demand_prediction.get("total_predicted_demand", 0)

            if avg_demand > 3:
                recommendations.append(
                    {
                        "type": "demand",
                        "priority": "high",
                        "message": f"High demand predicted: {avg_demand:.1f} units/day",
                        "action": "Consider increasing stock levels",
                    }
                )
            elif avg_demand < 0.5:
                recommendations.append(
                    {
                        "type": "demand",
                        "priority": "medium",
                        "message": f"Low demand predicted: {avg_demand:.1f} units/day",
                        "action": "Consider promotional activities",
                    }
                )

        # Price optimization recommendations
        if price_optimization.get("success"):
            revenue_increase = price_optimization.get("revenue_increase", 0)
            optimal_price = price_optimization.get("optimal_price", 0)
            current_price = price_optimization.get("current_price", 0)

            if revenue_increase > 10:
                recommendations.append(
                    {
                        "type": "pricing",
                        "priority": "high",
                        "message": f"Price optimization could increase revenue by {revenue_increase}%",
                        "action": f"Consider adjusting price from R${current_price} to R${optimal_price}",
                    }
                )

        # Stock optimization recommendations
        if stock_optimization.get("success"):
            stock_recs = stock_optimization.get("recommendations", [])
            recommendations.extend(stock_recs)

        # Anomaly-based recommendations
        if anomalies.get("success") and anomalies.get("total_anomalies", 0) > 0:
            recommendations.append(
                {
                    "type": "anomaly",
                    "priority": "medium",
                    "message": f"Detected {anomalies['total_anomalies']} sales anomalies",
                    "action": "Review sales patterns for unusual activity",
                }
            )

        return recommendations
