from __future__ import annotations

import csv
import json
import os
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "5000"))
PROJECT_ROOT = Path(__file__).resolve().parent
MESSAGES_FILE = PROJECT_ROOT / "messages.csv"
CONTENT_FILE = PROJECT_ROOT / "content.json"
ADMIN_KEY = os.getenv("OSARTECH_ADMIN_KEY", "osartech123")


DEFAULT_CONTENT = {
    "services": [],
    "pricing": [],
    "testimonials": [],
}


def load_content() -> dict:
    if not CONTENT_FILE.exists():
        return DEFAULT_CONTENT.copy()

    try:
        with CONTENT_FILE.open("r", encoding="utf-8") as file:
            raw = json.load(file)
    except (OSError, json.JSONDecodeError):
        return DEFAULT_CONTENT.copy()

    return normalize_content(raw)


def save_content(content: dict) -> None:
    with CONTENT_FILE.open("w", encoding="utf-8") as file:
        json.dump(content, file, ensure_ascii=False, indent=2)


def normalize_text(value: object) -> str:
    return str(value or "").strip()


def normalize_content(raw: object) -> dict:
    data = raw if isinstance(raw, dict) else {}

    services_raw = data.get("services", [])
    pricing_raw = data.get("pricing", [])
    testimonials_raw = data.get("testimonials", [])

    services = []
    for item in services_raw if isinstance(services_raw, list) else []:
        if not isinstance(item, dict):
            continue
        title = normalize_text(item.get("title"))
        description = normalize_text(item.get("description"))
        if title and description:
            services.append({"title": title, "description": description})
    services = services[:8]

    pricing = []
    for item in pricing_raw if isinstance(pricing_raw, list) else []:
        if not isinstance(item, dict):
            continue
        name = normalize_text(item.get("name"))
        tag = normalize_text(item.get("tag"))
        featured = bool(item.get("featured"))
        features_raw = item.get("features", [])
        features = []
        for feature in features_raw if isinstance(features_raw, list) else []:
            feature_text = normalize_text(feature)
            if feature_text:
                features.append(feature_text)
        if name and tag and features:
            pricing.append(
                {
                    "name": name,
                    "tag": tag,
                    "featured": featured,
                    "features": features[:8],
                }
            )
    pricing = pricing[:6]

    testimonials = []
    for item in testimonials_raw if isinstance(testimonials_raw, list) else []:
        if not isinstance(item, dict):
            continue
        quote = normalize_text(item.get("quote"))
        name = normalize_text(item.get("name"))
        if quote and name:
            testimonials.append({"quote": quote, "name": name})
    testimonials = testimonials[:8]

    return {
        "services": services,
        "pricing": pricing,
        "testimonials": testimonials,
    }


def append_message(data: dict[str, str]) -> None:
    file_exists = MESSAGES_FILE.exists()
    with MESSAGES_FILE.open("a", encoding="utf-8", newline="") as csv_file:
        writer = csv.writer(csv_file)
        if not file_exists:
            writer.writerow(
                [
                    "timestamp",
                    "name",
                    "email",
                    "phone",
                    "service",
                    "message",
                ]
            )
        writer.writerow(
            [
                datetime.now().isoformat(timespec="seconds"),
                data["name"],
                data["email"],
                data["phone"],
                data["service"],
                data["message"],
            ]
        )


class AppHandler(SimpleHTTPRequestHandler):
    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/content":
            self._send_json(200, load_content())
            return
        super().do_GET()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)

        if parsed.path == "/contact":
            self._handle_contact_submit()
            return

        if parsed.path == "/api/content":
            self._handle_content_update()
            return

        self.send_error(404, "Not Found")

    def _handle_contact_submit(self) -> None:
        body = self._read_body()
        fields = parse_qs(body, keep_blank_values=True)
        data = {
            "name": normalize_text(fields.get("name", [""])[0]),
            "email": normalize_text(fields.get("email", [""])[0]),
            "phone": normalize_text(fields.get("phone", [""])[0]),
            "service": normalize_text(fields.get("service", [""])[0]),
            "message": normalize_text(fields.get("message", [""])[0]),
        }

        if not data["name"] or not data["email"] or not data["message"]:
            self._redirect("/?sent=0#contact")
            return

        append_message(data)
        self._redirect("/?sent=1#contact")

    def _handle_content_update(self) -> None:
        admin_key = normalize_text(self.headers.get("X-Admin-Key", ""))
        if admin_key != ADMIN_KEY:
            self._send_json(401, {"ok": False, "error": "Unauthorized"})
            return

        body = self._read_body()
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            self._send_json(400, {"ok": False, "error": "Invalid JSON"})
            return

        normalized = normalize_content(payload)
        if not normalized["services"] or not normalized["pricing"]:
            self._send_json(
                400,
                {
                    "ok": False,
                    "error": "Services and pricing must include at least one valid item.",
                },
            )
            return

        save_content(normalized)
        self._send_json(200, {"ok": True})

    def _read_body(self) -> str:
        length_header = self.headers.get("Content-Length", "0")
        try:
            content_length = max(0, int(length_header))
        except ValueError:
            content_length = 0
        return self.rfile.read(content_length).decode("utf-8", errors="replace")

    def _send_json(self, status: int, payload: dict) -> None:
        response = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def _redirect(self, location: str) -> None:
        self.send_response(303)
        self.send_header("Location", location)
        self.end_headers()


def run() -> None:
    os.chdir(PROJECT_ROOT)
    server = ThreadingHTTPServer((HOST, PORT), AppHandler)
    print(f"OSARTech website running at http://{HOST}:{PORT}")
    print(f"Form submissions are saved to: {MESSAGES_FILE}")
    print(f"CMS content file: {CONTENT_FILE}")
    print("Admin page: /admin.html")
    print("Set OSARTECH_ADMIN_KEY to change the admin password.")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
    finally:
        server.server_close()


if __name__ == "__main__":
    run()
