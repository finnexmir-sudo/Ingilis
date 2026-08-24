/* =====================================================================
   Muellim / repetitor paneli
   Butun melumat Supabase-den gelir. Sagird kodlari, qrup kodlari ve
   yer limiti SERVERDE idare olunur - burada yalniz gosterilir.
   ===================================================================== */
(function () {
  "use strict";

  var main = document.getElementById("main");
  var topWho = document.getElementById("topWho");
  var topTitle = document.getElementById("topTitle");
  var btnOut = document.getElementById("btnOut");

  var CTX = null;      // rpc_my_context() neticesi
  var ACC = null;      // aktiv hesab
  var busy = false;

  /* ------------------------------------------------------ komekciler */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function $(id) { return document.getElementById(id); }
  /* Yeni ekran cizilende "gozleyin" veziyyeti hemise sifirlanir -
     eks halda kecid ugurlu olanda duymeler olu qalir. */
  function show(html) { busy = false; main.innerHTML = html; main.scrollTop = 0; }
  function on(id, ev, fn) { var e = $(id); if (e) e.addEventListener(ev, fn); }

  function msg(kind, text) {
    return '<div class="' + kind + '">' + esc(text) + "</div>";
  }
  function fail(e) {
    var t = (e && e.message) ? e.message : String(e);
    if (/limit/i.test(t) || /check_violation/i.test(t)) {
      t = t.replace(/^.*?:\s*/, "");
    }
    return t;
  }
  function setBusy(id, state, label) {
    var b = $(id);
    if (!b) return;
    busy = state;
    b.disabled = state;
    if (label) b.textContent = state ? "Gözləyin…" : label;
  }

  /* ------------------------------------------------------ giris ekrani */
  function screenAuth(mode, note) {
    mode = mode || "in";
    topTitle.textContent = "Müəllim paneli";
    topWho.textContent = "";
    btnOut.classList.add("hide");

    var isUp = mode === "up";
    show(
      '<div class="card" style="margin-top:22px">' +
        "<h1>" + (isUp ? "Qeydiyyat" : "Daxil ol") + "</h1>" +
        '<p class="note">' + (isUp
          ? "Müəllim və ya repetitor hesabı yaradın. Şagirdlərin hesabı olmur — onlara kod verirsiniz."
          : "Hesabınıza daxil olun.") + "</p>" +
        (note || "") +
        '<div id="authErr"></div>' +
        (isUp ? '<label for="fname">Ad, soyad</label><input id="fname" autocomplete="name">' : "") +
        '<label for="email">E-poçt</label>' +
        '<input id="email" type="email" autocomplete="email" inputmode="email">' +
        '<label for="pass">Parol</label>' +
        '<input id="pass" type="password" autocomplete="' +
          (isUp ? "new-password" : "current-password") + '">' +
        '<button class="btn go" id="btnAuth" style="width:100%">' +
          (isUp ? "Hesab yarat" : "Daxil ol") + "</button>" +
        '<div class="spacer"></div>' +
        '<button class="btn ghost" id="btnSwap" style="width:100%">' +
          (isUp ? "Hesabım var — daxil ol" : "Hesabım yoxdur — qeydiyyat") + "</button>" +
      "</div>"
    );

    on("btnSwap", "click", function () { screenAuth(isUp ? "in" : "up"); });
    on("btnAuth", "click", doAuth);
    ["email", "pass", "fname"].forEach(function (id) {
      on(id, "keydown", function (e) { if (e.key === "Enter") doAuth(); });
    });

    function doAuth() {
      if (busy) return;
      var email = ($("email").value || "").trim();
      var pass = $("pass").value || "";
      var fname = $("fname") ? ($("fname").value || "").trim() : "";

      if (!email || !pass) {
        $("authErr").innerHTML = msg("err", "E-poçt və parol lazımdır.");
        return;
      }
      if (isUp && pass.length < 8) {
        $("authErr").innerHTML = msg("err", "Parol ən azı 8 simvol olmalıdır.");
        return;
      }
      $("authErr").innerHTML = "";
      setBusy("btnAuth", true, isUp ? "Hesab yarat" : "Daxil ol");

      var p = isUp ? sb.signUp(email, pass, fname) : sb.signIn(email, pass);
      p.then(function (d) {
        if (isUp && (!d || !d.access_token)) {
          setBusy("btnAuth", false, "Hesab yarat");
          screenAuth("in", msg("ok",
            "Hesab yaradıldı. E-poçtunuza təsdiq məktubu göndərildi — " +
            "linkə keçdikdən sonra bura qayıdıb daxil olun."));
          return;
        }
        boot();
      }).catch(function (e) {
        setBusy("btnAuth", false, isUp ? "Hesab yarat" : "Daxil ol");
        $("authErr").innerHTML = msg("err", fail(e));
      });
    }
  }

  /* --------------------------------------------------- ilk quraşdirma */
  function screenSetup() {
    topTitle.textContent = "Hesab quraşdırılması";
    show(
      '<div class="card" style="margin-top:22px">' +
        "<h1>Bir addım qaldı</h1>" +
        '<p class="note">Necə işlədiyinizi seçin. Bunu sonra dəyişmək olar.</p>' +
        '<div id="setupErr"></div>' +
        '<label for="atype">Hesab tipi</label>' +
        '<select id="atype">' +
          '<option value="tutor">Repetitor — öz qruplarım</option>' +
          '<option value="school">Məktəb müəllimi — sinif</option>' +
        "</select>" +
        '<label for="aname">Hesabın adı</label>' +
        '<input id="aname" placeholder="məsələn: Leyla müəllim — riyaziyyat">' +
        '<button class="btn go" id="btnSetup" style="width:100%">Davam et</button>' +
      "</div>"
    );

    on("btnSetup", "click", function () {
      if (busy) return;
      var name = ($("aname").value || "").trim();
      if (!name) {
        $("setupErr").innerHTML = msg("err", "Hesabın adını yazın.");
        return;
      }
      setBusy("btnSetup", true, "Davam et");
      sb.rpc("rpc_create_account", { p_type: $("atype").value, p_name: name })
        .then(boot)
        .catch(function (e) {
          setBusy("btnSetup", false, "Davam et");
          $("setupErr").innerHTML = msg("err", fail(e));
        });
    });
  }

  /* ------------------------------------------------------ qrup siyahisi */
  function screenHome() {
    topTitle.textContent = ACC.name;
    show("");
    var used = ACC.students_used, lim = ACC.students_limit;
    var pct = lim > 0 ? Math.min(100, Math.round(used * 100 / lim)) : 0;
    var cls = pct >= 100 ? "bar full" : (pct >= 80 ? "bar warn" : "bar");

    var html =
      '<div class="card">' +
        '<div class="seat"><b>' + used + " / " + (lim > 1000000 ? "∞" : lim) + "</b>" +
        "<i>şagird · " + esc(ACC.plan ? ACC.plan.name : "paketsiz") + "</i></div>" +
        '<div class="' + cls + '"><i style="width:' + pct + '%"></i></div>' +
        (pct >= 100
          ? '<div class="warn" style="margin-top:12px;margin-bottom:0">Paketin limiti dolub. ' +
            "Yeni şagird əlavə etmək üçün paketi genişləndirin.</div>"
          : "") +
      "</div>" +
      "<h2>Qruplar</h2>" +
      '<div id="groups" class="card pad0"><div class="empty">Yüklənir…</div></div>' +
      '<div class="spacer"></div>' +
      '<div class="card">' +
        '<label for="gname">Yeni qrup</label>' +
        '<div class="fieldrow">' +
          '<div><input id="gname" placeholder="məsələn: Cümə qrupu"></div>' +
          '<div style="flex:0 0 140px"><select id="glevel">' +
            '<option value="">sinif seçilməyib</option>' +
          "</select></div>" +
        "</div>" +
        '<div id="gErr"></div>' +
        '<button class="btn go" id="btnGroup">Qrup yarat</button>' +
      "</div>";
    show(html);

    // ibtidai sinifleri doldururuq (iki sade sorgu - embedding yoxdur)
    sb.select("programs", { select: "id,slug", eq: { slug: "ibtidai" } })
      .then(function (ps) {
        if (!ps || !ps.length) return null;
        return sb.select("levels", {
          select: "id,code,name", eq: { program_id: ps[0].id }, order: "sort"
        });
      })
      .then(function (rows) {
        var sel = $("glevel");
        if (!sel || !rows) return;
        rows.forEach(function (r) {
          var o = document.createElement("option");
          o.value = r.code; o.textContent = r.name;
          sel.appendChild(o);
        });
      })
      .catch(function () {});

    loadGroups();

    on("btnGroup", "click", function () {
      if (busy) return;
      var name = ($("gname").value || "").trim();
      if (!name) { $("gErr").innerHTML = msg("err", "Qrupun adını yazın."); return; }
      $("gErr").innerHTML = "";
      setBusy("btnGroup", true, "Qrup yarat");
      sb.rpc("rpc_create_class", {
        p_account_id: ACC.id,
        p_name: name,
        p_kind: ACC.type === "school" ? "school_class" : "tutor_group",
        p_program_slug: "ibtidai",
        p_level_code: $("glevel").value || null
      }).then(function () {
        $("gname").value = "";
        setBusy("btnGroup", false, "Qrup yarat");
        loadGroups();
      }).catch(function (e) {
        setBusy("btnGroup", false, "Qrup yarat");
        $("gErr").innerHTML = msg("err", fail(e));
      });
    });
  }

  function loadGroups() {
    var groups = null;
    sb.select("classes", {
      select: "id,name,join_code,kind",
      eq: { account_id: ACC.id },
      order: "name"
    }).then(function (rows) {
      groups = rows || [];
      if (!groups.length) return [];
      return sb.select("students", {
        select: "id,class_id", eq: { account_id: ACC.id }
      });
    }).then(function (studs) {
      var cnt = {};
      (studs || []).forEach(function (s) {
        cnt[s.class_id] = (cnt[s.class_id] || 0) + 1;
      });
      var rows = groups;
      var box = $("groups");
      if (!box) return;
      if (!rows || !rows.length) {
        box.innerHTML = '<div class="empty"><s>👥</s>Hələ qrup yoxdur.<br>' +
                        "Aşağıdan birincisini yaradın.</div>";
        return;
      }
      box.innerHTML = rows.map(function (g) {
        var n = cnt[g.id] || 0;
        return '<button class="item" data-g="' + esc(g.id) + '">' +
          '<div class="g"><b>' + esc(g.name) + "</b>" +
          "<i>" + n + " şagird · qoşulma kodu " +
          '<span class="code sm">' + esc(g.join_code) + "</span></i></div>" +
          '<span class="arrow">›</span></button>';
      }).join("");
      Array.prototype.forEach.call(box.querySelectorAll("[data-g]"), function (b) {
        b.addEventListener("click", function () {
          screenGroup(b.getAttribute("data-g"));
        });
      });
    }).catch(function (e) {
      var box = $("groups");
      if (box) box.innerHTML = '<div class="empty">' + esc(fail(e)) + "</div>";
    });
  }

  /* ------------------------------------------------------- qrup detali */
  function screenGroup(id) {
    show('<div class="card"><div class="empty">Yüklənir…</div></div>');
    sb.select("classes", { select: "id,name,join_code,account_id", eq: { id: id } })
      .then(function (rows) {
        if (!rows || !rows.length) throw new Error("Qrup tapılmadı.");
        drawGroup(rows[0]);
      })
      .catch(function (e) { show(msg("err", fail(e))); });
  }

  function drawGroup(g) {
    topTitle.textContent = g.name;
    show(
      '<button class="btn sm ghost" id="btnBack">‹ Qruplar</button>' +
      '<div class="spacer"></div>' +
      '<div class="card">' +
        "<h1>" + esc(g.name) + "</h1>" +
        '<p class="note" style="margin-bottom:0">Qoşulma kodu: ' +
          '<span class="code">' + esc(g.join_code) + "</span></p>" +
      "</div>" +
      "<h2>Şagirdlər</h2>" +
      '<div id="stu" class="card pad0"><div class="empty">Yüklənir…</div></div>' +
      '<div class="spacer"></div>' +
      '<div class="card">' +
        '<label for="sname">Yeni şagird</label>' +
        '<div class="fieldrow">' +
          '<div><input id="sname" placeholder="Ad və soyad"></div>' +
          '<div><input id="snick" placeholder="Ləqəb (istəyə bağlı)"></div>' +
        "</div>" +
        '<p class="muted" style="margin:-6px 0 12px">Ləqəb liderlər lövhəsində görünür. ' +
          "Boş buraxsanız avtomatik qısaldılacaq (Aysu Məmmədova → Aysu M.).</p>" +
        '<div id="sErr"></div>' +
        '<button class="btn go" id="btnStu">Şagird əlavə et</button>' +
      "</div>"
    );

    on("btnBack", "click", function () { screenHome(); });
    on("sname", "keydown", function (e) { if (e.key === "Enter") addStudent(); });
    on("snick", "keydown", function (e) { if (e.key === "Enter") addStudent(); });
    on("btnStu", "click", addStudent);

    loadStudents(g.id);

    function addStudent() {
      if (busy) return;
      var nm = ($("sname").value || "").trim();
      if (!nm) { $("sErr").innerHTML = msg("err", "Şagirdin adını yazın."); return; }
      $("sErr").innerHTML = "";
      setBusy("btnStu", true, "Şagird əlavə et");
      sb.rpc("rpc_add_student", {
        p_class_id: g.id,
        p_full_name: nm,
        p_display_name: ($("snick").value || "").trim() || null
      }).then(function () {
        $("sname").value = ""; $("snick").value = "";
        setBusy("btnStu", false, "Şagird əlavə et");
        return refreshContext().then(function () { loadStudents(g.id); });
      }).catch(function (e) {
        setBusy("btnStu", false, "Şagird əlavə et");
        $("sErr").innerHTML = msg("err", fail(e));
      });
    }
  }

  function loadStudents(classId) {
    sb.select("students", {
      select: "id,full_name,display_name,login_code,is_active",
      eq: { class_id: classId },
      order: "full_name"
    }).then(function (rows) {
      var box = $("stu");
      if (!box) return;
      if (!rows || !rows.length) {
        box.innerHTML = '<div class="empty"><s>🧒</s>Hələ şagird yoxdur.</div>';
        return;
      }
      box.innerHTML = rows.map(function (s) {
        return '<div class="stu">' +
          '<div class="l1"><b>' + esc(s.full_name) + "</b>" +
          '<span class="muted">' + esc(s.display_name) + "</span></div>" +
          '<div class="l2">' +
            '<span class="code">' + esc(s.login_code) + "</span>" +
            '<button class="btn sm" data-copy="' + esc(s.login_code) + '">Kopyala</button>' +
            '<button class="btn sm" data-wa="' + esc(s.id) + '">WhatsApp</button>' +
            '<button class="btn sm ghost" data-reset="' + esc(s.id) + '">Kodu yenilə</button>' +
          "</div></div>";
      }).join("");

      Array.prototype.forEach.call(box.querySelectorAll("[data-copy]"), function (b) {
        b.addEventListener("click", function () {
          copyText(b.getAttribute("data-copy"), b);
        });
      });
      Array.prototype.forEach.call(box.querySelectorAll("[data-wa]"), function (b) {
        b.addEventListener("click", function () {
          var s = rows.filter(function (x) { return x.id === b.getAttribute("data-wa"); })[0];
          if (s) window.open(waLink(s), "_blank", "noopener");
        });
      });
      Array.prototype.forEach.call(box.querySelectorAll("[data-reset]"), function (b) {
        b.addEventListener("click", function () {
          if (!confirm("Kod yenilənsin?\n\nKöhnə kod dərhal etibarsız olacaq və " +
                       "şagird yenidən daxil olmalıdır.")) return;
          b.disabled = true;
          sb.rpc("rpc_reset_student_code", { p_student_id: b.getAttribute("data-reset") })
            .then(function () { loadStudents(classId); })
            .catch(function (e) { b.disabled = false; alert(fail(e)); });
        });
      });
    }).catch(function (e) {
      var box = $("stu");
      if (box) box.innerHTML = '<div class="empty">' + esc(fail(e)) + "</div>";
    });
  }

  function waLink(s) {
    var url = (window.CFG && window.CFG.STUDENT_URL) || "";
    var t = "Salam! " + s.full_name + " üçün test girişi:\n\n" +
            "Link: " + url + "\n" +
            "Giriş kodu: " + s.login_code + "\n\n" +
            "Linki açıb kodu yazmaq kifayətdir.";
    return "https://wa.me/?text=" + encodeURIComponent(t);
  }

  function copyText(t, btn) {
    var done = function () {
      var old = btn.textContent;
      btn.textContent = "Kopyalandı";
      setTimeout(function () { btn.textContent = old; }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(done, function () { fallback(); });
    } else { fallback(); }

    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = t; ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { alert(t); }
      document.body.removeChild(ta);
    }
  }

  /* ------------------------------------------------------------- boot */
  function refreshContext() {
    return sb.rpc("rpc_my_context").then(function (c) {
      CTX = c;
      if (CTX && CTX.accounts && CTX.accounts.length) {
        var keep = ACC ? ACC.id : null;
        ACC = CTX.accounts.filter(function (a) { return a.id === keep; })[0] || CTX.accounts[0];
      } else { ACC = null; }
      return CTX;
    });
  }

  function boot() {
    if (!window.CFG || !window.CFG.SUPABASE_URL || !window.CFG.SUPABASE_ANON_KEY) {
      btnOut.classList.add("hide");
      show(msg("err", "config.js doldurulmayıb. SUPABASE_URL və SUPABASE_ANON_KEY yazın.") +
           '<p class="note">Supabase → Settings → API bölməsindən götürün. ' +
           "anon açar ictimaidir, onu gizlətmək lazım deyil.</p>");
      return;
    }
    if (!sb.session()) { screenAuth("in"); return; }

    show('<div class="card"><div class="empty">Yüklənir…</div></div>');
    refreshContext().then(function () {
      btnOut.classList.remove("hide");
      topWho.textContent = (CTX.profile && CTX.profile.full_name) || "";
      if (!ACC) screenSetup();
      else screenHome();
    }).catch(function (e) {
      if (e && e.status === 401) { sb.signOut().then(function () { screenAuth("in"); }); return; }
      show(msg("err", fail(e)));
    });
  }

  btnOut.addEventListener("click", function () {
    sb.signOut().then(function () { CTX = null; ACC = null; screenAuth("in"); });
  });

  boot();
})();
