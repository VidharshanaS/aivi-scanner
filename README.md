# Hack My Website Scanner

A full-stack module prototype for the AIVI Intelligence challenge (Option A). Enter a URL and the API returns a simulated security score (0-100) with a findings summary.

- **Live demo:** <your-vercel-url>
- **API docs:** <your-render-url>/docs

## Stack
- Frontend: Next.js (App Router), React, TypeScript, Tailwind CSS
- Backend: FastAPI, Pydantic v2

## API

`POST /api/scan`

```json
{ "url": "https://example.com" }
```

Response `200`:

```json
{
  "url": "https://example.com",
  "host": "example.com",
  "score": 65,
  "grade": "C",
  "summary": { "critical": 0, "high": 1, "medium": 2, "low": 1 },
  "findings": [
    { "id": "csp", "title": "Missing Content-Security-Policy", "severity": "high", "description": "...", "fix": "..." }
  ],
  "simulated": true,
  "scanned_at": "2026-10-08T12:42:00+00:00"
}
```

Invalid input (empty, malformed, non-http(s), localhost or private IP) returns `400`:

```json
{ "error": "invalid_request", "message": "URL must start with http:// or https:// and include a domain" }
```

Results are deterministic per hostname, so the same site always gets the same score. `GET /api/health` is available for uptime checks.

## Features
- Client-side and server-side URL validation
- Loading skeleton, error banner, and results view with score ring and severity badges
- Responsive layout with dark mode
- CORS configured through the `ALLOWED_ORIGINS` environment variable

## Run locally

```bash
# backend
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000

# frontend (new terminal)
cd frontend
echo NEXT_PUBLIC_API_URL=http://localhost:8000 > .env.local
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy
- **Backend (Render):** Web Service, root directory `backend`, build `pip install -r requirements.txt`, start `uvicorn main:app --host 0.0.0.0 --port $PORT`. Set `ALLOWED_ORIGINS` to your Vercel URL.
- **Frontend (Vercel):** root directory `frontend`, set `NEXT_PUBLIC_API_URL` to your Render URL.

## Notes
- No real scanning happens. The backend never makes outbound requests to the submitted URL.
- No secrets are committed. Configuration goes through environment variables.
- The free Render tier sleeps when idle, so the first request can take up to a minute.
