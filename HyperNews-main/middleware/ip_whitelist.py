# middleware/ip_whitelist.py - COMPLETE FIXED VERSION
import os
from fastapi import Request, HTTPException
from typing import List
import logging

logger = logging.getLogger(__name__)


# =========================================================
# HELPER FUNCTION - Define FIRST before it's used
# =========================================================

def get_client_ip(request: Request) -> str:
    """Get client IP address from proxy headers or socket."""
    # Check for proxy headers
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()

    # Check CloudFlare header
    cf_connecting_ip = request.headers.get("CF-Connecting-IP")
    if cf_connecting_ip:
        return cf_connecting_ip.strip()

    # Check Real IP header
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()

    # Fallback to direct client
    return request.client.host if request.client else "unknown"


# =========================================================
# IP WHITELIST MIDDLEWARE
# =========================================================

class IPWhitelistMiddleware:
    """IP whitelisting for admin endpoints"""
    
    def __init__(self):
        self.allowed_ips = self._get_allowed_ips()
    
    def _get_allowed_ips(self) -> List[str]:
        """Get allowed IPs from environment"""
        ips_str = os.getenv("ALLOWED_ADMIN_IPS", "")
        ips = [ip.strip() for ip in ips_str.split(",") if ip.strip()]
        
        # Add localhost for development
        if os.getenv("ENVIRONMENT") != "production":
            ips.extend(["127.0.0.1", "localhost", "::1"])
        
        logger.info(f"Admin IP whitelist: {ips}")
        return ips
    
    async def __call__(self, request: Request, call_next):
        path = request.url.path
        
        # Only enforce for admin endpoints
        if "/admin" in path:
            client_ip = get_client_ip(request)  # Now works because function is defined above
            
            if self.allowed_ips and client_ip not in self.allowed_ips:
                logger.warning(f"🚨 Blocked admin access from IP: {client_ip} (Path: {path})")
                raise HTTPException(
                    status_code=403,
                    detail=f"Access denied. Your IP ({client_ip}) is not whitelisted for admin access."
                )
        
        return await call_next(request)


# =========================================================
# DEPENDENCY FOR ADMIN ROUTES
# =========================================================

async def require_admin_ip(request: Request) -> bool:
    """Dependency for admin IP whitelisting"""
    whitelist = IPWhitelistMiddleware()
    client_ip = get_client_ip(request)

    if whitelist.allowed_ips and client_ip not in whitelist.allowed_ips:
        logger.warning(f"🚨 Admin access denied for IP: {client_ip}")
        raise HTTPException(
            status_code=403,
            detail=f"Access denied. Your IP ({client_ip}) is not whitelisted for admin access."
        )

    return True