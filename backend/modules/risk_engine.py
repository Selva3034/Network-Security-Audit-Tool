"""
Module 3 — Risk Assessment (custom algorithm).

Every service that can be exposed on a network carries a weight expressing how
dangerous that exposure is. Cleartext and legacy remote-access protocols
(Telnet, FTP, RDP, VNC, SMB) score far higher than encrypted equivalents such
as HTTPS, IMAPS or POP3S.

    raw_score = Σ weight(service_i) + max(0, open_ports - 3) * 3
    score     = min(100, raw_score)

The second term is an "exposure penalty": a host with many open ports has a
larger attack surface even when each individual service looks benign.

Bands:  0 Secure | 1-20 Low | 21-45 Moderate | 46-70 High | 71-100 Critical
"""

SERVICE_RISK = {
    21: {"service": "ftp", "weight": 22,
         "note": "Cleartext credentials and data transfer. Replace with SFTP/FTPS."},
    22: {"service": "ssh", "weight": 6,
         "note": "Encrypted, but exposed to brute-force. Enforce key authentication."},
    23: {"service": "telnet", "weight": 30,
         "note": "Cleartext remote shell. Should be disabled immediately."},
    25: {"service": "smtp", "weight": 12,
         "note": "Open relay risk. Require TLS and authentication."},
    53: {"service": "domain", "weight": 8,
         "note": "DNS exposed. Disable recursion for external clients."},
    80: {"service": "http", "weight": 14,
         "note": "Unencrypted web traffic. Redirect all traffic to HTTPS."},
    110: {"service": "pop3", "weight": 16,
          "note": "Cleartext mailbox access. Use POP3S (995)."},
    135: {"service": "msrpc", "weight": 18,
          "note": "Windows RPC exposed. Block at the perimeter firewall."},
    139: {"service": "netbios-ssn", "weight": 20,
          "note": "Legacy NetBIOS session service. Disable SMBv1/NetBIOS."},
    143: {"service": "imap", "weight": 14,
          "note": "Cleartext IMAP. Move clients to IMAPS (993)."},
    443: {"service": "https", "weight": 2,
          "note": "Encrypted web traffic. Keep TLS configuration current."},
    445: {"service": "microsoft-ds", "weight": 26,
          "note": "SMB file sharing exposed — classic ransomware entry point."},
    993: {"service": "imaps", "weight": 2, "note": "Encrypted IMAP. Low risk."},
    995: {"service": "pop3s", "weight": 2, "note": "Encrypted POP3. Low risk."},
    1433: {"service": "ms-sql-s", "weight": 24,
           "note": "Database port reachable. Restrict to the application subnet."},
    3306: {"service": "mysql", "weight": 24,
           "note": "Database port reachable. Bind to localhost or VPN only."},
    3389: {"service": "ms-wbt-server", "weight": 28,
           "note": "RDP exposed to the network. Put behind VPN + MFA."},
    5432: {"service": "postgresql", "weight": 22,
           "note": "PostgreSQL reachable. Enforce TLS and host-based rules."},
    5900: {"service": "vnc", "weight": 27,
           "note": "VNC often ships with weak or no authentication."},
    8080: {"service": "http-proxy", "weight": 15,
           "note": "Alternate HTTP port, frequently an unpatched admin console."},
}

EXPOSURE_FREE_PORTS = 3   # first N open ports incur no exposure penalty
EXPOSURE_STEP = 3         # points added per additional open port


def risk_level(score: int) -> str:
    """Map a numeric score onto a human-readable band."""
    if score == 0:
        return "Secure"
    if score <= 20:
        return "Low"
    if score <= 45:
        return "Moderate"
    if score <= 70:
        return "High"
    return "Critical"


def assess_risk(ports: list) -> tuple:
    """
    Calculate the security score for a list of open ports.

    Args:
        ports: list of dicts produced by modules.port_scanner.scan_ports

    Returns:
        (score, level) where score is 0-100 and level is a band name.
    """
    weight_sum = sum(p.get("weight", 10) for p in ports)
    exposure_penalty = max(0, len(ports) - EXPOSURE_FREE_PORTS) * EXPOSURE_STEP
    score = min(100, round(weight_sum + exposure_penalty))
    return score, risk_level(score)


def build_recommendations(ports: list) -> list:
    """Turn the highest-weight findings into actionable remediation advice."""
    ranked = sorted(ports, key=lambda p: p.get("weight", 0), reverse=True)
    tips = [
        f"Port {p['port']}/{p['service']}: {p['note']}"
        for p in ranked
        if p.get("weight", 0) >= 10
    ]
    if not tips:
        tips.append("No high-risk services detected. Maintain patching and periodic re-scans.")
    tips.append("Enable host-based firewall rules and log all inbound connection attempts.")
    return tips[:6]
