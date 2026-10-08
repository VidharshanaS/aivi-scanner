import asyncio
import hashlib
import ipaddress
import os
import random
from datetime import datetime, timezone
from urllib.parse import urlparse

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator

app = FastAPI(title="Hack My Website Scanner API", version="1.0.0")

# Comma-separated list, e.g. "https://my-app.vercel.app,http://localhost:3000"
origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# (id, title, severity, penalty, description, fix)
CHECKS = [
    ("csp", "Missing Content-Security-Policy", "high", 15,
     "No CSP header was found, so injected scripts are not restricted.",
     "Add a Content-Security-Policy header that limits script sources."),
    ("hsts", "HSTS not enabled", "medium", 10,
     "Browsers are not told to always use HTTPS for this domain.",
     "Send Strict-Transport-Security with a max-age of at least 15552000."),
    ("xfo", "Clickjacking protection missing", "medium", 8,
     "The page can be embedded in a frame on another site.",
     "Set X-Frame-Options: DENY or use CSP frame-ancestors."),
    ("cookie", "Cookies without Secure/HttpOnly flags", "medium", 8,
     "Session cookies can be read by scripts or sent over plain HTTP.",
     "Set Secure, HttpOnly and SameSite on all session cookies."),
    ("admin", "Exposed /admin path", "high", 12,
     "An admin route responds without an IP allow-list.",
     "Restrict the admin panel behind auth and an allow-list."),
    ("cors", "Wildcard CORS policy", "medium", 8,
     "Access-Control-Allow-Origin is set to *, so any site can call the API.",
     "Allow only the origins that need access."),
    ("server", "Server version disclosed", "low", 4,
     "The Server header reveals software and version details.",
     "Remove or genericize the Server and X-Powered-By headers."),
    ("xcto", "Missing X-Content-Type-Options", "low", 4,
     "Browsers may MIME-sniff responses.",
     "Send X-Content-Type-Options: nosniff."),
    ("referrer", "Missing Referrer-Policy", "low", 3,
     "Full URLs may leak to third-party sites through the Referer header.",
     "Set Referrer-Policy: strict-origin-when-cross-origin."),
]


class ScanRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("URL is required")
        if len(v) > 2048:
            raise ValueError("URL is too long")
        parsed = urlparse(v)
        if parsed.scheme not in ("http", "https") or not parsed.hostname:
            raise ValueError("URL must start with http:// or https:// and include a domain")
        host = parsed.hostname.lower()
        try:
            ip = ipaddress.ip_address(host)
            if ip.is_private or ip.is_loopback or ip.is_reserved or ip.is_link_local:
                raise ValueError("Private and local addresses cannot be scanned")
        except ValueError as e:
            if "cannot be scanned" in str(e):
                raise
            # not an IP literal -> must look like a domain
            if host == "localhost" or "." not in host:
                raise ValueError("Enter a public domain, like example.com")
        return v


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    first = exc.errors()[0]
    msg = first.get("msg", "Invalid request").removeprefix("Value error, ")
    return JSONResponse(status_code=400, content={"error": "invalid_request", "message": msg})


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/scan")
async def scan(req: ScanRequest):
    await asyncio.sleep(1.8)  # simulate scan time so the UI loading state is visible

    parsed = urlparse(req.url)
    host = parsed.hostname.lower()
    rng = random.Random(int(hashlib.sha256(host.encode()).hexdigest(), 16))  # same site -> same result

    picked = [c for c in CHECKS if rng.random() < 0.45]
    if parsed.scheme == "http":
        picked.insert(0, ("http", "Site served over plain HTTP", "critical", 25,
                          "Traffic to this site is not encrypted.",
                          "Install a TLS certificate and redirect HTTP to HTTPS."))

    findings = [
        {"id": c[0], "title": c[1], "severity": c[2], "description": c[4], "fix": c[5]}
        for c in picked
    ]
    score = max(0, 100 - sum(c[3] for c in picked))
    grade = "A" if score >= 90 else "B" if score >= 75 else "C" if score >= 60 else "D" if score >= 40 else "F"
    summary = {s: sum(1 for f in findings if f["severity"] == s) for s in ("critical", "high", "medium", "low")}

    return {
        "url": req.url,
        "host": host,
        "score": score,
        "grade": grade,
        "summary": summary,
        "findings": findings,
        "simulated": True,
        "scanned_at": datetime.now(timezone.utc).isoformat(),
    }