from fastapi.openapi.utils import get_openapi
import sys
from pathlib import Path

# Ensure project root is on sys.path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import main

print('Generating OpenAPI schema...')
schema = get_openapi(title=main.app.title, version=main.app.version, routes=main.app.routes)
print('Schema generated. Top-level keys:')
print(list(schema.keys()))
print('Paths count:', len(schema.get('paths', {})))
