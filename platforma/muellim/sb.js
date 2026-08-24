/* =====================================================================
   sb.js - Supabase ucun yungul muraciet qati
   Xarici kitabxana yoxdur: CDN yuklenmir, tedarik zenciri riski yoxdur.
   Yalniz lazim olan hisse: qeydiyyat, giris, token yenileme, select, rpc.
   ===================================================================== */
(function () {
  "use strict";

  var KEY = "panel_session";
  var S = null;

  function cfg() {
    var c = window.CFG || {};
    if (!c.SUPABASE_URL || !c.SUPABASE_ANON_KEY) {
      throw new Error("config.js doldurulmayib: SUPABASE_URL ve SUPABASE_ANON_KEY lazimdir.");
    }
    return c;
  }

  function loadSession() {
    try { S = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { S = null; }
    return S;
  }
  function saveSession(s) {
    S = s;
    try {
      if (s) localStorage.setItem(KEY, JSON.stringify(s));
      else localStorage.removeItem(KEY);
    } catch (e) {}
  }

  function headers(withAuth) {
    var c = cfg();
    var h = {
      "apikey": c.SUPABASE_ANON_KEY,
      "Content-Type": "application/json"
    };
    if (withAuth && S && S.access_token) h["Authorization"] = "Bearer " + S.access_token;
    else h["Authorization"] = "Bearer " + c.SUPABASE_ANON_KEY;
    return h;
  }

  function readError(body, status) {
    var msg = "";
    if (body && typeof body === "object") {
      msg = body.message || body.error_description || body.msg || body.error || body.hint || "";
    }
    if (!msg) msg = "Xeta bas verdi (" + status + ").";
    return msg;
  }

  function request(path, opt, retry) {
    opt = opt || {};
    var c = cfg();
    return fetch(c.SUPABASE_URL + path, {
      method: opt.method || "GET",
      headers: headers(opt.auth !== false),
      body: opt.body ? JSON.stringify(opt.body) : undefined
    }).then(function (r) {
      return r.text().then(function (t) {
        var data = null;
        if (t) { try { data = JSON.parse(t); } catch (e) { data = t; } }
        if (r.ok) return data;

        // Token kohnelibse bir defe yenileyib tekrar cehd edirik
        if (r.status === 401 && !retry && S && S.refresh_token) {
          return refresh().then(function (ok) {
            if (!ok) { saveSession(null); throw new Error("Sessiya bitib. Yeniden daxil olun."); }
            return request(path, opt, true);
          });
        }
        var err = new Error(readError(data, r.status));
        err.status = r.status;
        err.body = data;
        throw err;
      });
    });
  }

  function refresh() {
    var c = cfg();
    return fetch(c.SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: { "apikey": c.SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: S.refresh_token })
    }).then(function (r) {
      if (!r.ok) return false;
      return r.json().then(function (d) {
        if (!d || !d.access_token) return false;
        saveSession(d);
        return true;
      });
    }).catch(function () { return false; });
  }

  var sb = {
    session: function () { return S; },
    loadSession: loadSession,

    signUp: function (email, password, fullName) {
      return request("/auth/v1/signup", {
        method: "POST", auth: false,
        body: { email: email, password: password, data: { full_name: fullName || "" } }
      }).then(function (d) {
        // E-poct tesdiqi acıqdirsa access_token gelmir - istifadeci postu yoxlamalidir
        if (d && d.access_token) saveSession(d);
        return d;
      });
    },

    signIn: function (email, password) {
      return request("/auth/v1/token?grant_type=password", {
        method: "POST", auth: false,
        body: { email: email, password: password }
      }).then(function (d) {
        if (!d || !d.access_token) throw new Error("Giris alinmadi.");
        saveSession(d);
        return d;
      });
    },

    signOut: function () {
      var had = !!(S && S.access_token);
      var p = had ? request("/auth/v1/logout", { method: "POST" }).catch(function () {}) 
                  : Promise.resolve();
      return p.then(function () { saveSession(null); });
    },

    rpc: function (fn, args) {
      return request("/rest/v1/rpc/" + encodeURIComponent(fn), {
        method: "POST", body: args || {}
      });
    },

    /* select("students", {select:"id,full_name", eq:{class_id:x}, order:"full_name"}) */
    select: function (table, o) {
      o = o || {};
      var q = [];
      q.push("select=" + encodeURIComponent(o.select || "*"));
      if (o.eq) {
        Object.keys(o.eq).forEach(function (k) {
          q.push(encodeURIComponent(k) + "=eq." + encodeURIComponent(o.eq[k]));
        });
      }
      if (o.order) q.push("order=" + encodeURIComponent(o.order));
      return request("/rest/v1/" + encodeURIComponent(table) + "?" + q.join("&"));
    },

    del: function (table, eq) {
      var q = Object.keys(eq).map(function (k) {
        return encodeURIComponent(k) + "=eq." + encodeURIComponent(eq[k]);
      });
      return request("/rest/v1/" + encodeURIComponent(table) + "?" + q.join("&"),
                     { method: "DELETE" });
    }
  };

  loadSession();
  window.sb = sb;
})();
