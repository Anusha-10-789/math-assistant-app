"""Small JSON documents stored by key — each student's progress, and AI concept
videos cached so they're generated once and reused.

Uses the same storage as accounts (see user_store): Firestore when
FIREBASE_SERVICE_ACCOUNT is set, Postgres when DATABASE_URL is set, otherwise
JSON files under data/kv. Each key is its own document rather than part of
the accounts document, because Firestore caps a document at 1 MiB and test
history (which keeps every question for revision) grows quickly.
"""

import hashlib
import json
import os
import re
import threading
from typing import Any, Optional

import user_store

_DIR = os.path.join(os.path.dirname(__file__), "data", "kv")
_lock = threading.Lock()


def _doc_id(key: str) -> str:
    # Firestore IDs can't contain "/" and file names can't contain much else,
    # so keep a readable prefix and add a hash for uniqueness.
    readable = re.sub(r"[^a-z0-9_-]+", "-", key.lower()).strip("-")[:60]
    return f"{readable}-{hashlib.sha256(key.encode('utf-8')).hexdigest()[:12]}"


def get(key: str) -> Optional[Any]:
    doc_id = _doc_id(key)
    if user_store.FIREBASE_SERVICE_ACCOUNT:
        user_store._fs_doc()  # makes sure the Firebase client is initialised
        snapshot = user_store._fs_client.collection("kv").document(doc_id).get()
        return json.loads(snapshot.to_dict()["value"]) if snapshot.exists else None
    if user_store.DATABASE_URL:
        with user_store._db_connect() as conn:
            conn.execute("CREATE TABLE IF NOT EXISTS app_store (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
            row = conn.execute("SELECT value FROM app_store WHERE key = %s", (f"kv:{doc_id}",)).fetchone()
        return json.loads(row[0]) if row else None
    path = os.path.join(_DIR, f"{doc_id}.json")
    with _lock:
        if not os.path.exists(path):
            return None
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)


def put(key: str, value: Any) -> None:
    doc_id = _doc_id(key)
    raw = json.dumps(value)
    if user_store.FIREBASE_SERVICE_ACCOUNT:
        user_store._fs_doc()
        user_store._fs_client.collection("kv").document(doc_id).set({"key": key, "value": raw})
        return
    if user_store.DATABASE_URL:
        with user_store._db_connect() as conn:
            conn.execute("CREATE TABLE IF NOT EXISTS app_store (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
            conn.execute(
                "INSERT INTO app_store (key, value) VALUES (%s, %s) "
                "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
                (f"kv:{doc_id}", raw),
            )
        return
    with _lock:
        os.makedirs(_DIR, exist_ok=True)
        with open(os.path.join(_DIR, f"{doc_id}.json"), "w", encoding="utf-8") as f:
            f.write(raw)
