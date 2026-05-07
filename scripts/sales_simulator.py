#!/usr/bin/env python3
"""Simulador de vendas: cria purchase orders aleatórias no PC-Express."""

import asyncio
import logging
import random
import time
from datetime import datetime
from typing import List

from app.database import SessionLocal
from app.models import (
    Product,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseOrderStatus,
    Supplier,
)


logger = logging.getLogger(__name__)


class SalesSimulator:
    def __init__(self, user_id: int = 1):
        self.user_id = user_id
        self.is_running = False
        self.max_pending_orders = 5  # Máximo de POs pendentes
        self.min_interval = 10  # Intervalo mínimo entre vendas (segundos)
        self.max_interval = 30  # Intervalo máximo entre vendas (segundos)

    def get_random_supplier(self, db) -> Supplier:
        """Seleciona um fornecedor aleatório"""
        suppliers = db.query(Supplier).filter(Supplier.user_id == self.user_id).all()
        return random.choice(suppliers) if suppliers else None

    def get_random_products(
        self, db, supplier_id: int, count: int = None
    ) -> List[Product]:
        """Seleciona produtos aleatórios de um fornecedor"""
        products = (
            db.query(Product)
            .filter(
                Product.user_id == self.user_id,
                Product.fornecedor_id == supplier_id,
                Product.quantidade > 0,  # Apenas produtos em estoque
            )
            .all()
        )

        if not products:
            return []

        # Seleciona entre 1 e 4 produtos aleatórios
        if count is None:
            count = random.randint(1, min(4, len(products)))

        return random.sample(products, min(count, len(products)))

    def create_random_purchase_order(self, db) -> PurchaseOrder:
        """Cria uma purchase order aleatória"""
        supplier = self.get_random_supplier(db)
        if not supplier:
            return None

        products = self.get_random_products(db, supplier.id)
        if not products:
            return None

        # Cria a purchase order
        po = PurchaseOrder(
            user_id=self.user_id,
            fornecedor_id=supplier.id,
            status=PurchaseOrderStatus.PENDING_APPROVAL,
            observacoes=f"Venda simulada - {datetime.now().strftime('%d/%m/%Y %H:%M')}",
        )
        db.add(po)
        db.flush()  # Para obter o ID

        # Adiciona itens aleatórios
        total_value = 0
        for product in products:
            # Quantidade aleatória entre 1 e 5
            quantity = random.randint(1, 5)

            item = PurchaseOrderItem(
                purchase_order_id=po.id,
                produto_id=product.id,
                quantidade_solicitada=quantity,
                preco_unitario=product.preco,
            )
            db.add(item)
            total_value += quantity * product.preco

        po.total_value = total_value
        return po

    def get_pending_orders_count(self, db) -> int:
        """Conta quantas purchase orders estão pendentes"""
        return (
            db.query(PurchaseOrder)
            .filter(
                PurchaseOrder.user_id == self.user_id,
                PurchaseOrder.status == PurchaseOrderStatus.PENDING_APPROVAL,
            )
            .count()
        )

    async def run_simulation(self, duration_minutes: int = 10):
        """Executa a simulação por um período determinado"""
        logger.info(
            "Iniciando simulação por %d min (max_pending=%d, intervalo=%d-%ds)",
            duration_minutes,
            self.max_pending_orders,
            self.min_interval,
            self.max_interval,
        )

        self.is_running = True
        start_time = time.time()
        end_time = start_time + (duration_minutes * 60)
        orders_created = 0
        interval = self.min_interval

        try:
            while self.is_running and time.time() < end_time:
                db = SessionLocal()
                try:
                    pending_count = self.get_pending_orders_count(db)

                    if pending_count < self.max_pending_orders:
                        po = self.create_random_purchase_order(db)
                        if po:
                            db.commit()
                            orders_created += 1
                            logger.info(
                                "Venda #%d criada — PO #%s — R$ %.2f",
                                orders_created,
                                po.id,
                                po.total_value,
                            )
                        else:
                            logger.warning(
                                "Não foi possível criar venda (sem produtos/fornecedores)"
                            )
                    else:
                        logger.info(
                            "Aguardando aprovação (%d/%d pendentes)",
                            pending_count,
                            self.max_pending_orders,
                        )

                    interval = random.randint(self.min_interval, self.max_interval)
                    logger.debug("Próxima venda em %ds", interval)

                except Exception:
                    logger.exception("Erro ao criar venda na simulação")
                    db.rollback()
                finally:
                    db.close()

                await asyncio.sleep(interval)

        except KeyboardInterrupt:
            logger.info("Simulação interrompida pelo usuário")

        self.is_running = False
        elapsed_time = (time.time() - start_time) / 60
        logger.info(
            "Simulação finalizada — %.1f min decorridos, %d vendas criadas",
            elapsed_time,
            orders_created,
        )

    def stop_simulation(self):
        """Para a simulação"""
        self.is_running = False
        logger.info("Parando simulação...")


async def main():
    """Função principal para executar a simulação"""
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    simulator = SalesSimulator()

    try:
        await simulator.run_simulation(duration_minutes=10)
    except KeyboardInterrupt:
        simulator.stop_simulation()


if __name__ == "__main__":
    asyncio.run(main())
