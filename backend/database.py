"""SQLite helpers for NSAT: schema creation, users and scan history."""

import json
import os
import sqlite3

from werkzeug.security import generate_password_hash

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "nsat.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS scans (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_ip       TEXT    NOT NULL,
    is_online       INTEGER NOT NULL,
    open_ports_json TEXT    NOT NULL,
    risk_score      INTEGER NOT NULL,
    risk_level      TEXT    NOT NULL,
    duration_ms     INTEGER NOT NULL,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_scans_user ON scans(user_id, created_at DESC);
"""

DEFAULT_USER = ("admin", "nsat@123")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    """Create tables and seed the default analyst account."""
    with get_connection() as conn:
        conn.executescript(SCHEMA)
        exists = conn.execute(
            "SELECT 1 FROM users WHERE username = ?", (DEFAULT_USER[0],)
        ).fetchone()
        if not exists:
            conn.execute(
                "INSERT INTO users (username, password_hash) VALUES (?, ?)",
                (DEFAULT_USER[0], generate_password_hash(DEFAULT_USER[1])),
            )


def get_user(username: str):
    with get_connection() as conn:
        return conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()


def create_user(username: str, password: str) -> int:
    with get_connection() as conn:
        cur = conn.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (username, generate_password_hash(password)),
        )
        return cur.lastrowid


def insert_scan(
    user_id: int,
    target_ip: str,
    is_online: bool,
    open_ports: list,
    risk_score: int,
    risk_level: str,
    duration_ms: int,
) -> int:
    with get_connection() as conn:
        cur = conn.execute(
            """INSERT INTO scans
               (user_id, target_ip, is_online, open_ports_json,
                risk_score, risk_level, duration_ms)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                target_ip,
                1 if is_online else 0,
                json.dumps(open_ports),
                risk_score,
                risk_level,
                duration_ms,
            ),
        )
        return cur.lastrowid


def list_scans(user_id: int, limit: int = 100):
    with get_connection() as conn:
        return conn.execute(
            "SELECT * FROM scans WHERE user_id = ? ORDER BY id DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()


def get_scan(scan_id: int, user_id: int):
    with get_connection() as conn:
        return conn.execute(
            "SELECT * FROM scans WHERE id = ? AND user_id = ?", (scan_id, user_id)
        ).fetchone()


def clear_scans(user_id: int) -> None:
    with get_connection() as conn:
        conn.execute("DELETE FROM scans WHERE user_id = ?", (user_id,))


def get_stats(user_id: int) -> dict:
    """Aggregate numbers used by the dashboard cards and charts."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT is_online, open_ports_json, risk_score, risk_level, target_ip, created_at"
            " FROM scans WHERE user_id = ? ORDER BY id DESC",
            (user_id,),
        ).fetchall()

    total = len(rows)
    online = sum(1 for r in rows if r["is_online"])
    ports = [json.loads(r["open_ports_json"]) for r in rows]
    open_ports = sum(len(p) for p in ports)
    avg_score = round(sum(r["risk_score"] for r in rows) / total) if total else 0
    high_risk = sum(1 for r in rows if r["risk_level"] in ("High", "Critical"))

    # Service frequency for the bar chart
    service_counts: dict[str, int] = {}
    for port_list in ports:
        for port in port_list:
            service_counts[port["service"]] = service_counts.get(port["service"], 0) + 1

    top_services = sorted(service_counts.items(), key=lambda kv: kv[1], reverse=True)[:7]

    # Last 10 scores (oldest -> newest) for the trend line
    trend = [r["risk_score"] for r in rows[:10]][::-1]

    return {
        "total": total,
        "online": online,
        "open_ports": open_ports,
        "avg_score": avg_score,
        "high_risk": high_risk,
        "top_services": [{"service": s, "count": c} for s, c in top_services],
        "trend": trend,
        "recent": [
            {
                "target": r["target_ip"],
                "score": r["risk_score"],
                "level": r["risk_level"],
                "created_at": r["created_at"],
                "open_ports": len(json.loads(r["open_ports_json"])),
            }
            for r in rows[:5]
        ],
    }
