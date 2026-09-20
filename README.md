# NSAT — Network Security Audit Tool

B.Sc. Computer Science final-year project. A small full-stack tool that discovers
whether a host is online, enumerates its open ports and services, and scores the
resulting exposure with a custom risk algorithm.

## Modules

| # | Module | Technology | File |
|---|--------|-----------|------|
| 1 | Host Discovery | Scapy (ARP + ICMP) | `backend/modules/host_discovery.py` |
| 2 | Port Scanning | python-nmap (`-sV`) | `backend/modules/port_scanner.py` |
| 3 | Risk Assessment | Custom weighted algorithm | `backend/modules/risk_engine.py` |

## Project structure

```
nsat-flask/
├── backend/
│   ├── app.py             Flask app, page routes and JSON API
│   ├── database.py        SQLite schema, users, scan history, statistics
│   ├── report.py          PDF report generation (ReportLab)
│   ├── requirements.txt
│   └── modules/
│       ├── host_discovery.py
│       ├── port_scanner.py
│       └── risk_engine.py
└── frontend/
    ├── login.html  dashboard.html  scan.html  reports.html  about.html
    ├── css/style.css
    └── js/app.js
```

## Setup

```bash
cd nsat-flask/backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Install the `nmap` binary as well (`sudo apt install nmap`, or nmap.org on Windows).

## Run

Raw packet crafting needs elevated privileges:

```bash
sudo python app.py              # Windows: run the terminal as Administrator
```

Then open <http://127.0.0.1:5000>.

Default account: **admin / nsat@123** (seeded on first run, password stored as a
Werkzeug hash).

## Database schema

```sql
users(id, username, password_hash, created_at)

scans(id, user_id, target_ip, is_online, open_ports_json,
      risk_score, risk_level, duration_ms, created_at)
```

## Risk algorithm

```
raw_score = Σ weight(service_i) + max(0, open_ports - 3) × 3
score     = min(100, raw_score)
```

Cleartext / legacy remote-access services carry the heaviest weights
(telnet 30, RDP 28, VNC 27, SMB 26, FTP 22) while encrypted equivalents barely
move the score (HTTPS 2, IMAPS 2, POP3S 2). Bands: 0 Secure, 1–20 Low,
21–45 Moderate, 46–70 High, 71–100 Critical.

## Ethics

Only scan hosts you own or have written authorisation to test. Unauthorised
scanning may be illegal in your jurisdiction.
