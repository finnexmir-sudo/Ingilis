# Layihə: İngilis Dili

Azərbaycandilli öyrənənlər üçün ingilis dili tətbiqi.
Tək HTML fayl, oflayn işləyir, PWA kimi quraşdırılır.

**Canlı:** https://finnexmir-sudo.github.io/Ingilis/

---

## ƏN VACİB QAYDA

`index.html` **əl ilə redaktə edilmir**. O, qurulmuş fayldır.

Dəyişiklik `src/` içində edilir, sonra:

```bash
python src/build.py
```

Bu, `index.html`-i yenidən yaradır. Sonra commit + push.

`index.html`-i birbaşa dəyişsən, növbəti yığımda itəcək.

---

## Struktur

```
index.html          qurulmuş fayl — GitHub Pages bunu göstərir
sw.js               service worker (oflayn rejim)
manifest.json       PWA təsviri
icon-*.png          ikonlar

src/
├── build.py        yığıcı — bunu işə sal
├── shell.html      karkas: HTML + CSS + yer tutucular
├── app.js          bütün proqram məntiqi
├── data/*.csv      13 söz paketi
├── tel/*.txt       tələffüz siyahıları
├── content/
│   ├── gram_a1.py  qrammatika A1 (10 dərs)
│   ├── gram_a2.py  qrammatika A2 (8 dərs)
│   ├── gram_b.py   qrammatika B1+B2 (14 dərs)
│   ├── dialogs.py  16 səsli dialoq
│   ├── shadow.py   14 kölgə parçası
│   └── mono.py     20 monoloq mövzusu
└── pwa/            ikon mənbələri
```

---

## Fayl formatları

### `src/data/*.csv` — söz paketləri

Ayırıcı `|`, birinci sətir başlıqdır:

```
en|az|pos|example|tel
network|şəbəkə|n|The network is down.|netvörk
```

- `tel` sütunu yoxdursa, tələffüz `src/tel/*.txt` faylından götürülür
- Eyni `en|az` cütü iki dəfə varsa, ikincisi atılır
- `pos`: n, v, adj, adv, prep, pron, conj, phr, blok, v irr

### `src/tel/*.txt` — tələffüzlər

```
network|netvörk
```

Azərbaycan hərfləri ilə. Qayda: `w→v`, `th→s/d`, `-ing→-inq`, `/æ/→e`, `/ɜːr/→ör`.

### `src/content/*.py` — Python siyahıları

Qrammatika bölmə tipləri:

| Tip | Nə üçün |
|-----|---------|
| `h` | alt başlıq |
| `p` | abzas |
| `f` | düstur qutusu (mono şrift) |
| `e` | nümunə: `"English ~ Azərbaycanca"` |
| `x` | səhv/düz: `"Səhv ~ Düz"` |
| `w` | «Diqqət» xəbərdarlığı |

Dialoq və kölgə: `("A"/"B", "English", "Azərbaycanca")` üçlükləri.
Monoloq qəlibləri: `"English ... ~ Azərbaycanca ..."`.

---

## Qadağan olunan simvollar

Bütün məzmun JS template literal-ə yazılır. Ona görə **heç bir faylda**
bunlar olmamalıdır:

- backtick
- `${`
- tərs kəsik (backslash)

`build.py` bunları yoxlayır və taparsa dayanır.

---

## Məlumatın saxlanması

`localStorage`, açar `ingilis_v2`. Sxem:

```js
{ p:{},        // hər sözün SRS vəziyyəti
  cfg:{},      // ayarlar
  log:[],      // məşq günləri (ardıcıllıq üçün)
  xp:0, read:[], dlg:[], shd:[], ach:[], day:{} }
```

`app.js` içindəki `sanitize()` funksiyası **hər açılışda** bütün
dəyərləri tipinə və həddinə görə süzür. Yeni sahə əlavə edirsənsə,
mütləq `sanitize()`-ə də əlavə et — yoxsa itəcək.

---

## Təhlükəsizlik

- Xarici şəbəkə müraciəti **yoxdur** — heç bir `fetch`, `XHR`, CDN
- CSP meta teqi xarici skript və məlumat göndərməyi bloklayır
- İstifadəçi girişi heç vaxt `innerHTML`-ə çatmır
- Yeni kod yazanda bu üçünü pozma

---

## Dəyişiklikdən sonra yoxlama

```bash
python src/build.py          # xəta verməməlidir
python -m http.server 8000   # sonra localhost:8000 aç
```

`file://` ilə açma — service worker işləməz.

Yoxlanası: beş tab açılır · bir məşq başdan-sona gedir · Profil →
Oflayn bölməsi düzgün yazır · səhifə yeniləndikdə XP qalır.

---

## Üslub

- İnterfeys mətnləri **Azərbaycan dilində**, düzgün diakritiklərlə (ə, ş, ğ, ı, ö, ü, ç)
- Kod şərhləri Azərbaycanca, amma ASCII ilə (Python mənbə fayllarında)
- Rəng dəyişənləri `shell.html` içindəki `:root` bölməsindədir — sərt kodlanmış rəng yazma
- Dizayn kimliyi: tünd mürəkkəb fon + kağız kart + tələffüz mötərizələri `[ ... ]`
