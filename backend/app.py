"""
NSAT — Network Security Audit Tool
Flask application entry point.

Routes are grouped into two families:
  * page routes   -> serve the static HTML pages from ../frontend
  * /api/* routes -> JSON endpoints consumed by frontend/js/app.js

Run with:  python app.py       (needs root/administrator for raw packets)
"""

import json
import os
import time
from functools import wraps

from flask import (
    Flask,
    jsonify,
    request,
    send_from_directory,
    session,
    send_file,
)
from werkzeug.security import check_password_hash

import database
from modules.host_discovery import discover_host
from modules.port_scanner import scan_ports
from modules.risk_engine import assess_risk, build_recommendations
from report import build_pdf

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend")

app = Flask(__name__, static_folder=None)
app.secret_key = os.environ.get("NSAT_SECRET_KEY", "change-me-in-production")

# Create tables and the default analyst account on first run.
database.init_db()


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def login_required(view):
    """Reject API calls that have no authenticated session."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Authentication required"}), 401
        return view(*args, **kwargs)

    return wrapper


def valid_ipv4(value: str) -> bool:
    parts = value.strip().split(".")
    if len(parts) != 4:
        return False
    return all(p.isdigit() and 0 <= int(p) <= 255 for p in parts)


# --------------------------------------------------------------------------- #
# Page routes
# --------------------------------------------------------------------------- #
@app.route("/")
def page_login():
    return send_from_directory(FRONTEND_DIR, "login.html")


@app.route("/<page>.html")
def page_any(page):
    return send_from_directory(FRONTEND_DIR, f"{page}.html")


@app.route("/css/<path:filename>")
def static_css(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, "css"), filename)


@app.route("/js/<path:filename>")
def static_js(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, "js"), filename)


# --------------------------------------------------------------------------- #
# Auth API
# --------------------------------------------------------------------------- #
@app.post("/api/login")
def api_login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()[:64]
    password = (data.get("password") or "")[:128]

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    user = database.get_user(username)
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid credentials"}), 401

    session["user_id"] = user["id"]
    session["username"] = user["username"]
    return jsonify({"username": user["username"]})


@app.post("/api/logout")
def api_logout():
    session.clear()
    return jsonify({"ok": True})


@app.get("/api/me")
def api_me():
    if "user_id" not in session:
        return jsonify({"error": "Not signed in"}), 401
    return jsonify({"username": session["username"]})


# --------------------------------------------------------------------------- #
# Scan API — orchestrates the three core modules
# --------------------------------------------------------------------------- #
@app.post("/api/scan")
@login_required
def api_scan():
    data = request.get_json(silent=True) or {}
    target = (data.get("target") or "").strip()

    if not valid_ipv4(target):
        return jsonify({"error": "Enter a valid IPv4 address"}), 400

    started = time.time()

    # Module 1 — host discovery (Scapy)
    discovery = discover_host(target)

    # Module 2 — port scanning (python-nmap), only if the host answered
    ports = scan_ports(target) if discovery["online"] else []

    # Module 3 — risk assessment (custom algorithm)
    score, level = assess_risk(ports)
    recommendations = (
        build_recommendations(ports)
        if discovery["online"]
        else ["Host did not respond to ARP/ICMP probes. Verify it is powered on and routable."]
    )

    duration_ms = int((time.time() - started) * 1000)

    scan_id = database.insert_scan(
        user_id=session["user_id"],
        target_ip=target,
        is_online=discovery["online"],
        open_ports=ports,
        risk_score=score,
        risk_level=level,
        duration_ms=duration_ms,
    )

    return jsonify(
        {
            "id": scan_id,
            "target": target,
            "online": discovery["online"],
            "hostname": discovery["hostname"],
            "latency_ms": discovery["latency_ms"],
            "ports": ports,
            "score": score,
            "level": level,
            "duration_ms": duration_ms,
            "recommendations": recommendations,
        }
    )


# --------------------------------------------------------------------------- #
# Statistics + history API
# --------------------------------------------------------------------------- #
@app.get("/api/stats")
@login_required
def api_stats():
    return jsonify(database.get_stats(session["user_id"]))


@app.get("/api/scans")
@login_required
def api_scans():
    rows = database.list_scans(session["user_id"])
    return jsonify([dict(r) | {"open_ports": json.loads(r["open_ports_json"])} for r in rows])


@app.delete("/api/scans")
@login_required
def api_clear_scans():
    database.clear_scans(session["user_id"])
    return jsonify({"ok": True})


@app.get("/api/report/<int:scan_id>")
@login_required
def api_report(scan_id):
    """Generate and stream a PDF report for a single scan."""
    row = database.get_scan(scan_id, session["user_id"])
    if row is None:
        return jsonify({"error": "Report not found"}), 404

    buffer = build_pdf(row)
    return send_file(
        buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"nsat-report-{row['target_ip']}-{scan_id}.pdf",
    )


if __name__ == "__main__":
    # debug=True is fine for a college demo; disable it for any real deployment.
    app.run(host="127.0.0.1", port=5000, debug=True)
