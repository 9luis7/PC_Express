import logging

from app import models
from app.database import SessionLocal

logger = logging.getLogger(__name__)


def run():
    db = SessionLocal()
    try:
        user = db.query(models.User).first()
        if not user:
            logger.error("Nenhum usuário encontrado. Crie um usuário primeiro.")
            return

        logger.info("Seed para usuário: %s", user.email)

        # Fornecedores
        forn1 = models.Supplier(
            user_id=user.id,
            nome="Tech Distribuidora",
            email="contato@techdist.com",
            telefone="(11) 3333-0000",
        )
        forn2 = models.Supplier(
            user_id=user.id,
            nome="PC Parts Brasil",
            email="vendas@pcparts.com.br",
            telefone="(11) 4444-1111",
        )
        forn3 = models.Supplier(
            user_id=user.id,
            nome="TechParts Ltda",
            email="contato@techparts.com",
            telefone="(11) 5555-2222",
        )
        db.add_all([forn1, forn2, forn3])
        db.commit()
        db.refresh(forn1)
        db.refresh(forn2)
        db.refresh(forn3)

        # Produtos com preços realistas
        produtos = [
            # Processadores
            models.Product(
                user_id=user.id,
                codigo="CPU-001",
                nome="AMD Ryzen 5 5600",
                categoria="processador",
                quantidade=22,
                preco=899.90,
                estoque_minimo=3,
                fornecedor_id=forn1.id,
                descricao="AM4, 6c/12t",
            ),
            models.Product(
                user_id=user.id,
                codigo="CPU-002",
                nome="Intel Core i5-12400F",
                categoria="processador",
                quantidade=15,
                preco=1099.90,
                estoque_minimo=3,
                fornecedor_id=forn1.id,
                descricao="LGA1700, 6c/12t",
            ),
            models.Product(
                user_id=user.id,
                codigo="CPU-003",
                nome="AMD Ryzen 7 5800X",
                categoria="processador",
                quantidade=8,
                preco=1599.90,
                estoque_minimo=2,
                fornecedor_id=forn1.id,
                descricao="AM4, 8c/16t",
            ),
            # Placas-mãe
            models.Product(
                user_id=user.id,
                codigo="MB-001",
                nome="ASUS Prime B550M",
                categoria="placa-mae",
                quantidade=0,
                preco=799.90,
                estoque_minimo=2,
                fornecedor_id=forn1.id,
                descricao="AM4, mATX",
            ),
            models.Product(
                user_id=user.id,
                codigo="MB-002",
                nome="MSI B660M-A WiFi",
                categoria="placa-mae",
                quantidade=12,
                preco=899.90,
                estoque_minimo=2,
                fornecedor_id=forn2.id,
                descricao="LGA1700, mATX",
            ),
            models.Product(
                user_id=user.id,
                codigo="MB-003",
                nome="Gigabyte X570 Aorus Elite",
                categoria="placa-mae",
                quantidade=6,
                preco=1299.90,
                estoque_minimo=1,
                fornecedor_id=forn1.id,
                descricao="AM4, ATX",
            ),
            # Memórias
            models.Product(
                user_id=user.id,
                codigo="RAM-001",
                nome="Corsair Vengeance 16GB (2x8) 3200MHz",
                categoria="memoria",
                quantidade=13,
                preco=349.90,
                estoque_minimo=8,
                fornecedor_id=forn2.id,
                descricao="DDR4, CL16",
            ),
            models.Product(
                user_id=user.id,
                codigo="RAM-002",
                nome="Kingston Fury 32GB (2x16) 3600MHz",
                categoria="memoria",
                quantidade=8,
                preco=699.90,
                estoque_minimo=4,
                fornecedor_id=forn2.id,
                descricao="DDR4, CL18",
            ),
            models.Product(
                user_id=user.id,
                codigo="RAM-003",
                nome="G.Skill Ripjaws 8GB 2666MHz",
                categoria="memoria",
                quantidade=25,
                preco=199.90,
                estoque_minimo=10,
                fornecedor_id=forn3.id,
                descricao="DDR4, CL19",
            ),
            # Armazenamento
            models.Product(
                user_id=user.id,
                codigo="SSD-001",
                nome="SSD NVMe 1TB Kingston",
                categoria="armazenamento",
                quantidade=3,
                preco=429.90,
                estoque_minimo=5,
                fornecedor_id=forn2.id,
                descricao="NVMe, 3500MB/s",
            ),
            models.Product(
                user_id=user.id,
                codigo="SSD-002",
                nome="SSD SATA 500GB Samsung",
                categoria="armazenamento",
                quantidade=18,
                preco=299.90,
                estoque_minimo=8,
                fornecedor_id=forn2.id,
                descricao="SATA III, 550MB/s",
            ),
            models.Product(
                user_id=user.id,
                codigo="HDD-001",
                nome="HD 1TB Seagate Barracuda",
                categoria="armazenamento",
                quantidade=30,
                preco=199.90,
                estoque_minimo=15,
                fornecedor_id=forn3.id,
                descricao="7200RPM, SATA III",
            ),
            # Placas de Vídeo
            models.Product(
                user_id=user.id,
                codigo="GPU-001",
                nome="NVIDIA RTX 4060 8GB",
                categoria="placa-de-video",
                quantidade=0,
                preco=2199.90,
                estoque_minimo=3,
                fornecedor_id=forn1.id,
                descricao="GDDR6, Ray Tracing",
            ),
            models.Product(
                user_id=user.id,
                codigo="GPU-002",
                nome="AMD RX 6600 8GB",
                categoria="placa-de-video",
                quantidade=5,
                preco=1899.90,
                estoque_minimo=2,
                fornecedor_id=forn1.id,
                descricao="GDDR6, FSR",
            ),
            models.Product(
                user_id=user.id,
                codigo="GPU-003",
                nome="NVIDIA GTX 1660 Super 6GB",
                categoria="placa-de-video",
                quantidade=8,
                preco=1299.90,
                estoque_minimo=3,
                fornecedor_id=forn2.id,
                descricao="GDDR6",
            ),
            # Fontes
            models.Product(
                user_id=user.id,
                codigo="PSU-001",
                nome="Fonte 650W 80+ Bronze",
                categoria="fonte",
                quantidade=1,
                preco=299.90,
                estoque_minimo=4,
                fornecedor_id=forn2.id,
                descricao="Semi-modular",
            ),
            models.Product(
                user_id=user.id,
                codigo="PSU-002",
                nome="Fonte 750W 80+ Gold",
                categoria="fonte",
                quantidade=6,
                preco=499.90,
                estoque_minimo=2,
                fornecedor_id=forn1.id,
                descricao="Full modular",
            ),
            models.Product(
                user_id=user.id,
                codigo="PSU-003",
                nome="Fonte 550W 80+ White",
                categoria="fonte",
                quantidade=20,
                preco=199.90,
                estoque_minimo=8,
                fornecedor_id=forn3.id,
                descricao="Básica",
            ),
            # Coolers
            models.Product(
                user_id=user.id,
                codigo="COOLER-001",
                nome="Cooler CPU Hyper 212",
                categoria="cooler",
                quantidade=0,
                preco=199.90,
                estoque_minimo=5,
                fornecedor_id=forn2.id,
                descricao="Air cooling",
            ),
            models.Product(
                user_id=user.id,
                codigo="COOLER-002",
                nome="Water Cooler 240mm",
                categoria="cooler",
                quantidade=4,
                preco=399.90,
                estoque_minimo=2,
                fornecedor_id=forn1.id,
                descricao="AIO liquid",
            ),
            # Gabinetes
            models.Product(
                user_id=user.id,
                codigo="CASE-001",
                nome="Gabinete ATX Mid Tower",
                categoria="gabinete",
                quantidade=12,
                preco=249.90,
                estoque_minimo=5,
                fornecedor_id=forn3.id,
                descricao="Com fans",
            ),
            models.Product(
                user_id=user.id,
                codigo="CASE-002",
                nome="Gabinete mATX Mini Tower",
                categoria="gabinete",
                quantidade=8,
                preco=179.90,
                estoque_minimo=3,
                fornecedor_id=forn3.id,
                descricao="Compacto",
            ),
            # Periféricos
            models.Product(
                user_id=user.id,
                codigo="KB-001",
                nome="Teclado Mecânico RGB",
                categoria="perifericos",
                quantidade=35,
                preco=299.90,
                estoque_minimo=15,
                fornecedor_id=forn3.id,
                descricao="Switches Blue",
            ),
            models.Product(
                user_id=user.id,
                codigo="MOUSE-001",
                nome="Mouse Gamer 16000 DPI",
                categoria="perifericos",
                quantidade=42,
                preco=149.90,
                estoque_minimo=20,
                fornecedor_id=forn3.id,
                descricao="RGB, 6 botões",
            ),
            models.Product(
                user_id=user.id,
                codigo="MONITOR-001",
                nome='Monitor 24" 144Hz',
                categoria="perifericos",
                quantidade=6,
                preco=899.90,
                estoque_minimo=3,
                fornecedor_id=forn2.id,
                descricao="Full HD, IPS",
            ),
        ]
        db.add_all(produtos)
        db.commit()

        logger.info("Seed concluído: %d produtos criados.", len(produtos))
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    run()
