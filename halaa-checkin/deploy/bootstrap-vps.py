#!/usr/bin/env python3
"""Generate private configuration once, on the VPS; never prints secrets."""
import json
import os
from pathlib import Path
import secrets

os.umask(0o077)
root = Path('/opt/halaa-checkin')
root.mkdir(parents=True, exist_ok=True)
private = root / 'secrets'
private.mkdir(mode=0o700, exist_ok=True)

def create(path, value, mode=0o600):
    if not path.exists():
        with path.open('x') as file:
            file.write(value)
        path.chmod(mode)

create(private / 'keyfile', secrets.token_urlsafe(512).replace('-', 'a').replace('_', 'b'), 0o400)
os.chown(private / 'keyfile', 999, 999)
create(private / 'mongo-admin.json', json.dumps({'user': 'checkin_operator', 'password': secrets.token_hex(32)}))
create(private / 'mongo-app.json', json.dumps({'user': 'checkin_app', 'password': secrets.token_hex(32)}))
app = json.loads((private / 'mongo-app.json').read_text())
create(root / 'config.env', '\n'.join([
    'NODE_ENV=production',
    'APP_ORIGIN=https://checkin.halaa.com.sa',
    'MONGODB_DB_NAME=halaa_checkin_prod',
    f'MONGODB_URI=mongodb://{app["user"]}:{app["password"]}@checkin-mongo:27017/halaa_checkin_prod?replicaSet=checkin-rs&authSource=halaa_checkin_prod',
    f'SESSION_SECRET={secrets.token_hex(48)}',
    'DEMO_SEED_ENABLED=false',
    '',
]))
print('Private VPS configuration is ready (existing credentials preserved).')
