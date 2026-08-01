from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings


def get_real_client_ip(request: Request) -> str:
    """
    Extract real client IP address safely behind reverse proxies (Render, Vercel, etc.).
    
    Render's edge load balancer appends the verified client IP to the END (rightmost)
    of the X-Forwarded-For header chain. Blindly taking index [0] allows clients to 
    spoof fake IPs by prepending arbitrary IP strings in the header.
    
    Order of precedence:
    1. X-Real-IP (if provided by reverse proxy)
    2. Rightmost IP in X-Forwarded-For (appended by the trusted edge proxy)
    3. Direct client remote address fallback
    """
    real_ip = request.headers.get("X-Real-IP")
    if real_ip and real_ip.strip():
        return real_ip.strip()

    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded and forwarded.strip():
        # X-Forwarded-For chain: "spoofed_client_ip, intermediate_proxy, REAL_CLIENT_IP"
        # Taking ips[-1] returns the IP appended by the nearest trusted edge load balancer.
        ips = [ip.strip() for ip in forwarded.split(",") if ip.strip()]
        if ips:
            return ips[-1]

    return get_remote_address(request)


limiter = Limiter(
    key_func=get_real_client_ip,
    default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"],
)
