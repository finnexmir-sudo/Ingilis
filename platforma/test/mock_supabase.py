#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Supabase-in kicik teqlidi - YALNIZ YOXLAMA UCUN.

Meqsed: paneli real brauzerde, real sxem ve real RLS uzerinde surmek.
Istehsalat ucun deyil; heqiqi Supabase-de auth, JWT ve PostgREST var.

Destekleyir:
  POST /auth/v1/signup
  POST /auth/v1/token?grant_type=password | refresh_token
  POST /auth/v1/logout
  POST /rest/v1/rpc/<funksiya>
  GET  /rest/v1/<cedvel>?select=..&sutun=eq.deyer&order=..
"""
import json
import os
import secrets
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs, unquote

import psycopg2
import psycopg2.extras
from psycopg2 import sql

DSN = os.environ.get("MOCK_DSN", "host=/tmp port=55432 user=postgres dbname=t3")
TOKENS = {}          # access_token -> uid
REFRESH = {}         # refresh_token -> uid
PASSWORDS = {}       # email -> (uid, password)
LOCK = threading.Lock()


def db():
    return psycopg2.connect(DSN, cursor_factory=psycopg2.extras.RealDictCursor)


def issue(uid):
    at, rt = secrets.token_hex(16), secrets.token_hex(16)
    with LOCK:
        TOKENS[at] = uid
        REFRESH[rt] = uid
    return {"access_token": at, "refresh_token": rt, "token_type": "bearer",
            "expires_in": 3600, "user": {"id": uid}}


class H(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *a):
        pass

    # ------------------------------------------------------------ komekci
    def send(self, code, payload):
        body = json.dumps(payload, default=str).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers",
                         "authorization, apikey, content-type, prefer")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def uid(self):
        auth = self.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            return TOKENS.get(auth[7:])
        return None

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if not n:
            return {}
        try:
            return json.loads(self.rfile.read(n).decode("utf-8"))
        except Exception:
            return {}

    def do_OPTIONS(self):
        self.send(204, {})

    # -------------------------------------------------------------- POST
    def do_POST(self):
        u = urlparse(self.path)
        q = parse_qs(u.query)
        b = self.body()

        if u.path == "/auth/v1/signup":
            return self.signup(b)
        if u.path == "/auth/v1/token":
            grant = (q.get("grant_type") or ["password"])[0]
            if grant == "refresh_token":
                uid = REFRESH.get(b.get("refresh_token"))
                if not uid:
                    return self.send(401, {"message": "Refresh token yanlisdir."})
                return self.send(200, issue(uid))
            return self.signin(b)
        if u.path == "/auth/v1/logout":
            auth = self.headers.get("Authorization", "")
            if auth.startswith("Bearer "):
                with LOCK:
                    TOKENS.pop(auth[7:], None)
            return self.send(204, {})
        if u.path.startswith("/rest/v1/rpc/"):
            return self.rpc(unquote(u.path[len("/rest/v1/rpc/"):]), b)
        self.send(404, {"message": "Yoxdur: " + u.path})

    def signup(self, b):
        email = (b.get("email") or "").strip().lower()
        pw = b.get("password") or ""
        meta = b.get("data") or {}
        if not email or len(pw) < 6:
            return self.send(400, {"message": "E-poct ve parol lazimdir."})
        if email in PASSWORDS:
            return self.send(400, {"message": "Bu e-poct artiq qeydiyyatdadir."})
        try:
            with db() as c, c.cursor() as cur:
                cur.execute(
                    "insert into auth.users (email, raw_user_meta_data) "
                    "values (%s, %s::jsonb) returning id",
                    (email, json.dumps(meta)))
                uid = str(cur.fetchone()["id"])
        except Exception as e:
            return self.send(400, {"message": str(e)})
        with LOCK:
            PASSWORDS[email] = (uid, pw)
        return self.send(200, issue(uid))

    def signin(self, b):
        email = (b.get("email") or "").strip().lower()
        rec = PASSWORDS.get(email)
        if not rec or rec[1] != (b.get("password") or ""):
            return self.send(400, {"message": "E-poct ve ya parol yanlisdir."})
        return self.send(200, issue(rec[0]))

    # -------------------------------------------------------- rpc / select
    def run(self, fn, *a):
        """Sorgunu duzgun rol ve JWT iddiasi ile isledir."""
        uid = self.uid()
        with db() as c, c.cursor() as cur:
            cur.execute("set local role " + ("authenticated" if uid else "anon"))
            if uid:
                cur.execute("select set_config('request.jwt.claim.sub', %s, true)", (uid,))
            return fn(cur, *a)

    def rpc(self, name, args):
        if not name.startswith("rpc_"):
            return self.send(404, {"message": "Bele funksiya yoxdur."})
        keys = list(args.keys())
        stmt = sql.SQL("select {}({}) as r").format(
            sql.Identifier("public", name),
            sql.SQL(", ").join(
                sql.SQL("{} => %s").format(sql.Identifier(k)) for k in keys))

        def go(cur):
            cur.execute(stmt, [args[k] for k in keys])
            return cur.fetchone()["r"]

        try:
            return self.send(200, self.run(go))
        except psycopg2.Error as e:
            code = 403 if e.pgcode in ("42501", "28000") else 400
            return self.send(code, {"message": (e.diag.message_primary or str(e)),
                                    "code": e.pgcode})
        except Exception as e:
            return self.send(400, {"message": str(e)})

    def do_GET(self):
        u = urlparse(self.path)
        if not u.path.startswith("/rest/v1/"):
            return self.send(404, {"message": "Yoxdur"})
        table = unquote(u.path[len("/rest/v1/"):])
        q = parse_qs(u.query)

        cols = [c.strip() for c in (q.get("select") or ["*"])[0].split(",") if c.strip()]
        sel = sql.SQL("*") if cols == ["*"] else sql.SQL(", ").join(
            sql.Identifier(c) for c in cols)

        where, vals = [], []
        for k, v in q.items():
            if k in ("select", "order"):
                continue
            val = v[0]
            if val.startswith("eq."):
                where.append(sql.SQL("{} = %s").format(sql.Identifier(k)))
                vals.append(val[3:])

        stmt = sql.SQL("select {} from {}").format(sel, sql.Identifier("public", table))
        if where:
            stmt = stmt + sql.SQL(" where ") + sql.SQL(" and ").join(where)
        if q.get("order"):
            stmt = stmt + sql.SQL(" order by {}").format(
                sql.Identifier(q["order"][0].split(".")[0]))

        def go(cur):
            cur.execute(stmt, vals)
            return cur.fetchall()

        try:
            return self.send(200, self.run(go))
        except psycopg2.Error as e:
            code = 403 if e.pgcode in ("42501", "28000") else 400
            return self.send(code, {"message": (e.diag.message_primary or str(e)),
                                    "code": e.pgcode})
        except Exception as e:
            return self.send(400, {"message": str(e)})


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 54321
    print("mock supabase: http://127.0.0.1:%d  (%s)" % (port, DSN), flush=True)
    ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
