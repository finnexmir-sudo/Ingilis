# Təhsil platforması — baza sxemi

Bu qovluq **yeni məhsulun** baza təməlidir. İngilis Dili tətbiqinə heç bir
əlaqəsi yoxdur — ayrı repozitoriyaya köçürülənə qədər müvəqqəti burada saxlanılır.

## Fayllar

| Fayl | Nə edir |
|---|---|
| `db/01_schema.sql` | tiplər, 22 cədvəl, indekslər, triggerlər |
| `db/02_rls.sql` | köməkçi funksiyalar, 38 RLS siyasəti, yer limiti |
| `db/03_rpc.sql` | şagird tərəfi — giriş, test, cavab yoxlama, lövhə |
| `db/04_seed.sql` | proqramlar, fənlər, səviyyələr, paketlər |
| `db/05_grants.sql` | **ən sonda** — Supabase-in default hüquqlarını geri alır |
| `db/test/` | yalnız lokal yoxlama üçün (Supabase-də işlətmə) |

## Supabase-də qurmaq

SQL Editor-da: `01` → `02` → `03` → `06` → `04` → `05`.

`test/` qovluğundakı fayllar Supabase-də **işlədilmir** — onlar `auth` sxemini
təqlid edir, Supabase-də isə o artıq var.

**Qayda sadədir: `05_grants.sql` cədvəl yaradan hər fayldan sonra işlədilməlidir.**
Supabase hər yeni cədvələ avtomatik olaraq `anon`/`authenticated` hüququ verir,
`05` isə onu geri alır. `06` cədvəl yaratmadığına görə onu `05`-dən sonra
işlətmək də təhlükəsizdir — sınanıb.

Qurulduqdan sonra `db/test/verify.sql` faylını SQL Editor-a yapışdırıb işlədin:
heç nə dəyişmir, yalnız 7 sətirlik hesabat verir — cədvəl sayı, RLS, siyasətlər,
RPC-lər, triggerlər, seed və `anon`-a açıq qalan həssas cədvəl varmı.

## Lokal yoxlama

```bash
createdb tehsil
cd db && ./run.sh tehsil --local
psql -d tehsil -f test/smoke.sql
```

`smoke.sql` 13 yoxlama edir — hər biri təhlükəsizlik və ya məntiq iddiasıdır.
Biri pozulsa skript dayanır.

## Üç əsas qərar

**1 · Şagirdin auth hesabı yoxdur.**
Uşaq müəllimin verdiyi kodla girir, 12 saatlıq token alır. Token bazada xam
saxlanmır — yalnız SHA-256 özəti. Böyük öyrənən (MİQ, sertifikasiya) isə
`students.self_user_id` ilə öz hesabına bağlanır. Yəni `students` cədvəli
«uşaq» deyil, **«öyrənən profili»**dir.

**2 · Bal serverdə hesablanır.**
`question_options.is_correct` şagird tərəfinə heç vaxt getmir. Şagird
`rpc_start_attempt()` ilə sualları cavabsız alır, `rpc_submit_attempt()` ilə
cavablarını göndərir, bal bazada hesablanır. Şagird `attempts` cədvəlinə
birbaşa yaza bilmir — hüquq geri alınıb. Uydurma cavab id-ləri sıfır bal verir.

**3 · Şəxsi məlumat yalnız `students` cədvəlindədir.**
Ad-soyad başqa heç bir yerdə yoxdur. Liderlər lövhəsi `display_name`
göstərir. Tam doğum tarixi yox, yalnız `birth_year` saxlanılır. Silinmə
tələbi gələndə bir sətir silinir — cəhdlər, cavablar və sessiyalar
`ON DELETE CASCADE` ilə ardınca gedir. `consents` cədvəli valideyn
razılığının sənədidir.

## Seqmentlər

`accounts.type` ödəyən tərəfi müəyyən edir: `parent` · `tutor` · `school` ·
`individual`. Repetitor qrupu ilə məktəb sinfi eyni `classes` cədvəlindədir,
fərq `kind` sütunundadır (`school_class` / `tutor_group` / `self_study`).

Repetitor paketləri şagird sayına görədir. Limit **bazada** tətbiq olunur
(`app.enforce_seat_limit()` trigger-i) — frontend-ə etibar edilmir. Abunəsiz
hesabın pulsuz həddi 5 şagirddir.

## Genişlənmə

`programs` → `levels` quruluşu həm sinfi (1–11), həm də imtahan
kateqoriyasını (MİQ ixtisasları, sertifikasiya) daşıyır. Yeni kateqoriya
əlavə etmək üçün sxem dəyişmir — `programs`-a bir sətir, `levels`-ə bir neçə
sətir kifayətdir.

`payments` cədvəli Epoint və bənzəri şlüzlər üçün hazırdır: `provider`,
`provider_ref`, `raw` (şlüzün tam cavabı). Ödəniş yazmaq yalnız
`service_role` ilə mümkündür — webhook-dan.

## Müəllim / repetitor paneli

`muellim/` — statik səhifə, xarici kitabxana yoxdur (CDN yüklənmir).

| Fayl | Nə edir |
|---|---|
| `index.html` | karkas |
| `app.css` | açıq tema, 44px toxunma sahələri |
| `sb.js` | Supabase üçün yüngül müraciət qatı — qeydiyyat, giriş, token yeniləmə, select, rpc |
| `app.js` | panel məntiqi |
| `config.js` | **doldurulmalıdır** — SUPABASE_URL, SUPABASE_ANON_KEY, STUDENT_URL |

Axın: qeydiyyat → hesab tipi (repetitor / məktəb) → qrup → şagird → giriş kodu →
WhatsApp ilə göndər.

Giriş kodları və qoşulma kodları **serverdə** yaradılır (`app.gen_login_code`),
qarışdırılan simvollar yoxdur (`0/O`, `1/I/L` iştirak etmir). Yer limiti
paneldə deyil, bazada tətbiq olunur — panel yalnız xətanı göstərir.

## Yoxlama — uçdan-uca

```bash
./test/run_e2e.sh
```

Təmiz baza qurur, `test/mock_supabase.py` ilə Supabase-in kiçik təqlidini
qaldırır və Chromium-da paneli sürür: qeydiyyat, hesab, qrup, şagird,
WhatsApp linki, kopyalama, paket limiti, kod yeniləmə, çıxış/giriş,
başqa müəllimin təcridi, yanlış parol — 33 yoxlama.

`test/mock_supabase.py` **yalnız yoxlama üçündür**, istehsalata getmir.

## Hələ edilməyənlər

- Giriş kodunun brute-force müdafiəsi — Edge Function səviyyəsində rate limit lazımdır
- `app.gc_sessions()` funksiyası var, amma onu çağıran cədvəl planlaşdırıcısı (pg_cron) qurulmayıb
- Müəllim/valideyn panelləri
- Ödəniş şlüzü inteqrasiyası
