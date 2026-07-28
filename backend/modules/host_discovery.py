"""
Module 1 — Host Discovery.

Uses Scapy to determine whether a target host is online:
  * On the local subnet an ARP request is the most reliable probe because a
    host must answer ARP even when it drops ICMP.
  * If ARP produces no answer (target is off-link, or we lack raw-socket
    privileges) we fall back to a plain ICMP echo request.

Raw packet crafting requires administrator/root privileges.
"""

import socket
import time

try:
    from scapy.all import ARP, ICMP, IP, Ether, conf, sr1, srp

    SCAPY_AVAILABLE = True
    conf.verb = 0  # silence Scapy's own output
except Exception:  # pragma: no cover - Scapy missing on the dev machine
    SCAPY_AVAILABLE = False


def _resolve_hostname(ip: str) -> str:
    """Reverse DNS lookup; falls back to 'unresolved'."""
    try:
        return socket.gethostbyaddr(ip)[0]
    except Exception:
        return "unresolved"


def _arp_probe(ip: str, timeout: int = 2):
    """Layer-2 ARP who-has probe. Returns latency in ms or None."""
    packet = Ether(dst="ff:ff:ff:ff:ff:ff") / ARP(pdst=ip)
    start = time.time()
    answered, _ = srp(packet, timeout=timeout, verbose=0)
    if answered:
        return round((time.time() - start) * 1000, 2)
    return None


def _icmp_probe(ip: str, timeout: int = 2):
    """Layer-3 ICMP echo probe. Returns latency in ms or None."""
    start = time.time()
    reply = sr1(IP(dst=ip) / ICMP(), timeout=timeout, verbose=0)
    if reply is not None:
        return round((time.time() - start) * 1000, 2)
    return None


def discover_host(ip: str) -> dict:
    """
    Probe a single host.

    Returns:
        {"online": bool, "method": str, "latency_ms": float, "hostname": str}
    """
    if not SCAPY_AVAILABLE:
        return {
            "online": False,
            "method": "unavailable",
            "latency_ms": 0,
            "hostname": "unresolved",
            "error": "Scapy is not installed or raw sockets are unavailable.",
        }

    latency = _arp_probe(ip)
    method = "arp"

    if latency is None:
        latency = _icmp_probe(ip)
        method = "icmp"

    online = latency is not None
    return {
        "online": online,
        "method": method if online else "none",
        "latency_ms": latency or 0,
        "hostname": _resolve_hostname(ip) if online else "unresolved",
    }
