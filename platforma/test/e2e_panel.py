#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Muellim panelini real brauzerde, real sxem uzerinde surur."""
import re, sys, time
from playwright.sync_api import sync_playwright

PANEL = "http://127.0.0.1:8010/muellim/index.html"
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
TEST_CFG = """window.CFG = {
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_ANON_KEY: "test-anon-key",
  STUDENT_URL: "https://example.test/Testler/"
};"""

fails = []
def ok(cond, label, extra=""):
    print(("  OK   " if cond else "  FAIL ") + label + (("  " + str(extra)) if extra else ""), flush=True)
    if not cond: fails.append(label)

def new_page(ctx):
    pg = ctx.new_page()
    pg.route("**/config.js", lambda r: r.fulfill(
        status=200, content_type="application/javascript", body=TEST_CFG))
    pg.on("pageerror", lambda e: fails.append("JS xetasi: " + str(e)))
    return pg

def signup(pg, email, name, pw="parol1234"):
    pg.goto(PANEL); pg.wait_for_timeout(300)
    pg.click("#btnSwap")
    pg.fill("#fname", name); pg.fill("#email", email); pg.fill("#pass", pw)
    pg.click("#btnAuth")

with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
    ctx = br.new_context(viewport={"width": 430, "height": 900},
                         permissions=["clipboard-read", "clipboard-write"])
    pg = new_page(ctx)

    print("A · Qeydiyyat və hesab quraşdırması")
    pg.goto(PANEL); pg.wait_for_timeout(400)
    ok(pg.is_visible("#btnAuth"), "giris ekrani acilir")
    ok("Daxil ol" in pg.inner_text("#main"), "basliq duzgun")

    signup(pg, "leyla@test.az", "Leyla Muellim")
    pg.wait_for_selector("#btnSetup", timeout=8000)
    ok(True, "qeydiyyatdan sonra quraşdirma ekrani acilir")

    pg.select_option("#atype", "tutor")
    pg.fill("#aname", "Leyla muellim - riyaziyyat")
    pg.click("#btnSetup")
    pg.wait_for_selector("#btnGroup", timeout=8000)
    ok(True, "hesab yaranir, esas ekran acilir")
    ok("0 / 5" in pg.inner_text(".seat"), "yer gostericisi 0 / 5", pg.inner_text(".seat").replace("\n"," "))
    ok("Leyla Muellim" in pg.inner_text("#topWho"), "ustlukde ad gorunur")

    print("B · Qrup yaratmaq")
    # siniflər ayrıca sorğu ilə gəlir - dolmasını gözləyirik
    pg.wait_for_function("document.querySelectorAll('#glevel option').length > 1",
                         timeout=8000)
    ok(pg.locator("#glevel option").count() >= 5, "sinif siyahisi dolur",
       pg.locator("#glevel option").count())
    pg.fill("#gname", "Cume qrupu")
    pg.select_option("#glevel", "3")
    pg.click("#btnGroup")
    pg.wait_for_selector(".item", timeout=8000)
    txt = pg.inner_text("#groups")
    ok("Cume qrupu" in txt, "qrup siyahida gorunur")
    ok("0 şagird" in txt, "sagird sayi 0")
    code = re.search(r"qoşulma kodu\s*([A-Z2-9]{8})", txt.replace("\n", " "))
    ok(code is not None, "qosulma kodu 8 simvol, qarisiq simvolsuz",
       code.group(1) if code else txt[:80])

    print("C · Şagird əlavə etmək")
    pg.click(".item")
    pg.wait_for_selector("#btnStu", timeout=8000)
    ok("Cume qrupu" in pg.inner_text("h1"), "qrup ekrani acilir")

    pg.fill("#sname", "Aysu Məmmədova")
    pg.click("#btnStu")
    pg.wait_for_selector(".stu", timeout=8000)
    s = pg.inner_text(".stu")
    ok("Aysu Məmmədova" in s, "sagird siyahiya dusur")
    ok("Aysu M." in s, "leqeb avtomatik qisaldilir", s.replace("\n", " ")[:60])
    scode = re.search(r"\b([A-Z2-9]{8})\b", s)
    ok(scode is not None, "giris kodu gorunur", scode.group(1) if scode else s[:60])
    first_code = scode.group(1) if scode else None

    pg.fill("#sname", "Kənan Əliyev"); pg.fill("#snick", "Pələng")
    pg.click("#btnStu"); pg.wait_for_timeout(900)
    ok(pg.locator(".stu").count() == 2, "ikinci sagird elave olunur")
    ok("Pələng" in pg.inner_text("#stu"), "verilen leqeb istifade olunur")

    print("D · WhatsApp və kopyalama")
    pg.evaluate("window.__opened=null; window.open = (u)=>{ window.__opened=u; return null; }")
    pg.locator("[data-wa]").first.click(); pg.wait_for_timeout(200)
    wa = pg.evaluate("window.__opened")
    ok(wa and wa.startswith("https://wa.me/?text="), "wa.me linki acilir", (wa or "")[:45])
    ok(wa and "example.test" in wa, "linkde sagird tetbiqinin unvani var")
    ok(wa and first_code and first_code in wa, "linkde giris kodu var")

    pg.locator("[data-copy]").first.click(); pg.wait_for_timeout(400)
    ok("Kopyalandı" in pg.inner_text("#stu"), "kopyala duymesi teqdiq verir")
    ok(pg.evaluate("navigator.clipboard.readText()") == first_code,
       "kod lovheye kopyalanir")

    print("E · Paket limiti panel içində")
    for nm in ["Sagird 3", "Sagird 4", "Sagird 5"]:
        pg.fill("#sname", nm); pg.fill("#snick", "")
        pg.click("#btnStu"); pg.wait_for_timeout(700)
    ok(pg.locator(".stu").count() == 5, "5 sagird elave olundu",
       pg.locator(".stu").count())

    pg.fill("#sname", "Altinci Sagird")
    pg.click("#btnStu"); pg.wait_for_timeout(900)
    err = pg.inner_text("#sErr")
    ok("limit" in err.lower() or "dolub" in err.lower(),
       "6-ci sagirdde limit mesaji cixir", err.strip()[:70])
    ok(pg.locator(".stu").count() == 5, "limit asilmadi - hele de 5 sagird")
    ok(pg.is_visible("#btnStu"), "xetadan sonra panel cokmur")

    pg.click("#btnBack"); pg.wait_for_selector(".seat", timeout=8000)
    ok("5 / 5" in pg.inner_text(".seat"), "yer gostericisi 5 / 5 gosterir",
       pg.inner_text(".seat").replace("\n", " "))
    ok("dolub" in pg.inner_text("#main").lower(), "limit xeberdarligi gorunur")

    print("F · Kodu yeniləmək")
    pg.click(".item"); pg.wait_for_selector(".stu", timeout=8000)
    pg.on("dialog", lambda d: d.accept())
    pg.locator("[data-reset]").first.click(); pg.wait_for_timeout(1000)
    new_code = re.search(r"\b([A-Z2-9]{8})\b", pg.inner_text(".stu"))
    ok(new_code and new_code.group(1) != first_code, "kod deyisdi",
       (first_code or "?") + " -> " + (new_code.group(1) if new_code else "?"))

    print("G · Çıxış və yenidən giriş")
    pg.click("#btnOut"); pg.wait_for_selector("#btnAuth", timeout=8000)
    ok(True, "cixis isleyir")
    pg.fill("#email", "leyla@test.az"); pg.fill("#pass", "parol1234")
    pg.click("#btnAuth")
    pg.wait_for_selector(".seat", timeout=8000)
    ok("5 / 5" in pg.inner_text(".seat"), "yenidən girişdə melumat yerindedir")

    pg.reload(); pg.wait_for_selector(".item", timeout=8000)
    ok("Cume qrupu" in pg.inner_text("#groups"), "sessiya sehife yenilenmesinden sonra qalir",
       pg.inner_text("#groups").replace("\n", " ")[:50])

    print("H · Başqa müəllim heç nə görmür")
    pg2 = new_page(ctx)
    pg2.goto(PANEL)
    pg2.evaluate("localStorage.clear()")
    signup(pg2, "ozge@test.az", "Ozge Muellim")
    pg2.wait_for_selector("#btnSetup", timeout=8000)
    pg2.select_option("#atype", "school")
    pg2.fill("#aname", "Ozge - 4B sinfi")
    pg2.click("#btnSetup")
    pg2.wait_for_selector("#btnGroup", timeout=8000)
    ok("0 / 5" in pg2.inner_text(".seat"), "yeni muellimde 0 sagird")
    pg2.wait_for_function(
        "!/Yüklənir/.test(document.getElementById('groups').textContent)", timeout=8000)
    ok("Hələ qrup yoxdur" in pg2.inner_text("#groups"), "yeni muellim basqasinin qrupunu gormur",
       pg2.inner_text("#groups").replace("\n", " ")[:60])

    print("I · Yanlış parol")
    pg3 = new_page(ctx)
    pg3.goto(PANEL); pg3.evaluate("localStorage.clear()"); pg3.reload()
    pg3.wait_for_selector("#btnAuth", timeout=8000)
    pg3.fill("#email", "leyla@test.az"); pg3.fill("#pass", "sehvparol")
    pg3.click("#btnAuth"); pg3.wait_for_timeout(800)
    ok(pg3.is_visible("#authErr") and pg3.inner_text("#authErr").strip() != "",
       "yanlis parolda anlasilan xeta", pg3.inner_text("#authErr").strip()[:50])
    ok(pg3.is_visible("#btnAuth"), "xetadan sonra ekran qalir")

    ctx.close(); br.close()

print()
if fails:
    print("UGURSUZ: %d" % len(fails))
    for f in fails: print("  - " + f)
    sys.exit(1)
print("PANEL: BUTUN YOXLAMALAR KECDI")
