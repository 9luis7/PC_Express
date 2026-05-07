import logging
import os

# Logging básico do backend. Em produção, suba o nível via env LOG_LEVEL.
_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=_LEVEL,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
