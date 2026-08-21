#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
İngilis Dili — yığıcı skript.

İşə salmaq (repository kökündən):
    python src/build.py

Nə edir:
    src/shell.html  (karkas: HTML + CSS)
    src/app.js      (proqram məntiqi)
    src/data/*.csv  (söz paketləri)
    src/tel/*.txt   (tələffüzlər)
    src/content/*.py (qrammatika, monoloq, dialoq, kölgə)
        ->  index.html   (repository kökündə, GitHub Pages bunu göstərir)

Fayl formatları:
    data/*.csv   ayırıcı "|"  ->  en|az|pos|example[|telaffuz]
                 5-ci sütun yoxdursa tələffüz tel/ qovluğundan götürülür
    tel/*.txt    ayırıcı "|"  ->  en|telaffuz
"""

import importlib.util
import json
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent
ROOT = SRC.parent
OUT = ROOT / "index.html"


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def build_words():
    """CSV paketlərini + tələffüzləri tək mətn blokuna yığır."""
    tel = {}
    for p in sorted((SRC / "tel").glob("*.txt")):
        for line in p.read_text(encoding="utf-8").splitlines():
            if "|" in line:
                k, v = line.split("|", 1)
                tel[k.strip()] = v.strip()

    rows, seen, dupes, missing = [], set(), 0, []
    for p in sorted((SRC / "data").glob("*.csv")):
        for line in p.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.lower().startswith("en|"):
                continue
            f = [x.strip() for x in line.split("|")]
            if len(f) < 2 or not f[0] or not f[1]:
                continue
            en, az = f[0], f[1]
            if (en, az) in seen:
                dupes += 1
                continue
            seen.add((en, az))
            pron = f[4] if len(f) > 4 and f[4] else tel.get(en, "")
            if not pron:
                missing.append(en)
            rows.append("|".join([en, az,
                                  f[2] if len(f) > 2 else "",
                                  f[3] if len(f) > 3 else "",
                                  p.stem, pron]))
    return rows, dupes, missing


def guard(name, blob):
    """JS template literal-i poza biləcək simvolları tutur."""
    for bad in ("`", "${"):
        if bad in blob:
            sys.exit(f"XƏTA — {name} içində '{bad}' var. Onu sil, sonra yenidən yığ.")


def main():
    rows, dupes, missing = build_words()
    data = "\n".join(rows)
    guard("söz bazası", data)

    c = SRC / "content"
    G = load_module("g1", c / "gram_a1.py").A1 + load_module("g2", c / "gram_a2.py").A2
    gb = load_module("g3", c / "gram_b.py")
    G += gb.B1 + gb.B2
    for g in G:
        g["s"] = [list(x) for x in g["s"]]

    MONO = load_module("mo", c / "mono.py").MONO
    DL = load_module("dl", c / "dialogs.py").DIALOGS
    SH = load_module("sh", c / "shadow.py").SHADOW
    for d in DL:
        d["l"] = [list(x) for x in d["l"]]
    for s in SH:
        s["l"] = [list(x) for x in s["l"]]

    blobs = {}
    for key, obj in (("GRAMMAR", G), ("MONO", MONO), ("DIALOGS", DL), ("SHADOW", SH)):
        blobs[key] = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
        guard(key, blobs[key])

    html = (SRC / "shell.html").read_text(encoding="utf-8")
    app = (SRC / "app.js").read_text(encoding="utf-8")
    out = (html.replace("@@DATA@@", data)
               .replace("@@GRAMMAR@@", blobs["GRAMMAR"])
               .replace("@@MONO@@", blobs["MONO"])
               .replace("@@DIALOGS@@", blobs["DIALOGS"])
               .replace("@@SHADOW@@", blobs["SHADOW"])
               .replace("@@APP@@", app))

    left = [t for t in ("@@DATA@@", "@@GRAMMAR@@", "@@MONO@@",
                        "@@DIALOGS@@", "@@SHADOW@@", "@@APP@@") if t in out]
    if left:
        sys.exit(f"XƏTA — yer tutucu doldurulmadı: {left}")

    OUT.write_text(out, encoding="utf-8")

    dl_lines = sum(len(d["l"]) for d in DL)
    sh_lines = sum(len(s["l"]) for s in SH)
    ex_count = sum(1 for r in rows if r.split("|")[3])

    print(f"Söz          {len(rows):>5}   (təkrar atlanan: {dupes})")
    print(f"Qrammatika   {len(G):>5} dərs, {sum(len(g.get('q', [])) for g in G)} test sualı")
    print(f"Dialoq       {len(DL):>5} ({dl_lines} sətir)")
    print(f"Kölgə        {len(SH):>5} parça ({sh_lines} cümlə)")
    print(f"Monoloq      {len(MONO):>5} mövzu")
    print(f"Səsli cümlə  {dl_lines + sh_lines + ex_count:>5}")
    if missing:
        print(f"\nXƏBƏRDARLIQ — tələffüzü olmayan {len(missing)} söz: {missing[:10]}")
    print(f"\nHazır: {OUT}  ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
