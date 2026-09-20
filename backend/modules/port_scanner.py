"""
Module 2 — Port Scanning.

Wraps python-nmap to scan a curated list of commonly abused TCP ports and
return the open ones together with the detected service and version banner.

Requires the `nmap` binary to be installed on the host machine.
"""

try:
    import nmap

    NMAP_AVAILABLE = True
except Exception:  # pragma: no cover
    NMAP_AVAILABLE = False

from modules.risk_engine import SERVICE_RISK

# Same port list used by the risk engine, so every scanned port has a weight.
COMMON_PORTS = sorted(SERVICE_RISK.keys())
PORT_ARG = ",".join(str(p) for p in COMMON_PORTS)


def scan_ports(ip: str, ports: str = PORT_ARG) -> list:
    """
    Run an nmap service-version scan against `ip`.

    Returns a list of dicts:
        {"port", "protocol", "state", "service", "version", "weight", "note"}
    """
    if not NMAP_AVAILABLE:
        return []

    scanner = nmap.PortScanner()
    try:
        # -sV service/version detection, -Pn skips host discovery (module 1
        # already answered that question), -T4 keeps the demo responsive.
        scanner.scan(hosts=ip, ports=ports, arguments="-sV -Pn -T4")
    except Exception:
        return []

    if ip not in scanner.all_hosts():
        return []

    results = []
    for protocol in scanner[ip].all_protocols():
        for port in sorted(scanner[ip][protocol].keys()):
            info = scanner[ip][protocol][port]
            if info.get("state") != "open":
                continue

            meta = SERVICE_RISK.get(port, {})
            product = " ".join(
                part for part in (info.get("product", ""), info.get("version", "")) if part
            ).strip()

            results.append(
                {
                    "port": port,
                    "protocol": protocol,
                    "state": "open",
                    "service": info.get("name") or meta.get("service", "unknown"),
                    "version": product or "unknown",
                    "weight": meta.get("weight", 10),
                    "note": meta.get("note", "Unrecognised service — review manually."),
                }
            )

    return results
