!(function(e, t) {
  "object" == typeof exports && "object" == typeof module ? module.exports = t() : "function" == typeof define && define.amd ? define([], t) : "object" == typeof exports ? exports.supabase = t() : e.supabase = t();
})(self, (() => (() => {
  var e, t, s = { 982: (e2, t2, s2) => {
    "use strict";
    s2.r(t2), s2.d(t2, { FunctionsClient: () => a, FunctionsError: () => r2, FunctionsFetchError: () => i2, FunctionsHttpError: () => o, FunctionsRelayError: () => n });
    class r2 extends Error {
      constructor(e3, t3 = "FunctionsError", s3) {
        super(e3), this.name = t3, this.context = s3;
      }
    }
    class i2 extends r2 {
      constructor(e3) {
        super("Failed to send a request to the Edge Function", "FunctionsFetchError", e3);
      }
    }
    class n extends r2 {
      constructor(e3) {
        super("Relay Error invoking the Edge Function", "FunctionsRelayError", e3);
      }
    }
    class o extends r2 {
      constructor(e3) {
        super("Edge Function returned a non-2xx status code", "FunctionsHttpError", e3);
      }
    }
    class a {
      constructor(e3, { headers: t3 = {}, customFetch: r3 } = {}) {
        this.url = e3, this.headers = t3, this.fetch = ((e4) => {
          let t4;
          return t4 = e4 || ("undefined" == typeof fetch ? (...e5) => Promise.resolve().then(s2.t.bind(s2, 743, 23)).then((({ default: t5 }) => t5(...e5))) : fetch), (...e5) => t4(...e5);
        })(r3);
      }
      setAuth(e3) {
        this.headers.Authorization = "Bearer ".concat(e3);
      }
      invoke(e3, t3 = {}) {
        var s3, r3, a2, c, h;
        return r3 = this, a2 = void 0, h = function* () {
          try {
            const { headers: r4, method: a3, body: c2 } = t3;
            let h2, l = {};
            c2 && (r4 && !Object.prototype.hasOwnProperty.call(r4, "Content-Type") || !r4) && ("undefined" != typeof Blob && c2 instanceof Blob || c2 instanceof ArrayBuffer ? (l["Content-Type"] = "application/octet-stream", h2 = c2) : "string" == typeof c2 ? (l["Content-Type"] = "text/plain", h2 = c2) : "undefined" != typeof FormData && c2 instanceof FormData ? h2 = c2 : (l["Content-Type"] = "application/json", h2 = JSON.stringify(c2)));
            const u = yield this.fetch("".concat(this.url, "/").concat(e3), { method: a3 || "POST", headers: Object.assign(Object.assign(Object.assign({}, l), this.headers), r4), body: h2 }).catch(((e4) => {
              throw new i2(e4);
            })), d = u.headers.get("x-relay-error");
            if (d && "true" === d) throw new n(u);
            if (!u.ok) throw new o(u);
            let f, p = (null !== (s3 = u.headers.get("Content-Type")) && void 0 !== s3 ? s3 : "text/plain").split(";")[0].trim();
            return f = "application/json" === p ? yield u.json() : "application/octet-stream" === p ? yield u.blob() : "multipart/form-data" === p ? yield u.formData() : yield u.text(), { data: f, error: null };
          } catch (e4) {
            return { data: null, error: e4 };
          }
        }, new ((c = void 0) || (c = Promise))((function(e4, t4) {
          function s4(e5) {
            try {
              n2(h.next(e5));
            } catch (e6) {
              t4(e6);
            }
          }
          function i3(e5) {
            try {
              n2(h.throw(e5));
            } catch (e6) {
              t4(e6);
            }
          }
          function n2(t5) {
            var r4;
            t5.done ? e4(t5.value) : (r4 = t5.value, r4 instanceof c ? r4 : new c((function(e5) {
              e5(r4);
            }))).then(s4, i3);
          }
          n2((h = h.apply(r3, a2 || [])).next());
        }));
      }
    }
  }, 765: (e2, t2, s2) => {
    "use strict";
    s2.r(t2), s2.d(t2, { AuthApiError: () => _, AuthError: () => m, AuthImplicitGrantRedirectError: () => j, AuthInvalidCredentialsError: () => E, AuthInvalidTokenResponseError: () => T, AuthPKCEGrantCodeExchangeError: () => O, AuthRetryableFetchError: () => P, AuthSessionMissingError: () => S, AuthUnknownError: () => w, CustomAuthError: () => k, GoTrueAdminApi: () => F, GoTrueClient: () => X, NavigatorLockAcquireTimeoutError: () => H, isAuthApiError: () => b, isAuthError: () => v, isAuthRetryableFetchError: () => $, lockInternals: () => z, navigatorLock: () => K });
    const r2 = () => "undefined" != typeof document, i2 = { tested: false, writable: false }, n = () => {
      if (!r2()) return false;
      try {
        if ("object" != typeof globalThis.localStorage) return false;
      } catch (e4) {
        return false;
      }
      if (i2.tested) return i2.writable;
      const e3 = "lswt-".concat(Math.random()).concat(Math.random());
      try {
        globalThis.localStorage.setItem(e3, e3), globalThis.localStorage.removeItem(e3), i2.tested = true, i2.writable = true;
      } catch (e4) {
        i2.tested = true, i2.writable = false;
      }
      return i2.writable;
    };
    function o(e3) {
      const t3 = {}, s3 = new URL(e3);
      if (s3.hash && "#" === s3.hash[0]) try {
        new URLSearchParams(s3.hash.substring(1)).forEach(((e4, s4) => {
          t3[s4] = e4;
        }));
      } catch (e4) {
      }
      return s3.searchParams.forEach(((e4, s4) => {
        t3[s4] = e4;
      })), t3;
    }
    const a = (e3) => {
      let t3;
      return t3 = e3 || ("undefined" == typeof fetch ? (...e4) => Promise.resolve().then(s2.t.bind(s2, 743, 23)).then((({ default: t4 }) => t4(...e4))) : fetch), (...e4) => t3(...e4);
    }, c = (e3) => "object" == typeof e3 && null !== e3 && "status" in e3 && "ok" in e3 && "json" in e3 && "function" == typeof e3.json, h = async (e3, t3, s3) => {
      await e3.setItem(t3, JSON.stringify(s3));
    }, l = async (e3, t3) => {
      const s3 = await e3.getItem(t3);
      if (!s3) return null;
      try {
        return JSON.parse(s3);
      } catch (e4) {
        return s3;
      }
    }, u = async (e3, t3) => {
      await e3.removeItem(t3);
    };
    class d {
      constructor() {
        this.promise = new d.promiseConstructor(((e3, t3) => {
          this.resolve = e3, this.reject = t3;
        }));
      }
    }
    function f(e3) {
      const t3 = e3.split(".");
      if (3 !== t3.length) throw new Error("JWT is not valid: not a JWT structure");
      if (!/^([a-z0-9_-]{4})*($|[a-z0-9_-]{3}=?$|[a-z0-9_-]{2}(==)?$)$/i.test(t3[1])) throw new Error("JWT is not valid: payload is not in base64url format");
      const s3 = t3[1];
      return JSON.parse((function(e4) {
        const t4 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        let s4, r3, i3, n2, o2, a2, c2, h2 = "", l2 = 0;
        for (e4 = e4.replace("-", "+").replace("_", "/"); l2 < e4.length; ) n2 = t4.indexOf(e4.charAt(l2++)), o2 = t4.indexOf(e4.charAt(l2++)), a2 = t4.indexOf(e4.charAt(l2++)), c2 = t4.indexOf(e4.charAt(l2++)), s4 = n2 << 2 | o2 >> 4, r3 = (15 & o2) << 4 | a2 >> 2, i3 = (3 & a2) << 6 | c2, h2 += String.fromCharCode(s4), 64 != a2 && 0 != r3 && (h2 += String.fromCharCode(r3)), 64 != c2 && 0 != i3 && (h2 += String.fromCharCode(i3));
        return h2;
      })(s3));
    }
    function p(e3) {
      return ("0" + e3.toString(16)).substr(-2);
    }
    function g() {
      const e3 = new Uint32Array(56);
      if ("undefined" == typeof crypto) {
        const e4 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~", t3 = e4.length;
        let s3 = "";
        for (let r3 = 0; r3 < 56; r3++) s3 += e4.charAt(Math.floor(Math.random() * t3));
        return s3;
      }
      return crypto.getRandomValues(e3), Array.from(e3, p).join("");
    }
    async function y(e3) {
      if ("undefined" == typeof crypto || void 0 === crypto.subtle || "undefined" == typeof TextEncoder) return console.warn("WebCrypto API is not supported. Code challenge method will default to use plain instead of sha256."), e3;
      const t3 = await (async function(e4) {
        const t4 = new TextEncoder().encode(e4), s3 = await crypto.subtle.digest("SHA-256", t4), r3 = new Uint8Array(s3);
        return Array.from(r3).map(((e5) => String.fromCharCode(e5))).join("");
      })(e3);
      return btoa(t3).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }
    d.promiseConstructor = Promise;
    class m extends Error {
      constructor(e3, t3) {
        super(e3), this.__isAuthError = true, this.name = "AuthError", this.status = t3;
      }
    }
    function v(e3) {
      return "object" == typeof e3 && null !== e3 && "__isAuthError" in e3;
    }
    class _ extends m {
      constructor(e3, t3) {
        super(e3, t3), this.name = "AuthApiError", this.status = t3;
      }
      toJSON() {
        return { name: this.name, message: this.message, status: this.status };
      }
    }
    function b(e3) {
      return v(e3) && "AuthApiError" === e3.name;
    }
    class w extends m {
      constructor(e3, t3) {
        super(e3), this.name = "AuthUnknownError", this.originalError = t3;
      }
    }
    class k extends m {
      constructor(e3, t3, s3) {
        super(e3), this.name = t3, this.status = s3;
      }
      toJSON() {
        return { name: this.name, message: this.message, status: this.status };
      }
    }
    class S extends k {
      constructor() {
        super("Auth session missing!", "AuthSessionMissingError", 400);
      }
    }
    class T extends k {
      constructor() {
        super("Auth session or user missing", "AuthInvalidTokenResponseError", 500);
      }
    }
    class E extends k {
      constructor(e3) {
        super(e3, "AuthInvalidCredentialsError", 400);
      }
    }
    class j extends k {
      constructor(e3, t3 = null) {
        super(e3, "AuthImplicitGrantRedirectError", 500), this.details = null, this.details = t3;
      }
      toJSON() {
        return { name: this.name, message: this.message, status: this.status, details: this.details };
      }
    }
    class O extends k {
      constructor(e3, t3 = null) {
        super(e3, "AuthPKCEGrantCodeExchangeError", 500), this.details = null, this.details = t3;
      }
      toJSON() {
        return { name: this.name, message: this.message, status: this.status, details: this.details };
      }
    }
    class P extends k {
      constructor(e3, t3) {
        super(e3, "AuthRetryableFetchError", t3);
      }
    }
    function $(e3) {
      return v(e3) && "AuthRetryableFetchError" === e3.name;
    }
    const x = (e3) => e3.msg || e3.message || e3.error_description || e3.error || JSON.stringify(e3), C = [502, 503, 504];
    async function A(e3) {
      if (!c(e3)) throw new P(x(e3), 0);
      if (C.includes(e3.status)) throw new P(x(e3), e3.status);
      let t3;
      try {
        t3 = await e3.json();
      } catch (e4) {
        throw new w(x(e4), e4);
      }
      throw new _(x(t3), e3.status || 500);
    }
    async function R(e3, t3, s3, r3) {
      var i3;
      const n2 = Object.assign({}, null == r3 ? void 0 : r3.headers);
      (null == r3 ? void 0 : r3.jwt) && (n2.Authorization = "Bearer ".concat(r3.jwt));
      const o2 = null !== (i3 = null == r3 ? void 0 : r3.query) && void 0 !== i3 ? i3 : {};
      (null == r3 ? void 0 : r3.redirectTo) && (o2.redirect_to = r3.redirectTo);
      const a2 = Object.keys(o2).length ? "?" + new URLSearchParams(o2).toString() : "", c2 = await (async function(e4, t4, s4, r4, i4, n3) {
        const o3 = ((e5, t5, s5, r5) => {
          const i5 = { method: e5, headers: (null == t5 ? void 0 : t5.headers) || {} };
          return "GET" === e5 ? i5 : (i5.headers = Object.assign({ "Content-Type": "application/json;charset=UTF-8" }, null == t5 ? void 0 : t5.headers), i5.body = JSON.stringify(r5), Object.assign(Object.assign({}, i5), s5));
        })(t4, r4, {}, n3);
        let a3;
        try {
          a3 = await e4(s4, o3);
        } catch (e5) {
          throw console.error(e5), new P(x(e5), 0);
        }
        if (a3.ok || await A(a3), null == r4 ? void 0 : r4.noResolveJson) return a3;
        try {
          return await a3.json();
        } catch (e5) {
          await A(e5);
        }
      })(e3, t3, s3 + a2, { headers: n2, noResolveJson: null == r3 ? void 0 : r3.noResolveJson }, 0, null == r3 ? void 0 : r3.body);
      return (null == r3 ? void 0 : r3.xform) ? null == r3 ? void 0 : r3.xform(c2) : { data: Object.assign({}, c2), error: null };
    }
    function I(e3) {
      var t3;
      let s3 = null;
      var r3;
      return (function(e4) {
        return e4.access_token && e4.refresh_token && e4.expires_in;
      })(e3) && (s3 = Object.assign({}, e3), e3.expires_at || (s3.expires_at = (r3 = e3.expires_in, Math.round(Date.now() / 1e3) + r3))), { data: { session: s3, user: null !== (t3 = e3.user) && void 0 !== t3 ? t3 : e3 }, error: null };
    }
    function L(e3) {
      var t3;
      return { data: { user: null !== (t3 = e3.user) && void 0 !== t3 ? t3 : e3 }, error: null };
    }
    function U(e3) {
      return { data: e3, error: null };
    }
    function N(e3) {
      const { action_link: t3, email_otp: s3, hashed_token: r3, redirect_to: i3, verification_type: n2 } = e3, o2 = (function(e4, t4) {
        var s4 = {};
        for (var r4 in e4) Object.prototype.hasOwnProperty.call(e4, r4) && t4.indexOf(r4) < 0 && (s4[r4] = e4[r4]);
        if (null != e4 && "function" == typeof Object.getOwnPropertySymbols) {
          var i4 = 0;
          for (r4 = Object.getOwnPropertySymbols(e4); i4 < r4.length; i4++) t4.indexOf(r4[i4]) < 0 && Object.prototype.propertyIsEnumerable.call(e4, r4[i4]) && (s4[r4[i4]] = e4[r4[i4]]);
        }
        return s4;
      })(e3, ["action_link", "email_otp", "hashed_token", "redirect_to", "verification_type"]);
      return { data: { properties: { action_link: t3, email_otp: s3, hashed_token: r3, redirect_to: i3, verification_type: n2 }, user: Object.assign({}, o2) }, error: null };
    }
    function D(e3) {
      return e3;
    }
    class F {
      constructor({ url: e3 = "", headers: t3 = {}, fetch: s3 }) {
        this.url = e3, this.headers = t3, this.fetch = a(s3), this.mfa = { listFactors: this._listFactors.bind(this), deleteFactor: this._deleteFactor.bind(this) };
      }
      async signOut(e3, t3 = "global") {
        try {
          return await R(this.fetch, "POST", "".concat(this.url, "/logout?scope=").concat(t3), { headers: this.headers, jwt: e3, noResolveJson: true }), { data: null, error: null };
        } catch (e4) {
          if (v(e4)) return { data: null, error: e4 };
          throw e4;
        }
      }
      async inviteUserByEmail(e3, t3 = {}) {
        try {
          return await R(this.fetch, "POST", "".concat(this.url, "/invite"), { body: { email: e3, data: t3.data }, headers: this.headers, redirectTo: t3.redirectTo, xform: L });
        } catch (e4) {
          if (v(e4)) return { data: { user: null }, error: e4 };
          throw e4;
        }
      }
      async generateLink(e3) {
        try {
          const { options: t3 } = e3, s3 = (function(e4, t4) {
            var s4 = {};
            for (var r4 in e4) Object.prototype.hasOwnProperty.call(e4, r4) && t4.indexOf(r4) < 0 && (s4[r4] = e4[r4]);
            if (null != e4 && "function" == typeof Object.getOwnPropertySymbols) {
              var i3 = 0;
              for (r4 = Object.getOwnPropertySymbols(e4); i3 < r4.length; i3++) t4.indexOf(r4[i3]) < 0 && Object.prototype.propertyIsEnumerable.call(e4, r4[i3]) && (s4[r4[i3]] = e4[r4[i3]]);
            }
            return s4;
          })(e3, ["options"]), r3 = Object.assign(Object.assign({}, s3), t3);
          return "newEmail" in s3 && (r3.new_email = null == s3 ? void 0 : s3.newEmail, delete r3.newEmail), await R(this.fetch, "POST", "".concat(this.url, "/admin/generate_link"), { body: r3, headers: this.headers, xform: N, redirectTo: null == t3 ? void 0 : t3.redirectTo });
        } catch (e4) {
          if (v(e4)) return { data: { properties: null, user: null }, error: e4 };
          throw e4;
        }
      }
      async createUser(e3) {
        try {
          return await R(this.fetch, "POST", "".concat(this.url, "/admin/users"), { body: e3, headers: this.headers, xform: L });
        } catch (e4) {
          if (v(e4)) return { data: { user: null }, error: e4 };
          throw e4;
        }
      }
      async listUsers(e3) {
        var t3, s3, r3, i3, n2, o2, a2;
        try {
          const c2 = { nextPage: null, lastPage: 0, total: 0 }, h2 = await R(this.fetch, "GET", "".concat(this.url, "/admin/users"), { headers: this.headers, noResolveJson: true, query: { page: null !== (s3 = null === (t3 = null == e3 ? void 0 : e3.page) || void 0 === t3 ? void 0 : t3.toString()) && void 0 !== s3 ? s3 : "", per_page: null !== (i3 = null === (r3 = null == e3 ? void 0 : e3.perPage) || void 0 === r3 ? void 0 : r3.toString()) && void 0 !== i3 ? i3 : "" }, xform: D });
          if (h2.error) throw h2.error;
          const l2 = await h2.json(), u2 = null !== (n2 = h2.headers.get("x-total-count")) && void 0 !== n2 ? n2 : 0, d2 = null !== (a2 = null === (o2 = h2.headers.get("link")) || void 0 === o2 ? void 0 : o2.split(",")) && void 0 !== a2 ? a2 : [];
          return d2.length > 0 && (d2.forEach(((e4) => {
            const t4 = parseInt(e4.split(";")[0].split("=")[1].substring(0, 1)), s4 = JSON.parse(e4.split(";")[1].split("=")[1]);
            c2["".concat(s4, "Page")] = t4;
          })), c2.total = parseInt(u2)), { data: Object.assign(Object.assign({}, l2), c2), error: null };
        } catch (e4) {
          if (v(e4)) return { data: { users: [] }, error: e4 };
          throw e4;
        }
      }
      async getUserById(e3) {
        try {
          return await R(this.fetch, "GET", "".concat(this.url, "/admin/users/").concat(e3), { headers: this.headers, xform: L });
        } catch (e4) {
          if (v(e4)) return { data: { user: null }, error: e4 };
          throw e4;
        }
      }
      async updateUserById(e3, t3) {
        try {
          return await R(this.fetch, "PUT", "".concat(this.url, "/admin/users/").concat(e3), { body: t3, headers: this.headers, xform: L });
        } catch (e4) {
          if (v(e4)) return { data: { user: null }, error: e4 };
          throw e4;
        }
      }
      async deleteUser(e3, t3 = false) {
        try {
          return await R(this.fetch, "DELETE", "".concat(this.url, "/admin/users/").concat(e3), { headers: this.headers, body: { should_soft_delete: t3 }, xform: L });
        } catch (e4) {
          if (v(e4)) return { data: { user: null }, error: e4 };
          throw e4;
        }
      }
      async _listFactors(e3) {
        try {
          const { data: t3, error: s3 } = await R(this.fetch, "GET", "".concat(this.url, "/admin/users/").concat(e3.userId, "/factors"), { headers: this.headers, xform: (e4) => ({ data: { factors: e4 }, error: null }) });
          return { data: t3, error: s3 };
        } catch (e4) {
          if (v(e4)) return { data: null, error: e4 };
          throw e4;
        }
      }
      async _deleteFactor(e3) {
        try {
          return { data: await R(this.fetch, "DELETE", "".concat(this.url, "/admin/users/").concat(e3.userId, "/factors/").concat(e3.id), { headers: this.headers }), error: null };
        } catch (e4) {
          if (v(e4)) return { data: null, error: e4 };
          throw e4;
        }
      }
    }
    const M = "2.56.0", q = { "X-Client-Info": "gotrue-js/".concat(M) }, B = { getItem: (e3) => n() ? globalThis.localStorage.getItem(e3) : null, setItem: (e3, t3) => {
      n() && globalThis.localStorage.setItem(e3, t3);
    }, removeItem: (e3) => {
      n() && globalThis.localStorage.removeItem(e3);
    } };
    function J(e3 = {}) {
      return { getItem: (t3) => e3[t3] || null, setItem: (t3, s3) => {
        e3[t3] = s3;
      }, removeItem: (t3) => {
        delete e3[t3];
      } };
    }
    const z = { debug: !!(globalThis && n() && globalThis.localStorage && "true" === globalThis.localStorage.getItem("supabase.gotrue-js.locks.debug")) };
    class G extends Error {
      constructor(e3) {
        super(e3), this.isAcquireTimeout = true;
      }
    }
    class H extends G {
    }
    async function K(e3, t3, s3) {
      z.debug && console.log("@supabase/gotrue-js: navigatorLock: acquire lock", e3, t3);
      const r3 = new globalThis.AbortController();
      return t3 > 0 && setTimeout((() => {
        r3.abort(), z.debug && console.log("@supabase/gotrue-js: navigatorLock acquire timed out", e3);
      }), t3), await globalThis.navigator.locks.request(e3, 0 === t3 ? { mode: "exclusive", ifAvailable: true } : { mode: "exclusive", signal: r3.signal }, (async (r4) => {
        if (!r4) {
          if (0 === t3) throw z.debug && console.log("@supabase/gotrue-js: navigatorLock: not immediately available", e3), new H('Acquiring an exclusive Navigator LockManager lock "'.concat(e3, '" immediately failed'));
          if (z.debug) try {
            const e4 = await globalThis.navigator.locks.query();
            console.log("@supabase/gotrue-js: Navigator LockManager state", JSON.stringify(e4, null, "  "));
          } catch (e4) {
            console.warn("@supabase/gotrue-js: Error when querying Navigator LockManager state", e4);
          }
          return console.warn("@supabase/gotrue-js: Navigator LockManager returned a null lock when using #request without ifAvailable set to true, it appears this browser is not following the LockManager spec https://developer.mozilla.org/en-US/docs/Web/API/LockManager/request"), await s3();
        }
        z.debug && console.log("@supabase/gotrue-js: navigatorLock: acquired", e3, r4.name);
        try {
          return await s3();
        } finally {
          z.debug && console.log("@supabase/gotrue-js: navigatorLock: released", e3, r4.name);
        }
      }));
    }
    !(function() {
      if ("object" != typeof globalThis) try {
        Object.defineProperty(Object.prototype, "__magic__", { get: function() {
          return this;
        }, configurable: true }), __magic__.globalThis = __magic__, delete Object.prototype.__magic__;
      } catch (e3) {
        "undefined" != typeof self && (self.globalThis = self);
      }
    })();
    const V = { url: "http://localhost:9999", storageKey: "supabase.auth.token", autoRefreshToken: true, persistSession: true, detectSessionInUrl: true, headers: q, flowType: "implicit", debug: false }, W = 3e4;
    async function Y(e3, t3, s3) {
      return await s3();
    }
    class X {
      constructor(e3) {
        var t3;
        this.memoryStorage = null, this.stateChangeEmitters = /* @__PURE__ */ new Map(), this.autoRefreshTicker = null, this.visibilityChangedCallback = null, this.refreshingDeferred = null, this.initializePromise = null, this.detectSessionInUrl = true, this.lockAcquired = false, this.pendingInLock = [], this.broadcastChannel = null, this.logger = console.log, this.instanceID = X.nextInstanceID, X.nextInstanceID += 1, this.instanceID > 0 && r2() && console.warn("Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same storage key.");
        const s3 = Object.assign(Object.assign({}, V), e3);
        if (this.logDebugMessages = !!s3.debug, "function" == typeof s3.debug && (this.logger = s3.debug), this.persistSession = s3.persistSession, this.storageKey = s3.storageKey, this.autoRefreshToken = s3.autoRefreshToken, this.admin = new F({ url: s3.url, headers: s3.headers, fetch: s3.fetch }), this.url = s3.url, this.headers = s3.headers, this.fetch = a(s3.fetch), this.lock = s3.lock || Y, this.detectSessionInUrl = s3.detectSessionInUrl, this.flowType = s3.flowType, this.mfa = { verify: this._verify.bind(this), enroll: this._enroll.bind(this), unenroll: this._unenroll.bind(this), challenge: this._challenge.bind(this), listFactors: this._listFactors.bind(this), challengeAndVerify: this._challengeAndVerify.bind(this), getAuthenticatorAssuranceLevel: this._getAuthenticatorAssuranceLevel.bind(this) }, this.persistSession ? s3.storage ? this.storage = s3.storage : n() ? this.storage = B : (this.memoryStorage = {}, this.storage = J(this.memoryStorage)) : (this.memoryStorage = {}, this.storage = J(this.memoryStorage)), r2() && globalThis.BroadcastChannel && this.persistSession && this.storageKey) {
          try {
            this.broadcastChannel = new globalThis.BroadcastChannel(this.storageKey);
          } catch (e4) {
            console.error("Failed to create a new BroadcastChannel, multi-tab state changes will not be available", e4);
          }
          null === (t3 = this.broadcastChannel) || void 0 === t3 || t3.addEventListener("message", (async (e4) => {
            this._debug("received broadcast notification from other tab or client", e4), await this._notifyAllSubscribers(e4.data.event, e4.data.session, false);
          }));
        }
        this.initialize();
      }
      _debug(...e3) {
        return this.logDebugMessages && this.logger("GoTrueClient@".concat(this.instanceID, " (").concat(M, ") ").concat((/* @__PURE__ */ new Date()).toISOString()), ...e3), this;
      }
      async initialize() {
        return this.initializePromise || (this.initializePromise = (async () => await this._acquireLock(-1, (async () => await this._initialize())))()), await this.initializePromise;
      }
      async _initialize() {
        try {
          const e3 = !!r2() && await this._isPKCEFlow();
          if (this._debug("#_initialize()", "begin", "is PKCE flow", e3), e3 || this.detectSessionInUrl && this._isImplicitGrantFlow()) {
            const { data: t3, error: s3 } = await this._getSessionFromURL(e3);
            if (s3) return this._debug("#_initialize()", "error detecting session from URL", s3), await this._removeSession(), { error: s3 };
            const { session: r3, redirectType: i3 } = t3;
            return this._debug("#_initialize()", "detected session in URL", r3, "redirect type", i3), await this._saveSession(r3), setTimeout((async () => {
              "recovery" === i3 ? await this._notifyAllSubscribers("PASSWORD_RECOVERY", r3) : await this._notifyAllSubscribers("SIGNED_IN", r3);
            }), 0), { error: null };
          }
          return await this._recoverAndRefresh(), { error: null };
        } catch (e3) {
          return v(e3) ? { error: e3 } : { error: new w("Unexpected error during initialization", e3) };
        } finally {
          await this._handleVisibilityChange(), this._debug("#_initialize()", "end");
        }
      }
      async signUp(e3) {
        var t3, s3, r3;
        try {
          let i3;
          if (await this._removeSession(), "email" in e3) {
            const { email: s4, password: r4, options: n3 } = e3;
            let o3 = null, a3 = null;
            if ("pkce" === this.flowType) {
              const e4 = g();
              await h(this.storage, "".concat(this.storageKey, "-code-verifier"), e4), o3 = await y(e4), a3 = e4 === o3 ? "plain" : "s256";
            }
            i3 = await R(this.fetch, "POST", "".concat(this.url, "/signup"), { headers: this.headers, redirectTo: null == n3 ? void 0 : n3.emailRedirectTo, body: { email: s4, password: r4, data: null !== (t3 = null == n3 ? void 0 : n3.data) && void 0 !== t3 ? t3 : {}, gotrue_meta_security: { captcha_token: null == n3 ? void 0 : n3.captchaToken }, code_challenge: o3, code_challenge_method: a3 }, xform: I });
          } else {
            if (!("phone" in e3)) throw new E("You must provide either an email or phone number and a password");
            {
              const { phone: t4, password: n3, options: o3 } = e3;
              i3 = await R(this.fetch, "POST", "".concat(this.url, "/signup"), { headers: this.headers, body: { phone: t4, password: n3, data: null !== (s3 = null == o3 ? void 0 : o3.data) && void 0 !== s3 ? s3 : {}, channel: null !== (r3 = null == o3 ? void 0 : o3.channel) && void 0 !== r3 ? r3 : "sms", gotrue_meta_security: { captcha_token: null == o3 ? void 0 : o3.captchaToken } }, xform: I });
            }
          }
          const { data: n2, error: o2 } = i3;
          if (o2 || !n2) return { data: { user: null, session: null }, error: o2 };
          const a2 = n2.session, c2 = n2.user;
          return n2.session && (await this._saveSession(n2.session), await this._notifyAllSubscribers("SIGNED_IN", a2)), { data: { user: c2, session: a2 }, error: null };
        } catch (e4) {
          if (v(e4)) return { data: { user: null, session: null }, error: e4 };
          throw e4;
        }
      }
      async signInWithPassword(e3) {
        try {
          let t3;
          if (await this._removeSession(), "email" in e3) {
            const { email: s4, password: r4, options: i3 } = e3;
            t3 = await R(this.fetch, "POST", "".concat(this.url, "/token?grant_type=password"), { headers: this.headers, body: { email: s4, password: r4, gotrue_meta_security: { captcha_token: null == i3 ? void 0 : i3.captchaToken } }, xform: I });
          } else {
            if (!("phone" in e3)) throw new E("You must provide either an email or phone number and a password");
            {
              const { phone: s4, password: r4, options: i3 } = e3;
              t3 = await R(this.fetch, "POST", "".concat(this.url, "/token?grant_type=password"), { headers: this.headers, body: { phone: s4, password: r4, gotrue_meta_security: { captcha_token: null == i3 ? void 0 : i3.captchaToken } }, xform: I });
            }
          }
          const { data: s3, error: r3 } = t3;
          return r3 ? { data: { user: null, session: null }, error: r3 } : s3 && s3.session && s3.user ? (s3.session && (await this._saveSession(s3.session), await this._notifyAllSubscribers("SIGNED_IN", s3.session)), { data: { user: s3.user, session: s3.session }, error: r3 }) : { data: { user: null, session: null }, error: new T() };
        } catch (e4) {
          if (v(e4)) return { data: { user: null, session: null }, error: e4 };
          throw e4;
        }
      }
      async signInWithOAuth(e3) {
        var t3, s3, r3, i3;
        return await this._removeSession(), await this._handleProviderSignIn(e3.provider, { redirectTo: null === (t3 = e3.options) || void 0 === t3 ? void 0 : t3.redirectTo, scopes: null === (s3 = e3.options) || void 0 === s3 ? void 0 : s3.scopes, queryParams: null === (r3 = e3.options) || void 0 === r3 ? void 0 : r3.queryParams, skipBrowserRedirect: null === (i3 = e3.options) || void 0 === i3 ? void 0 : i3.skipBrowserRedirect });
      }
      async exchangeCodeForSession(e3) {
        return await this.initializePromise, this._acquireLock(-1, (async () => this._exchangeCodeForSession(e3)));
      }
      async _exchangeCodeForSession(e3) {
        const t3 = await l(this.storage, "".concat(this.storageKey, "-code-verifier")), { data: s3, error: r3 } = await R(this.fetch, "POST", "".concat(this.url, "/token?grant_type=pkce"), { headers: this.headers, body: { auth_code: e3, code_verifier: t3 }, xform: I });
        return await u(this.storage, "".concat(this.storageKey, "-code-verifier")), r3 ? { data: { user: null, session: null }, error: r3 } : s3 && s3.session && s3.user ? (s3.session && (await this._saveSession(s3.session), await this._notifyAllSubscribers("SIGNED_IN", s3.session)), { data: s3, error: r3 }) : { data: { user: null, session: null }, error: new T() };
      }
      async signInWithIdToken(e3) {
        await this._removeSession();
        try {
          const { options: t3, provider: s3, token: r3, access_token: i3, nonce: n2 } = e3, o2 = await R(this.fetch, "POST", "".concat(this.url, "/token?grant_type=id_token"), { headers: this.headers, body: { provider: s3, id_token: r3, access_token: i3, nonce: n2, gotrue_meta_security: { captcha_token: null == t3 ? void 0 : t3.captchaToken } }, xform: I }), { data: a2, error: c2 } = o2;
          return c2 ? { data: { user: null, session: null }, error: c2 } : a2 && a2.session && a2.user ? (a2.session && (await this._saveSession(a2.session), await this._notifyAllSubscribers("SIGNED_IN", a2.session)), { data: a2, error: c2 }) : { data: { user: null, session: null }, error: new T() };
        } catch (e4) {
          if (v(e4)) return { data: { user: null, session: null }, error: e4 };
          throw e4;
        }
      }
      async signInWithOtp(e3) {
        var t3, s3, r3, i3, n2;
        try {
          if (await this._removeSession(), "email" in e3) {
            const { email: r4, options: i4 } = e3;
            let n3 = null, o2 = null;
            if ("pkce" === this.flowType) {
              const e4 = g();
              await h(this.storage, "".concat(this.storageKey, "-code-verifier"), e4), n3 = await y(e4), o2 = e4 === n3 ? "plain" : "s256";
            }
            const { error: a2 } = await R(this.fetch, "POST", "".concat(this.url, "/otp"), { headers: this.headers, body: { email: r4, data: null !== (t3 = null == i4 ? void 0 : i4.data) && void 0 !== t3 ? t3 : {}, create_user: null === (s3 = null == i4 ? void 0 : i4.shouldCreateUser) || void 0 === s3 || s3, gotrue_meta_security: { captcha_token: null == i4 ? void 0 : i4.captchaToken }, code_challenge: n3, code_challenge_method: o2 }, redirectTo: null == i4 ? void 0 : i4.emailRedirectTo });
            return { data: { user: null, session: null }, error: a2 };
          }
          if ("phone" in e3) {
            const { phone: t4, options: s4 } = e3, { data: o2, error: a2 } = await R(this.fetch, "POST", "".concat(this.url, "/otp"), { headers: this.headers, body: { phone: t4, data: null !== (r3 = null == s4 ? void 0 : s4.data) && void 0 !== r3 ? r3 : {}, create_user: null === (i3 = null == s4 ? void 0 : s4.shouldCreateUser) || void 0 === i3 || i3, gotrue_meta_security: { captcha_token: null == s4 ? void 0 : s4.captchaToken }, channel: null !== (n2 = null == s4 ? void 0 : s4.channel) && void 0 !== n2 ? n2 : "sms" } });
            return { data: { user: null, session: null, messageId: null == o2 ? void 0 : o2.message_id }, error: a2 };
          }
          throw new E("You must provide either an email or phone number.");
        } catch (e4) {
          if (v(e4)) return { data: { user: null, session: null }, error: e4 };
          throw e4;
        }
      }
      async verifyOtp(e3) {
        var t3, s3;
        try {
          let r3, i3;
          "email_change" !== e3.type && "phone_change" !== e3.type && await this._removeSession(), "options" in e3 && (r3 = null === (t3 = e3.options) || void 0 === t3 ? void 0 : t3.redirectTo, i3 = null === (s3 = e3.options) || void 0 === s3 ? void 0 : s3.captchaToken);
          const { data: n2, error: o2 } = await R(this.fetch, "POST", "".concat(this.url, "/verify"), { headers: this.headers, body: Object.assign(Object.assign({}, e3), { gotrue_meta_security: { captcha_token: i3 } }), redirectTo: r3, xform: I });
          if (o2) throw o2;
          if (!n2) throw new Error("An error occurred on token verification.");
          const a2 = n2.session, c2 = n2.user;
          return (null == a2 ? void 0 : a2.access_token) && (await this._saveSession(a2), await this._notifyAllSubscribers("SIGNED_IN", a2)), { data: { user: c2, session: a2 }, error: null };
        } catch (e4) {
          if (v(e4)) return { data: { user: null, session: null }, error: e4 };
          throw e4;
        }
      }
      async signInWithSSO(e3) {
        var t3, s3, r3;
        try {
          return await this._removeSession(), await R(this.fetch, "POST", "".concat(this.url, "/sso"), { body: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, "providerId" in e3 ? { provider_id: e3.providerId } : null), "domain" in e3 ? { domain: e3.domain } : null), { redirect_to: null !== (s3 = null === (t3 = e3.options) || void 0 === t3 ? void 0 : t3.redirectTo) && void 0 !== s3 ? s3 : void 0 }), (null === (r3 = null == e3 ? void 0 : e3.options) || void 0 === r3 ? void 0 : r3.captchaToken) ? { gotrue_meta_security: { captcha_token: e3.options.captchaToken } } : null), { skip_http_redirect: true }), headers: this.headers, xform: U });
        } catch (e4) {
          if (v(e4)) return { data: null, error: e4 };
          throw e4;
        }
      }
      async reauthenticate() {
        return await this.initializePromise, await this._acquireLock(-1, (async () => await this._reauthenticate()));
      }
      async _reauthenticate() {
        try {
          return await this._useSession((async (e3) => {
            const { data: { session: t3 }, error: s3 } = e3;
            if (s3) throw s3;
            if (!t3) throw new S();
            const { error: r3 } = await R(this.fetch, "GET", "".concat(this.url, "/reauthenticate"), { headers: this.headers, jwt: t3.access_token });
            return { data: { user: null, session: null }, error: r3 };
          }));
        } catch (e3) {
          if (v(e3)) return { data: { user: null, session: null }, error: e3 };
          throw e3;
        }
      }
      async resend(e3) {
        try {
          "email_change" != e3.type && "phone_change" != e3.type && await this._removeSession();
          const t3 = "".concat(this.url, "/resend");
          if ("email" in e3) {
            const { email: s3, type: r3, options: i3 } = e3, { error: n2 } = await R(this.fetch, "POST", t3, { headers: this.headers, body: { email: s3, type: r3, gotrue_meta_security: { captcha_token: null == i3 ? void 0 : i3.captchaToken } }, redirectTo: null == i3 ? void 0 : i3.emailRedirectTo });
            return { data: { user: null, session: null }, error: n2 };
          }
          if ("phone" in e3) {
            const { phone: s3, type: r3, options: i3 } = e3, { data: n2, error: o2 } = await R(this.fetch, "POST", t3, { headers: this.headers, body: { phone: s3, type: r3, gotrue_meta_security: { captcha_token: null == i3 ? void 0 : i3.captchaToken } } });
            return { data: { user: null, session: null, messageId: null == n2 ? void 0 : n2.message_id }, error: o2 };
          }
          throw new E("You must provide either an email or phone number and a type");
        } catch (e4) {
          if (v(e4)) return { data: { user: null, session: null }, error: e4 };
          throw e4;
        }
      }
      async getSession() {
        return await this.initializePromise, this._acquireLock(-1, (async () => this._useSession((async (e3) => e3))));
      }
      async _acquireLock(e3, t3) {
        this._debug("#_acquireLock", "begin", e3);
        try {
          if (this.lockAcquired) {
            const e4 = this.pendingInLock.length ? this.pendingInLock[this.pendingInLock.length - 1] : Promise.resolve(), s3 = (async () => (await e4, await t3()))();
            return this.pendingInLock.push((async () => {
              try {
                await s3;
              } catch (e5) {
              }
            })()), s3;
          }
          return await this.lock("lock:".concat(this.storageKey), e3, (async () => {
            this._debug("#_acquireLock", "lock acquired for storage key", this.storageKey);
            try {
              this.lockAcquired = true;
              const e4 = t3();
              for (this.pendingInLock.push((async () => {
                try {
                  await e4;
                } catch (e5) {
                }
              })()), await e4; this.pendingInLock.length; ) {
                const e5 = [...this.pendingInLock];
                await Promise.all(e5), this.pendingInLock.splice(0, e5.length);
              }
              return await e4;
            } finally {
              this._debug("#_acquireLock", "lock released for storage key", this.storageKey), this.lockAcquired = false;
            }
          }));
        } finally {
          this._debug("#_acquireLock", "end");
        }
      }
      async _useSession(e3) {
        this._debug("#_useSession", "begin");
        try {
          const t3 = await this.__loadSession();
          return await e3(t3);
        } finally {
          this._debug("#_useSession", "end");
        }
      }
      async __loadSession() {
        this._debug("#__loadSession()", "begin"), this.lockAcquired || this._debug("#__loadSession()", "used outside of an acquired lock!", new Error().stack);
        try {
          let e3 = null;
          const t3 = await l(this.storage, this.storageKey);
          if (this._debug("#getSession()", "session from storage", t3), null !== t3 && (this._isValidSession(t3) ? e3 = t3 : (this._debug("#getSession()", "session from storage is not valid"), await this._removeSession())), !e3) return { data: { session: null }, error: null };
          const s3 = !!e3.expires_at && e3.expires_at <= Date.now() / 1e3;
          if (this._debug("#__loadSession()", "session has".concat(s3 ? "" : " not", " expired"), "expires_at", e3.expires_at), !s3) return { data: { session: e3 }, error: null };
          const { session: r3, error: i3 } = await this._callRefreshToken(e3.refresh_token);
          return i3 ? { data: { session: null }, error: i3 } : { data: { session: r3 }, error: null };
        } finally {
          this._debug("#__loadSession()", "end");
        }
      }
      async getUser(e3) {
        return e3 ? await this._getUser(e3) : (await this.initializePromise, this._acquireLock(-1, (async () => await this._getUser())));
      }
      async _getUser(e3) {
        try {
          return e3 ? await R(this.fetch, "GET", "".concat(this.url, "/user"), { headers: this.headers, jwt: e3, xform: L }) : await this._useSession((async (e4) => {
            var t3, s3;
            const { data: r3, error: i3 } = e4;
            if (i3) throw i3;
            return await R(this.fetch, "GET", "".concat(this.url, "/user"), { headers: this.headers, jwt: null !== (s3 = null === (t3 = r3.session) || void 0 === t3 ? void 0 : t3.access_token) && void 0 !== s3 ? s3 : void 0, xform: L });
          }));
        } catch (e4) {
          if (v(e4)) return { data: { user: null }, error: e4 };
          throw e4;
        }
      }
      async updateUser(e3, t3 = {}) {
        return await this.initializePromise, await this._acquireLock(-1, (async () => await this._updateUser(e3, t3)));
      }
      async _updateUser(e3, t3 = {}) {
        try {
          return await this._useSession((async (s3) => {
            const { data: r3, error: i3 } = s3;
            if (i3) throw i3;
            if (!r3.session) throw new S();
            const n2 = r3.session;
            let o2 = null, a2 = null;
            if ("pkce" === this.flowType && null != e3.email) {
              const e4 = g();
              await h(this.storage, "".concat(this.storageKey, "-code-verifier"), e4), o2 = await y(e4), a2 = e4 === o2 ? "plain" : "s256";
            }
            const { data: c2, error: l2 } = await R(this.fetch, "PUT", "".concat(this.url, "/user"), { headers: this.headers, redirectTo: null == t3 ? void 0 : t3.emailRedirectTo, body: Object.assign(Object.assign({}, e3), { code_challenge: o2, code_challenge_method: a2 }), jwt: n2.access_token, xform: L });
            if (l2) throw l2;
            return n2.user = c2.user, await this._saveSession(n2), await this._notifyAllSubscribers("USER_UPDATED", n2), { data: { user: n2.user }, error: null };
          }));
        } catch (e4) {
          if (v(e4)) return { data: { user: null }, error: e4 };
          throw e4;
        }
      }
      _decodeJWT(e3) {
        return f(e3);
      }
      async setSession(e3) {
        return await this.initializePromise, await this._acquireLock(-1, (async () => await this._setSession(e3)));
      }
      async _setSession(e3) {
        try {
          if (!e3.access_token || !e3.refresh_token) throw new S();
          const t3 = Date.now() / 1e3;
          let s3 = t3, r3 = true, i3 = null;
          const n2 = f(e3.access_token);
          if (n2.exp && (s3 = n2.exp, r3 = s3 <= t3), r3) {
            const { session: t4, error: s4 } = await this._callRefreshToken(e3.refresh_token);
            if (s4) return { data: { user: null, session: null }, error: s4 };
            if (!t4) return { data: { user: null, session: null }, error: null };
            i3 = t4;
          } else {
            const { data: r4, error: n3 } = await this._getUser(e3.access_token);
            if (n3) throw n3;
            i3 = { access_token: e3.access_token, refresh_token: e3.refresh_token, user: r4.user, token_type: "bearer", expires_in: s3 - t3, expires_at: s3 }, await this._saveSession(i3), await this._notifyAllSubscribers("SIGNED_IN", i3);
          }
          return { data: { user: i3.user, session: i3 }, error: null };
        } catch (e4) {
          if (v(e4)) return { data: { session: null, user: null }, error: e4 };
          throw e4;
        }
      }
      async refreshSession(e3) {
        return await this.initializePromise, await this._acquireLock(-1, (async () => await this._refreshSession(e3)));
      }
      async _refreshSession(e3) {
        try {
          return await this._useSession((async (t3) => {
            var s3;
            if (!e3) {
              const { data: r4, error: i4 } = t3;
              if (i4) throw i4;
              e3 = null !== (s3 = r4.session) && void 0 !== s3 ? s3 : void 0;
            }
            if (!(null == e3 ? void 0 : e3.refresh_token)) throw new S();
            const { session: r3, error: i3 } = await this._callRefreshToken(e3.refresh_token);
            return i3 ? { data: { user: null, session: null }, error: i3 } : r3 ? { data: { user: r3.user, session: r3 }, error: null } : { data: { user: null, session: null }, error: null };
          }));
        } catch (e4) {
          if (v(e4)) return { data: { user: null, session: null }, error: e4 };
          throw e4;
        }
      }
      async _getSessionFromURL(e3) {
        try {
          if (!r2()) throw new j("No browser detected.");
          if ("implicit" === this.flowType && !this._isImplicitGrantFlow()) throw new j("Not a valid implicit grant flow url.");
          if ("pkce" == this.flowType && !e3) throw new O("Not a valid PKCE flow url.");
          const t3 = o(window.location.href);
          if (e3) {
            if (!t3.code) throw new O("No code detected.");
            const { data: e4, error: s4 } = await this._exchangeCodeForSession(t3.code);
            if (s4) throw s4;
            const r3 = new URL(window.location.href);
            return r3.searchParams.delete("code"), window.history.replaceState(window.history.state, "", r3.toString()), { data: { session: e4.session, redirectType: null }, error: null };
          }
          if (t3.error || t3.error_description || t3.error_code) throw new j(t3.error_description || "Error in URL with unspecified error_description", { error: t3.error || "unspecified_error", code: t3.error_code || "unspecified_code" });
          const { provider_token: s3, provider_refresh_token: i3, access_token: n2, refresh_token: a2, expires_in: c2, expires_at: h2, token_type: l2 } = t3;
          if (!(n2 && c2 && a2 && l2)) throw new j("No session defined in URL");
          const u2 = Math.round(Date.now() / 1e3), d2 = parseInt(c2);
          let f2 = u2 + d2;
          h2 && (f2 = parseInt(h2));
          const p2 = f2 - u2;
          1e3 * p2 <= W && console.warn("@supabase/gotrue-js: Session as retrieved from URL expires in ".concat(p2, "s, should have been closer to ").concat(d2, "s"));
          const g2 = f2 - d2;
          u2 - g2 >= 120 ? console.warn("@supabase/gotrue-js: Session as retrieved from URL was issued over 120s ago, URL could be stale", g2, f2, u2) : u2 - g2 < 0 && console.warn("@supabase/gotrue-js: Session as retrieved from URL was issued in the future? Check the device clok for skew", g2, f2, u2);
          const { data: y2, error: m2 } = await this._getUser(n2);
          if (m2) throw m2;
          const v2 = { provider_token: s3, provider_refresh_token: i3, access_token: n2, expires_in: d2, expires_at: f2, refresh_token: a2, token_type: l2, user: y2.user };
          return window.location.hash = "", this._debug("#_getSessionFromURL()", "clearing window.location.hash"), { data: { session: v2, redirectType: t3.type }, error: null };
        } catch (e4) {
          if (v(e4)) return { data: { session: null, redirectType: null }, error: e4 };
          throw e4;
        }
      }
      _isImplicitGrantFlow() {
        const e3 = o(window.location.href);
        return !(!r2() || !e3.access_token && !e3.error_description);
      }
      async _isPKCEFlow() {
        const e3 = o(window.location.href), t3 = await l(this.storage, "".concat(this.storageKey, "-code-verifier"));
        return !(!e3.code || !t3);
      }
      async signOut(e3 = { scope: "global" }) {
        return await this.initializePromise, await this._acquireLock(-1, (async () => await this._signOut(e3)));
      }
      async _signOut({ scope: e3 } = { scope: "global" }) {
        return await this._useSession((async (t3) => {
          var s3;
          const { data: r3, error: i3 } = t3;
          if (i3) return { error: i3 };
          const n2 = null === (s3 = r3.session) || void 0 === s3 ? void 0 : s3.access_token;
          if (n2) {
            const { error: t4 } = await this.admin.signOut(n2, e3);
            if (t4 && (!b(t4) || 404 !== t4.status && 401 !== t4.status)) return { error: t4 };
          }
          return "others" !== e3 && (await this._removeSession(), await u(this.storage, "".concat(this.storageKey, "-code-verifier")), await this._notifyAllSubscribers("SIGNED_OUT", null)), { error: null };
        }));
      }
      onAuthStateChange(e3) {
        const t3 = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (function(e4) {
          const t4 = 16 * Math.random() | 0;
          return ("x" == e4 ? t4 : 3 & t4 | 8).toString(16);
        })), s3 = { id: t3, callback: e3, unsubscribe: () => {
          this._debug("#unsubscribe()", "state change callback with id removed", t3), this.stateChangeEmitters.delete(t3);
        } };
        return this._debug("#onAuthStateChange()", "registered callback with id", t3), this.stateChangeEmitters.set(t3, s3), (async () => {
          await this.initializePromise, await this._acquireLock(-1, (async () => {
            this._emitInitialSession(t3);
          }));
        })(), { data: { subscription: s3 } };
      }
      async _emitInitialSession(e3) {
        return await this._useSession((async (t3) => {
          var s3, r3;
          try {
            const { data: { session: r4 }, error: i3 } = t3;
            if (i3) throw i3;
            await (null === (s3 = this.stateChangeEmitters.get(e3)) || void 0 === s3 ? void 0 : s3.callback("INITIAL_SESSION", r4)), this._debug("INITIAL_SESSION", "callback id", e3, "session", r4);
          } catch (t4) {
            await (null === (r3 = this.stateChangeEmitters.get(e3)) || void 0 === r3 ? void 0 : r3.callback("INITIAL_SESSION", null)), this._debug("INITIAL_SESSION", "callback id", e3, "error", t4), console.error(t4);
          }
        }));
      }
      async resetPasswordForEmail(e3, t3 = {}) {
        let s3 = null, r3 = null;
        if ("pkce" === this.flowType) {
          const e4 = g();
          await h(this.storage, "".concat(this.storageKey, "-code-verifier"), e4), s3 = await y(e4), r3 = e4 === s3 ? "plain" : "s256";
        }
        try {
          return await R(this.fetch, "POST", "".concat(this.url, "/recover"), { body: { email: e3, code_challenge: s3, code_challenge_method: r3, gotrue_meta_security: { captcha_token: t3.captchaToken } }, headers: this.headers, redirectTo: t3.redirectTo });
        } catch (e4) {
          if (v(e4)) return { data: null, error: e4 };
          throw e4;
        }
      }
      async _refreshAccessToken(e3) {
        const t3 = "#_refreshAccessToken(".concat(e3.substring(0, 5), "...)");
        this._debug(t3, "begin");
        try {
          const i3 = Date.now();
          return await (s3 = async (s4) => (await (async function(e4) {
            return await new Promise(((t4) => {
              setTimeout((() => t4(null)), e4);
            }));
          })(200 * s4), this._debug(t3, "refreshing attempt", s4), await R(this.fetch, "POST", "".concat(this.url, "/token?grant_type=refresh_token"), { body: { refresh_token: e3 }, headers: this.headers, xform: I })), r3 = (e4, t4, s4) => s4 && s4.error && $(s4.error) && Date.now() + 200 * (e4 + 1) - i3 < W, new Promise(((e4, t4) => {
            (async () => {
              for (let i4 = 0; i4 < 1 / 0; i4++) try {
                const t5 = await s3(i4);
                if (!r3(i4, 0, t5)) return void e4(t5);
              } catch (e5) {
                if (!r3(i4)) return void t4(e5);
              }
            })();
          })));
        } catch (e4) {
          if (this._debug(t3, "error", e4), v(e4)) return { data: { session: null, user: null }, error: e4 };
          throw e4;
        } finally {
          this._debug(t3, "end");
        }
        var s3, r3;
      }
      _isValidSession(e3) {
        return "object" == typeof e3 && null !== e3 && "access_token" in e3 && "refresh_token" in e3 && "expires_at" in e3;
      }
      async _handleProviderSignIn(e3, t3) {
        const s3 = await this._getUrlForProvider(e3, { redirectTo: t3.redirectTo, scopes: t3.scopes, queryParams: t3.queryParams });
        return this._debug("#_handleProviderSignIn()", "provider", e3, "options", t3, "url", s3), r2() && !t3.skipBrowserRedirect && window.location.assign(s3), { data: { provider: e3, url: s3 }, error: null };
      }
      async _recoverAndRefresh() {
        var e3;
        const t3 = "#_recoverAndRefresh()";
        this._debug(t3, "begin");
        try {
          const s3 = await l(this.storage, this.storageKey);
          if (this._debug(t3, "session from storage", s3), !this._isValidSession(s3)) return this._debug(t3, "session is not valid"), void (null !== s3 && await this._removeSession());
          const r3 = Math.round(Date.now() / 1e3), i3 = (null !== (e3 = s3.expires_at) && void 0 !== e3 ? e3 : 1 / 0) < r3 + 10;
          if (this._debug(t3, "session has".concat(i3 ? "" : " not", " expired with margin of 10s")), i3) {
            if (this.autoRefreshToken && s3.refresh_token) {
              const { error: e4 } = await this._callRefreshToken(s3.refresh_token);
              e4 && (console.error(e4), $(e4) || (this._debug(t3, "refresh failed with a non-retryable error, removing the session", e4), await this._removeSession()));
            }
          } else await this._notifyAllSubscribers("SIGNED_IN", s3);
        } catch (e4) {
          return this._debug(t3, "error", e4), void console.error(e4);
        } finally {
          this._debug(t3, "end");
        }
      }
      async _callRefreshToken(e3) {
        var t3, s3;
        if (!e3) throw new S();
        if (this.refreshingDeferred) return this.refreshingDeferred.promise;
        const r3 = "#_callRefreshToken(".concat(e3.substring(0, 5), "...)");
        this._debug(r3, "begin");
        try {
          this.refreshingDeferred = new d();
          const { data: t4, error: s4 } = await this._refreshAccessToken(e3);
          if (s4) throw s4;
          if (!t4.session) throw new S();
          await this._saveSession(t4.session), await this._notifyAllSubscribers("TOKEN_REFRESHED", t4.session);
          const r4 = { session: t4.session, error: null };
          return this.refreshingDeferred.resolve(r4), r4;
        } catch (e4) {
          if (this._debug(r3, "error", e4), v(e4)) {
            const s4 = { session: null, error: e4 };
            return null === (t3 = this.refreshingDeferred) || void 0 === t3 || t3.resolve(s4), s4;
          }
          throw null === (s3 = this.refreshingDeferred) || void 0 === s3 || s3.reject(e4), e4;
        } finally {
          this.refreshingDeferred = null, this._debug(r3, "end");
        }
      }
      async _notifyAllSubscribers(e3, t3, s3 = true) {
        const r3 = "#_notifyAllSubscribers(".concat(e3, ")");
        this._debug(r3, "begin", t3, "broadcast = ".concat(s3));
        try {
          this.broadcastChannel && s3 && this.broadcastChannel.postMessage({ event: e3, session: t3 });
          const r4 = [], i3 = Array.from(this.stateChangeEmitters.values()).map((async (s4) => {
            try {
              await s4.callback(e3, t3);
            } catch (e4) {
              r4.push(e4);
            }
          }));
          if (await Promise.all(i3), r4.length > 0) {
            for (let e4 = 0; e4 < r4.length; e4 += 1) console.error(r4[e4]);
            throw r4[0];
          }
        } finally {
          this._debug(r3, "end");
        }
      }
      async _saveSession(e3) {
        this._debug("#_saveSession()", e3), await this._persistSession(e3);
      }
      _persistSession(e3) {
        return this._debug("#_persistSession()", e3), h(this.storage, this.storageKey, e3);
      }
      async _removeSession() {
        this._debug("#_removeSession()"), await u(this.storage, this.storageKey);
      }
      _removeVisibilityChangedCallback() {
        this._debug("#_removeVisibilityChangedCallback()");
        const e3 = this.visibilityChangedCallback;
        this.visibilityChangedCallback = null;
        try {
          e3 && r2() && (null === window || void 0 === window ? void 0 : window.removeEventListener) && window.removeEventListener("visibilitychange", e3);
        } catch (e4) {
          console.error("removing visibilitychange callback failed", e4);
        }
      }
      async _startAutoRefresh() {
        await this._stopAutoRefresh(), this._debug("#_startAutoRefresh()");
        const e3 = setInterval((() => this._autoRefreshTokenTick()), W);
        this.autoRefreshTicker = e3, e3 && "object" == typeof e3 && "function" == typeof e3.unref ? e3.unref() : "undefined" != typeof Deno && "function" == typeof Deno.unrefTimer && Deno.unrefTimer(e3), setTimeout((async () => {
          await this.initializePromise, await this._autoRefreshTokenTick();
        }), 0);
      }
      async _stopAutoRefresh() {
        this._debug("#_stopAutoRefresh()");
        const e3 = this.autoRefreshTicker;
        this.autoRefreshTicker = null, e3 && clearInterval(e3);
      }
      async startAutoRefresh() {
        this._removeVisibilityChangedCallback(), await this._startAutoRefresh();
      }
      async stopAutoRefresh() {
        this._removeVisibilityChangedCallback(), await this._stopAutoRefresh();
      }
      async _autoRefreshTokenTick() {
        this._debug("#_autoRefreshTokenTick()", "begin");
        try {
          await this._acquireLock(0, (async () => {
            try {
              const e3 = Date.now();
              try {
                return await this._useSession((async (t3) => {
                  const { data: { session: s3 } } = t3;
                  if (!s3 || !s3.refresh_token || !s3.expires_at) return void this._debug("#_autoRefreshTokenTick()", "no session");
                  const r3 = Math.floor((1e3 * s3.expires_at - e3) / W);
                  this._debug("#_autoRefreshTokenTick()", "access token expires in ".concat(r3, " ticks, a tick lasts 30000ms, refresh threshold is 3 ticks")), r3 <= 3 && await this._callRefreshToken(s3.refresh_token);
                }));
              } catch (e4) {
                console.error("Auto refresh tick failed with error. This is likely a transient error.", e4);
              }
            } finally {
              this._debug("#_autoRefreshTokenTick()", "end");
            }
          }));
        } catch (e3) {
          if (!(e3.isAcquireTimeout || e3 instanceof G)) throw e3;
          this._debug("auto refresh token tick lock not available");
        }
      }
      async _handleVisibilityChange() {
        if (this._debug("#_handleVisibilityChange()"), !r2() || !(null === window || void 0 === window ? void 0 : window.addEventListener)) return this.autoRefreshToken && this.startAutoRefresh(), false;
        try {
          this.visibilityChangedCallback = async () => await this._onVisibilityChanged(false), null === window || void 0 === window || window.addEventListener("visibilitychange", this.visibilityChangedCallback), await this._onVisibilityChanged(true);
        } catch (e3) {
          console.error("_handleVisibilityChange", e3);
        }
      }
      async _onVisibilityChanged(e3) {
        const t3 = "#_onVisibilityChanged(".concat(e3, ")");
        this._debug(t3, "visibilityState", document.visibilityState), "visible" === document.visibilityState ? (this.autoRefreshToken && this._startAutoRefresh(), e3 || (await this.initializePromise, await this._acquireLock(-1, (async () => {
          "visible" === document.visibilityState ? await this._recoverAndRefresh() : this._debug(t3, "acquired the lock to recover the session, but the browser visibilityState is no longer visible, aborting");
        })))) : "hidden" === document.visibilityState && this.autoRefreshToken && this._stopAutoRefresh();
      }
      async _getUrlForProvider(e3, t3) {
        const s3 = ["provider=".concat(encodeURIComponent(e3))];
        if ((null == t3 ? void 0 : t3.redirectTo) && s3.push("redirect_to=".concat(encodeURIComponent(t3.redirectTo))), (null == t3 ? void 0 : t3.scopes) && s3.push("scopes=".concat(encodeURIComponent(t3.scopes))), "pkce" === this.flowType) {
          const e4 = g();
          await h(this.storage, "".concat(this.storageKey, "-code-verifier"), e4);
          const t4 = await y(e4), r3 = e4 === t4 ? "plain" : "s256";
          this._debug("PKCE", "code verifier", "".concat(e4.substring(0, 5), "..."), "code challenge", t4, "method", r3);
          const i3 = new URLSearchParams({ code_challenge: "".concat(encodeURIComponent(t4)), code_challenge_method: "".concat(encodeURIComponent(r3)) });
          s3.push(i3.toString());
        }
        if (null == t3 ? void 0 : t3.queryParams) {
          const e4 = new URLSearchParams(t3.queryParams);
          s3.push(e4.toString());
        }
        return "".concat(this.url, "/authorize?").concat(s3.join("&"));
      }
      async _unenroll(e3) {
        try {
          return await this._useSession((async (t3) => {
            var s3;
            const { data: r3, error: i3 } = t3;
            return i3 ? { data: null, error: i3 } : await R(this.fetch, "DELETE", "".concat(this.url, "/factors/").concat(e3.factorId), { headers: this.headers, jwt: null === (s3 = null == r3 ? void 0 : r3.session) || void 0 === s3 ? void 0 : s3.access_token });
          }));
        } catch (e4) {
          if (v(e4)) return { data: null, error: e4 };
          throw e4;
        }
      }
      async _enroll(e3) {
        try {
          return await this._useSession((async (t3) => {
            var s3, r3;
            const { data: i3, error: n2 } = t3;
            if (n2) return { data: null, error: n2 };
            const { data: o2, error: a2 } = await R(this.fetch, "POST", "".concat(this.url, "/factors"), { body: { friendly_name: e3.friendlyName, factor_type: e3.factorType, issuer: e3.issuer }, headers: this.headers, jwt: null === (s3 = null == i3 ? void 0 : i3.session) || void 0 === s3 ? void 0 : s3.access_token });
            return a2 ? { data: null, error: a2 } : ((null === (r3 = null == o2 ? void 0 : o2.totp) || void 0 === r3 ? void 0 : r3.qr_code) && (o2.totp.qr_code = "data:image/svg+xml;utf-8,".concat(o2.totp.qr_code)), { data: o2, error: null });
          }));
        } catch (e4) {
          if (v(e4)) return { data: null, error: e4 };
          throw e4;
        }
      }
      async _verify(e3) {
        return this._acquireLock(-1, (async () => {
          try {
            return await this._useSession((async (t3) => {
              var s3;
              const { data: r3, error: i3 } = t3;
              if (i3) return { data: null, error: i3 };
              const { data: n2, error: o2 } = await R(this.fetch, "POST", "".concat(this.url, "/factors/").concat(e3.factorId, "/verify"), { body: { code: e3.code, challenge_id: e3.challengeId }, headers: this.headers, jwt: null === (s3 = null == r3 ? void 0 : r3.session) || void 0 === s3 ? void 0 : s3.access_token });
              return o2 ? { data: null, error: o2 } : (await this._saveSession(Object.assign({ expires_at: Math.round(Date.now() / 1e3) + n2.expires_in }, n2)), await this._notifyAllSubscribers("MFA_CHALLENGE_VERIFIED", n2), { data: n2, error: o2 });
            }));
          } catch (e4) {
            if (v(e4)) return { data: null, error: e4 };
            throw e4;
          }
        }));
      }
      async _challenge(e3) {
        return this._acquireLock(-1, (async () => {
          try {
            return await this._useSession((async (t3) => {
              var s3;
              const { data: r3, error: i3 } = t3;
              return i3 ? { data: null, error: i3 } : await R(this.fetch, "POST", "".concat(this.url, "/factors/").concat(e3.factorId, "/challenge"), { headers: this.headers, jwt: null === (s3 = null == r3 ? void 0 : r3.session) || void 0 === s3 ? void 0 : s3.access_token });
            }));
          } catch (e4) {
            if (v(e4)) return { data: null, error: e4 };
            throw e4;
          }
        }));
      }
      async _challengeAndVerify(e3) {
        const { data: t3, error: s3 } = await this._challenge({ factorId: e3.factorId });
        return s3 ? { data: null, error: s3 } : await this._verify({ factorId: e3.factorId, challengeId: t3.id, code: e3.code });
      }
      async _listFactors() {
        const { data: { user: e3 }, error: t3 } = await this.getUser();
        if (t3) return { data: null, error: t3 };
        const s3 = (null == e3 ? void 0 : e3.factors) || [], r3 = s3.filter(((e4) => "totp" === e4.factor_type && "verified" === e4.status));
        return { data: { all: s3, totp: r3 }, error: null };
      }
      async _getAuthenticatorAssuranceLevel() {
        return this._acquireLock(-1, (async () => await this._useSession((async (e3) => {
          var t3, s3;
          const { data: { session: r3 }, error: i3 } = e3;
          if (i3) return { data: null, error: i3 };
          if (!r3) return { data: { currentLevel: null, nextLevel: null, currentAuthenticationMethods: [] }, error: null };
          const n2 = this._decodeJWT(r3.access_token);
          let o2 = null;
          n2.aal && (o2 = n2.aal);
          let a2 = o2;
          return (null !== (s3 = null === (t3 = r3.user.factors) || void 0 === t3 ? void 0 : t3.filter(((e4) => "verified" === e4.status))) && void 0 !== s3 ? s3 : []).length > 0 && (a2 = "aal2"), { data: { currentLevel: o2, nextLevel: a2, currentAuthenticationMethods: n2.amr || [] }, error: null };
        }))));
      }
    }
    X.nextInstanceID = 0;
  }, 743: (e2, t2, s2) => {
    "use strict";
    var r2 = (function() {
      if ("undefined" != typeof self) return self;
      if ("undefined" != typeof window) return window;
      if (void 0 !== s2.g) return s2.g;
      throw new Error("unable to locate global object");
    })();
    e2.exports = t2 = r2.fetch, r2.fetch && (t2.default = r2.fetch.bind(r2)), t2.Headers = r2.Headers, t2.Request = r2.Request, t2.Response = r2.Response;
  }, 189: (e2, t2, s2) => {
    "use strict";
    s2.r(t2), s2.d(t2, { PostgrestBuilder: () => n, PostgrestClient: () => l, PostgrestFilterBuilder: () => a, PostgrestQueryBuilder: () => c, PostgrestTransformBuilder: () => o });
    var r2 = s2(743), i2 = s2.n(r2);
    class n {
      constructor(e3) {
        this.shouldThrowOnError = false, this.method = e3.method, this.url = e3.url, this.headers = e3.headers, this.schema = e3.schema, this.body = e3.body, this.shouldThrowOnError = e3.shouldThrowOnError, this.signal = e3.signal, this.isMaybeSingle = e3.isMaybeSingle, e3.fetch ? this.fetch = e3.fetch : "undefined" == typeof fetch ? this.fetch = i2() : this.fetch = fetch;
      }
      throwOnError() {
        return this.shouldThrowOnError = true, this;
      }
      then(e3, t3) {
        void 0 === this.schema || (["GET", "HEAD"].includes(this.method) ? this.headers["Accept-Profile"] = this.schema : this.headers["Content-Profile"] = this.schema), "GET" !== this.method && "HEAD" !== this.method && (this.headers["Content-Type"] = "application/json");
        let s3 = (0, this.fetch)(this.url.toString(), { method: this.method, headers: this.headers, body: JSON.stringify(this.body), signal: this.signal }).then((async (e4) => {
          var t4, s4, r3;
          let i3 = null, n2 = null, o2 = null, a2 = e4.status, c2 = e4.statusText;
          if (e4.ok) {
            if ("HEAD" !== this.method) {
              const t5 = await e4.text();
              "" === t5 || (n2 = "text/csv" === this.headers.Accept || this.headers.Accept && this.headers.Accept.includes("application/vnd.pgrst.plan+text") ? t5 : JSON.parse(t5));
            }
            const r4 = null === (t4 = this.headers.Prefer) || void 0 === t4 ? void 0 : t4.match(/count=(exact|planned|estimated)/), h2 = null === (s4 = e4.headers.get("content-range")) || void 0 === s4 ? void 0 : s4.split("/");
            r4 && h2 && h2.length > 1 && (o2 = parseInt(h2[1])), this.isMaybeSingle && "GET" === this.method && Array.isArray(n2) && (n2.length > 1 ? (i3 = { code: "PGRST116", details: "Results contain ".concat(n2.length, " rows, application/vnd.pgrst.object+json requires 1 row"), hint: null, message: "JSON object requested, multiple (or no) rows returned" }, n2 = null, o2 = null, a2 = 406, c2 = "Not Acceptable") : n2 = 1 === n2.length ? n2[0] : null);
          } else {
            const t5 = await e4.text();
            try {
              i3 = JSON.parse(t5), Array.isArray(i3) && 404 === e4.status && (n2 = [], i3 = null, a2 = 200, c2 = "OK");
            } catch (s5) {
              404 === e4.status && "" === t5 ? (a2 = 204, c2 = "No Content") : i3 = { message: t5 };
            }
            if (i3 && this.isMaybeSingle && (null === (r3 = null == i3 ? void 0 : i3.details) || void 0 === r3 ? void 0 : r3.includes("0 rows")) && (i3 = null, a2 = 200, c2 = "OK"), i3 && this.shouldThrowOnError) throw i3;
          }
          return { error: i3, data: n2, count: o2, status: a2, statusText: c2 };
        }));
        return this.shouldThrowOnError || (s3 = s3.catch(((e4) => {
          var t4, s4, r3;
          return { error: { message: "".concat(null !== (t4 = null == e4 ? void 0 : e4.name) && void 0 !== t4 ? t4 : "FetchError", ": ").concat(null == e4 ? void 0 : e4.message), details: "".concat(null !== (s4 = null == e4 ? void 0 : e4.stack) && void 0 !== s4 ? s4 : ""), hint: "", code: "".concat(null !== (r3 = null == e4 ? void 0 : e4.code) && void 0 !== r3 ? r3 : "") }, data: null, count: null, status: 0, statusText: "" };
        }))), s3.then(e3, t3);
      }
    }
    class o extends n {
      select(e3) {
        let t3 = false;
        const s3 = (null != e3 ? e3 : "*").split("").map(((e4) => /\s/.test(e4) && !t3 ? "" : ('"' === e4 && (t3 = !t3), e4))).join("");
        return this.url.searchParams.set("select", s3), this.headers.Prefer && (this.headers.Prefer += ","), this.headers.Prefer += "return=representation", this;
      }
      order(e3, { ascending: t3 = true, nullsFirst: s3, foreignTable: r3, referencedTable: i3 = r3 } = {}) {
        const n2 = i3 ? "".concat(i3, ".order") : "order", o2 = this.url.searchParams.get(n2);
        return this.url.searchParams.set(n2, "".concat(o2 ? "".concat(o2, ",") : "").concat(e3, ".").concat(t3 ? "asc" : "desc").concat(void 0 === s3 ? "" : s3 ? ".nullsfirst" : ".nullslast")), this;
      }
      limit(e3, { foreignTable: t3, referencedTable: s3 = t3 } = {}) {
        const r3 = void 0 === s3 ? "limit" : "".concat(s3, ".limit");
        return this.url.searchParams.set(r3, "".concat(e3)), this;
      }
      range(e3, t3, { foreignTable: s3, referencedTable: r3 = s3 } = {}) {
        const i3 = void 0 === r3 ? "offset" : "".concat(r3, ".offset"), n2 = void 0 === r3 ? "limit" : "".concat(r3, ".limit");
        return this.url.searchParams.set(i3, "".concat(e3)), this.url.searchParams.set(n2, "" + (t3 - e3 + 1)), this;
      }
      abortSignal(e3) {
        return this.signal = e3, this;
      }
      single() {
        return this.headers.Accept = "application/vnd.pgrst.object+json", this;
      }
      maybeSingle() {
        return "GET" === this.method ? this.headers.Accept = "application/json" : this.headers.Accept = "application/vnd.pgrst.object+json", this.isMaybeSingle = true, this;
      }
      csv() {
        return this.headers.Accept = "text/csv", this;
      }
      geojson() {
        return this.headers.Accept = "application/geo+json", this;
      }
      explain({ analyze: e3 = false, verbose: t3 = false, settings: s3 = false, buffers: r3 = false, wal: i3 = false, format: n2 = "text" } = {}) {
        var o2;
        const a2 = [e3 ? "analyze" : null, t3 ? "verbose" : null, s3 ? "settings" : null, r3 ? "buffers" : null, i3 ? "wal" : null].filter(Boolean).join("|"), c2 = null !== (o2 = this.headers.Accept) && void 0 !== o2 ? o2 : "application/json";
        return this.headers.Accept = "application/vnd.pgrst.plan+".concat(n2, '; for="').concat(c2, '"; options=').concat(a2, ";"), this;
      }
      rollback() {
        var e3;
        return (null !== (e3 = this.headers.Prefer) && void 0 !== e3 ? e3 : "").trim().length > 0 ? this.headers.Prefer += ",tx=rollback" : this.headers.Prefer = "tx=rollback", this;
      }
      returns() {
        return this;
      }
    }
    class a extends o {
      eq(e3, t3) {
        return this.url.searchParams.append(e3, "eq.".concat(t3)), this;
      }
      neq(e3, t3) {
        return this.url.searchParams.append(e3, "neq.".concat(t3)), this;
      }
      gt(e3, t3) {
        return this.url.searchParams.append(e3, "gt.".concat(t3)), this;
      }
      gte(e3, t3) {
        return this.url.searchParams.append(e3, "gte.".concat(t3)), this;
      }
      lt(e3, t3) {
        return this.url.searchParams.append(e3, "lt.".concat(t3)), this;
      }
      lte(e3, t3) {
        return this.url.searchParams.append(e3, "lte.".concat(t3)), this;
      }
      like(e3, t3) {
        return this.url.searchParams.append(e3, "like.".concat(t3)), this;
      }
      likeAllOf(e3, t3) {
        return this.url.searchParams.append(e3, "like(all).{".concat(t3.join(","), "}")), this;
      }
      likeAnyOf(e3, t3) {
        return this.url.searchParams.append(e3, "like(any).{".concat(t3.join(","), "}")), this;
      }
      ilike(e3, t3) {
        return this.url.searchParams.append(e3, "ilike.".concat(t3)), this;
      }
      ilikeAllOf(e3, t3) {
        return this.url.searchParams.append(e3, "ilike(all).{".concat(t3.join(","), "}")), this;
      }
      ilikeAnyOf(e3, t3) {
        return this.url.searchParams.append(e3, "ilike(any).{".concat(t3.join(","), "}")), this;
      }
      is(e3, t3) {
        return this.url.searchParams.append(e3, "is.".concat(t3)), this;
      }
      in(e3, t3) {
        const s3 = t3.map(((e4) => "string" == typeof e4 && new RegExp("[,()]").test(e4) ? '"'.concat(e4, '"') : "".concat(e4))).join(",");
        return this.url.searchParams.append(e3, "in.(".concat(s3, ")")), this;
      }
      contains(e3, t3) {
        return "string" == typeof t3 ? this.url.searchParams.append(e3, "cs.".concat(t3)) : Array.isArray(t3) ? this.url.searchParams.append(e3, "cs.{".concat(t3.join(","), "}")) : this.url.searchParams.append(e3, "cs.".concat(JSON.stringify(t3))), this;
      }
      containedBy(e3, t3) {
        return "string" == typeof t3 ? this.url.searchParams.append(e3, "cd.".concat(t3)) : Array.isArray(t3) ? this.url.searchParams.append(e3, "cd.{".concat(t3.join(","), "}")) : this.url.searchParams.append(e3, "cd.".concat(JSON.stringify(t3))), this;
      }
      rangeGt(e3, t3) {
        return this.url.searchParams.append(e3, "sr.".concat(t3)), this;
      }
      rangeGte(e3, t3) {
        return this.url.searchParams.append(e3, "nxl.".concat(t3)), this;
      }
      rangeLt(e3, t3) {
        return this.url.searchParams.append(e3, "sl.".concat(t3)), this;
      }
      rangeLte(e3, t3) {
        return this.url.searchParams.append(e3, "nxr.".concat(t3)), this;
      }
      rangeAdjacent(e3, t3) {
        return this.url.searchParams.append(e3, "adj.".concat(t3)), this;
      }
      overlaps(e3, t3) {
        return "string" == typeof t3 ? this.url.searchParams.append(e3, "ov.".concat(t3)) : this.url.searchParams.append(e3, "ov.{".concat(t3.join(","), "}")), this;
      }
      textSearch(e3, t3, { config: s3, type: r3 } = {}) {
        let i3 = "";
        "plain" === r3 ? i3 = "pl" : "phrase" === r3 ? i3 = "ph" : "websearch" === r3 && (i3 = "w");
        const n2 = void 0 === s3 ? "" : "(".concat(s3, ")");
        return this.url.searchParams.append(e3, "".concat(i3, "fts").concat(n2, ".").concat(t3)), this;
      }
      match(e3) {
        return Object.entries(e3).forEach((([e4, t3]) => {
          this.url.searchParams.append(e4, "eq.".concat(t3));
        })), this;
      }
      not(e3, t3, s3) {
        return this.url.searchParams.append(e3, "not.".concat(t3, ".").concat(s3)), this;
      }
      or(e3, { foreignTable: t3, referencedTable: s3 = t3 } = {}) {
        const r3 = s3 ? "".concat(s3, ".or") : "or";
        return this.url.searchParams.append(r3, "(".concat(e3, ")")), this;
      }
      filter(e3, t3, s3) {
        return this.url.searchParams.append(e3, "".concat(t3, ".").concat(s3)), this;
      }
    }
    class c {
      constructor(e3, { headers: t3 = {}, schema: s3, fetch: r3 }) {
        this.url = e3, this.headers = t3, this.schema = s3, this.fetch = r3;
      }
      select(e3, { head: t3 = false, count: s3 } = {}) {
        const r3 = t3 ? "HEAD" : "GET";
        let i3 = false;
        const n2 = (null != e3 ? e3 : "*").split("").map(((e4) => /\s/.test(e4) && !i3 ? "" : ('"' === e4 && (i3 = !i3), e4))).join("");
        return this.url.searchParams.set("select", n2), s3 && (this.headers.Prefer = "count=".concat(s3)), new a({ method: r3, url: this.url, headers: this.headers, schema: this.schema, fetch: this.fetch, allowEmpty: false });
      }
      insert(e3, { count: t3, defaultToNull: s3 = true } = {}) {
        const r3 = [];
        if (this.headers.Prefer && r3.push(this.headers.Prefer), t3 && r3.push("count=".concat(t3)), s3 || r3.push("missing=default"), this.headers.Prefer = r3.join(","), Array.isArray(e3)) {
          const t4 = e3.reduce(((e4, t5) => e4.concat(Object.keys(t5))), []);
          if (t4.length > 0) {
            const e4 = [...new Set(t4)].map(((e5) => '"'.concat(e5, '"')));
            this.url.searchParams.set("columns", e4.join(","));
          }
        }
        return new a({ method: "POST", url: this.url, headers: this.headers, schema: this.schema, body: e3, fetch: this.fetch, allowEmpty: false });
      }
      upsert(e3, { onConflict: t3, ignoreDuplicates: s3 = false, count: r3, defaultToNull: i3 = true } = {}) {
        const n2 = ["resolution=".concat(s3 ? "ignore" : "merge", "-duplicates")];
        if (void 0 !== t3 && this.url.searchParams.set("on_conflict", t3), this.headers.Prefer && n2.push(this.headers.Prefer), r3 && n2.push("count=".concat(r3)), i3 || n2.push("missing=default"), this.headers.Prefer = n2.join(","), Array.isArray(e3)) {
          const t4 = e3.reduce(((e4, t5) => e4.concat(Object.keys(t5))), []);
          if (t4.length > 0) {
            const e4 = [...new Set(t4)].map(((e5) => '"'.concat(e5, '"')));
            this.url.searchParams.set("columns", e4.join(","));
          }
        }
        return new a({ method: "POST", url: this.url, headers: this.headers, schema: this.schema, body: e3, fetch: this.fetch, allowEmpty: false });
      }
      update(e3, { count: t3 } = {}) {
        const s3 = [];
        return this.headers.Prefer && s3.push(this.headers.Prefer), t3 && s3.push("count=".concat(t3)), this.headers.Prefer = s3.join(","), new a({ method: "PATCH", url: this.url, headers: this.headers, schema: this.schema, body: e3, fetch: this.fetch, allowEmpty: false });
      }
      delete({ count: e3 } = {}) {
        const t3 = [];
        return e3 && t3.push("count=".concat(e3)), this.headers.Prefer && t3.unshift(this.headers.Prefer), this.headers.Prefer = t3.join(","), new a({ method: "DELETE", url: this.url, headers: this.headers, schema: this.schema, fetch: this.fetch, allowEmpty: false });
      }
    }
    const h = { "X-Client-Info": "postgrest-js/1.8.6" };
    class l {
      constructor(e3, { headers: t3 = {}, schema: s3, fetch: r3 } = {}) {
        this.url = e3, this.headers = Object.assign(Object.assign({}, h), t3), this.schemaName = s3, this.fetch = r3;
      }
      from(e3) {
        const t3 = new URL("".concat(this.url, "/").concat(e3));
        return new c(t3, { headers: Object.assign({}, this.headers), schema: this.schemaName, fetch: this.fetch });
      }
      schema(e3) {
        return new l(this.url, { headers: this.headers, schema: e3, fetch: this.fetch });
      }
      rpc(e3, t3 = {}, { head: s3 = false, count: r3 } = {}) {
        let i3;
        const n2 = new URL("".concat(this.url, "/rpc/").concat(e3));
        let o2;
        s3 ? (i3 = "HEAD", Object.entries(t3).forEach((([e4, t4]) => {
          n2.searchParams.append(e4, "".concat(t4));
        }))) : (i3 = "POST", o2 = t3);
        const c2 = Object.assign({}, this.headers);
        return r3 && (c2.Prefer = "count=".concat(r3)), new a({ method: i3, url: n2, headers: c2, schema: this.schemaName, body: o2, fetch: this.fetch, allowEmpty: false });
      }
    }
  }, 73: (e2, t2, s2) => {
    "use strict";
    s2.r(t2), s2.d(t2, { REALTIME_CHANNEL_STATES: () => P, REALTIME_LISTEN_TYPES: () => j, REALTIME_POSTGRES_CHANGES_LISTEN_EVENT: () => E, REALTIME_PRESENCE_LISTEN_EVENTS: () => l, REALTIME_SUBSCRIBE_STATES: () => O, RealtimeChannel: () => $, RealtimeClient: () => C, RealtimePresence: () => g });
    var r2 = s2(840);
    const i2 = { "X-Client-Info": "realtime-js/2.8.4" };
    var n, o, a, c, h, l, u;
    !(function(e3) {
      e3[e3.connecting = 0] = "connecting", e3[e3.open = 1] = "open", e3[e3.closing = 2] = "closing", e3[e3.closed = 3] = "closed";
    })(n || (n = {})), (function(e3) {
      e3.closed = "closed", e3.errored = "errored", e3.joined = "joined", e3.joining = "joining", e3.leaving = "leaving";
    })(o || (o = {})), (function(e3) {
      e3.close = "phx_close", e3.error = "phx_error", e3.join = "phx_join", e3.reply = "phx_reply", e3.leave = "phx_leave", e3.access_token = "access_token";
    })(a || (a = {})), (function(e3) {
      e3.websocket = "websocket";
    })(c || (c = {})), (function(e3) {
      e3.Connecting = "connecting", e3.Open = "open", e3.Closing = "closing", e3.Closed = "closed";
    })(h || (h = {}));
    class d {
      constructor(e3, t3) {
        this.callback = e3, this.timerCalc = t3, this.timer = void 0, this.tries = 0, this.callback = e3, this.timerCalc = t3;
      }
      reset() {
        this.tries = 0, clearTimeout(this.timer);
      }
      scheduleTimeout() {
        clearTimeout(this.timer), this.timer = setTimeout((() => {
          this.tries = this.tries + 1, this.callback();
        }), this.timerCalc(this.tries + 1));
      }
    }
    class f {
      constructor() {
        this.HEADER_LENGTH = 1;
      }
      decode(e3, t3) {
        return e3.constructor === ArrayBuffer ? t3(this._binaryDecode(e3)) : t3("string" == typeof e3 ? JSON.parse(e3) : {});
      }
      _binaryDecode(e3) {
        const t3 = new DataView(e3), s3 = new TextDecoder();
        return this._decodeBroadcast(e3, t3, s3);
      }
      _decodeBroadcast(e3, t3, s3) {
        const r3 = t3.getUint8(1), i3 = t3.getUint8(2);
        let n2 = this.HEADER_LENGTH + 2;
        const o2 = s3.decode(e3.slice(n2, n2 + r3));
        n2 += r3;
        const a2 = s3.decode(e3.slice(n2, n2 + i3));
        return n2 += i3, { ref: null, topic: o2, event: a2, payload: JSON.parse(s3.decode(e3.slice(n2, e3.byteLength))) };
      }
    }
    class p {
      constructor(e3, t3, s3 = {}, r3 = 1e4) {
        this.channel = e3, this.event = t3, this.payload = s3, this.timeout = r3, this.sent = false, this.timeoutTimer = void 0, this.ref = "", this.receivedResp = null, this.recHooks = [], this.refEvent = null;
      }
      resend(e3) {
        this.timeout = e3, this._cancelRefEvent(), this.ref = "", this.refEvent = null, this.receivedResp = null, this.sent = false, this.send();
      }
      send() {
        this._hasReceived("timeout") || (this.startTimeout(), this.sent = true, this.channel.socket.push({ topic: this.channel.topic, event: this.event, payload: this.payload, ref: this.ref, join_ref: this.channel._joinRef() }));
      }
      updatePayload(e3) {
        this.payload = Object.assign(Object.assign({}, this.payload), e3);
      }
      receive(e3, t3) {
        var s3;
        return this._hasReceived(e3) && t3(null === (s3 = this.receivedResp) || void 0 === s3 ? void 0 : s3.response), this.recHooks.push({ status: e3, callback: t3 }), this;
      }
      startTimeout() {
        this.timeoutTimer || (this.ref = this.channel.socket._makeRef(), this.refEvent = this.channel._replyEventName(this.ref), this.channel._on(this.refEvent, {}, ((e3) => {
          this._cancelRefEvent(), this._cancelTimeout(), this.receivedResp = e3, this._matchReceive(e3);
        })), this.timeoutTimer = setTimeout((() => {
          this.trigger("timeout", {});
        }), this.timeout));
      }
      trigger(e3, t3) {
        this.refEvent && this.channel._trigger(this.refEvent, { status: e3, response: t3 });
      }
      destroy() {
        this._cancelRefEvent(), this._cancelTimeout();
      }
      _cancelRefEvent() {
        this.refEvent && this.channel._off(this.refEvent, {});
      }
      _cancelTimeout() {
        clearTimeout(this.timeoutTimer), this.timeoutTimer = void 0;
      }
      _matchReceive({ status: e3, response: t3 }) {
        this.recHooks.filter(((t4) => t4.status === e3)).forEach(((e4) => e4.callback(t3)));
      }
      _hasReceived(e3) {
        return this.receivedResp && this.receivedResp.status === e3;
      }
    }
    !(function(e3) {
      e3.SYNC = "sync", e3.JOIN = "join", e3.LEAVE = "leave";
    })(l || (l = {}));
    class g {
      constructor(e3, t3) {
        this.channel = e3, this.state = {}, this.pendingDiffs = [], this.joinRef = null, this.caller = { onJoin: () => {
        }, onLeave: () => {
        }, onSync: () => {
        } };
        const s3 = (null == t3 ? void 0 : t3.events) || { state: "presence_state", diff: "presence_diff" };
        this.channel._on(s3.state, {}, ((e4) => {
          const { onJoin: t4, onLeave: s4, onSync: r3 } = this.caller;
          this.joinRef = this.channel._joinRef(), this.state = g.syncState(this.state, e4, t4, s4), this.pendingDiffs.forEach(((e5) => {
            this.state = g.syncDiff(this.state, e5, t4, s4);
          })), this.pendingDiffs = [], r3();
        })), this.channel._on(s3.diff, {}, ((e4) => {
          const { onJoin: t4, onLeave: s4, onSync: r3 } = this.caller;
          this.inPendingSyncState() ? this.pendingDiffs.push(e4) : (this.state = g.syncDiff(this.state, e4, t4, s4), r3());
        })), this.onJoin(((e4, t4, s4) => {
          this.channel._trigger("presence", { event: "join", key: e4, currentPresences: t4, newPresences: s4 });
        })), this.onLeave(((e4, t4, s4) => {
          this.channel._trigger("presence", { event: "leave", key: e4, currentPresences: t4, leftPresences: s4 });
        })), this.onSync((() => {
          this.channel._trigger("presence", { event: "sync" });
        }));
      }
      static syncState(e3, t3, s3, r3) {
        const i3 = this.cloneDeep(e3), n2 = this.transformState(t3), o2 = {}, a2 = {};
        return this.map(i3, ((e4, t4) => {
          n2[e4] || (a2[e4] = t4);
        })), this.map(n2, ((e4, t4) => {
          const s4 = i3[e4];
          if (s4) {
            const r4 = t4.map(((e5) => e5.presence_ref)), i4 = s4.map(((e5) => e5.presence_ref)), n3 = t4.filter(((e5) => i4.indexOf(e5.presence_ref) < 0)), c2 = s4.filter(((e5) => r4.indexOf(e5.presence_ref) < 0));
            n3.length > 0 && (o2[e4] = n3), c2.length > 0 && (a2[e4] = c2);
          } else o2[e4] = t4;
        })), this.syncDiff(i3, { joins: o2, leaves: a2 }, s3, r3);
      }
      static syncDiff(e3, t3, s3, r3) {
        const { joins: i3, leaves: n2 } = { joins: this.transformState(t3.joins), leaves: this.transformState(t3.leaves) };
        return s3 || (s3 = () => {
        }), r3 || (r3 = () => {
        }), this.map(i3, ((t4, r4) => {
          var i4;
          const n3 = null !== (i4 = e3[t4]) && void 0 !== i4 ? i4 : [];
          if (e3[t4] = this.cloneDeep(r4), n3.length > 0) {
            const s4 = e3[t4].map(((e4) => e4.presence_ref)), r5 = n3.filter(((e4) => s4.indexOf(e4.presence_ref) < 0));
            e3[t4].unshift(...r5);
          }
          s3(t4, n3, r4);
        })), this.map(n2, ((t4, s4) => {
          let i4 = e3[t4];
          if (!i4) return;
          const n3 = s4.map(((e4) => e4.presence_ref));
          i4 = i4.filter(((e4) => n3.indexOf(e4.presence_ref) < 0)), e3[t4] = i4, r3(t4, i4, s4), 0 === i4.length && delete e3[t4];
        })), e3;
      }
      static map(e3, t3) {
        return Object.getOwnPropertyNames(e3).map(((s3) => t3(s3, e3[s3])));
      }
      static transformState(e3) {
        return e3 = this.cloneDeep(e3), Object.getOwnPropertyNames(e3).reduce(((t3, s3) => {
          const r3 = e3[s3];
          return t3[s3] = "metas" in r3 ? r3.metas.map(((e4) => (e4.presence_ref = e4.phx_ref, delete e4.phx_ref, delete e4.phx_ref_prev, e4))) : r3, t3;
        }), {});
      }
      static cloneDeep(e3) {
        return JSON.parse(JSON.stringify(e3));
      }
      onJoin(e3) {
        this.caller.onJoin = e3;
      }
      onLeave(e3) {
        this.caller.onLeave = e3;
      }
      onSync(e3) {
        this.caller.onSync = e3;
      }
      inPendingSyncState() {
        return !this.joinRef || this.joinRef !== this.channel._joinRef();
      }
    }
    !(function(e3) {
      e3.abstime = "abstime", e3.bool = "bool", e3.date = "date", e3.daterange = "daterange", e3.float4 = "float4", e3.float8 = "float8", e3.int2 = "int2", e3.int4 = "int4", e3.int4range = "int4range", e3.int8 = "int8", e3.int8range = "int8range", e3.json = "json", e3.jsonb = "jsonb", e3.money = "money", e3.numeric = "numeric", e3.oid = "oid", e3.reltime = "reltime", e3.text = "text", e3.time = "time", e3.timestamp = "timestamp", e3.timestamptz = "timestamptz", e3.timetz = "timetz", e3.tsrange = "tsrange", e3.tstzrange = "tstzrange";
    })(u || (u = {}));
    const y = (e3, t3, s3 = {}) => {
      var r3;
      const i3 = null !== (r3 = s3.skipTypes) && void 0 !== r3 ? r3 : [];
      return Object.keys(t3).reduce(((s4, r4) => (s4[r4] = m(r4, e3, t3, i3), s4)), {});
    }, m = (e3, t3, s3, r3) => {
      const i3 = t3.find(((t4) => t4.name === e3)), n2 = null == i3 ? void 0 : i3.type, o2 = s3[e3];
      return n2 && !r3.includes(n2) ? v(n2, o2) : _(o2);
    }, v = (e3, t3) => {
      if ("_" === e3.charAt(0)) {
        const s3 = e3.slice(1, e3.length);
        return S(t3, s3);
      }
      switch (e3) {
        case u.bool:
          return b(t3);
        case u.float4:
        case u.float8:
        case u.int2:
        case u.int4:
        case u.int8:
        case u.numeric:
        case u.oid:
          return w(t3);
        case u.json:
        case u.jsonb:
          return k(t3);
        case u.timestamp:
          return T(t3);
        case u.abstime:
        case u.date:
        case u.daterange:
        case u.int4range:
        case u.int8range:
        case u.money:
        case u.reltime:
        case u.text:
        case u.time:
        case u.timestamptz:
        case u.timetz:
        case u.tsrange:
        case u.tstzrange:
        default:
          return _(t3);
      }
    }, _ = (e3) => e3, b = (e3) => {
      switch (e3) {
        case "t":
          return true;
        case "f":
          return false;
        default:
          return e3;
      }
    }, w = (e3) => {
      if ("string" == typeof e3) {
        const t3 = parseFloat(e3);
        if (!Number.isNaN(t3)) return t3;
      }
      return e3;
    }, k = (e3) => {
      if ("string" == typeof e3) try {
        return JSON.parse(e3);
      } catch (t3) {
        return console.log("JSON parse error: ".concat(t3)), e3;
      }
      return e3;
    }, S = (e3, t3) => {
      if ("string" != typeof e3) return e3;
      const s3 = e3.length - 1, r3 = e3[s3];
      if ("{" === e3[0] && "}" === r3) {
        let r4;
        const i3 = e3.slice(1, s3);
        try {
          r4 = JSON.parse("[" + i3 + "]");
        } catch (e4) {
          r4 = i3 ? i3.split(",") : [];
        }
        return r4.map(((e4) => v(t3, e4)));
      }
      return e3;
    }, T = (e3) => "string" == typeof e3 ? e3.replace(" ", "T") : e3;
    var E, j, O;
    !(function(e3) {
      e3.ALL = "*", e3.INSERT = "INSERT", e3.UPDATE = "UPDATE", e3.DELETE = "DELETE";
    })(E || (E = {})), (function(e3) {
      e3.BROADCAST = "broadcast", e3.PRESENCE = "presence", e3.POSTGRES_CHANGES = "postgres_changes";
    })(j || (j = {})), (function(e3) {
      e3.SUBSCRIBED = "SUBSCRIBED", e3.TIMED_OUT = "TIMED_OUT", e3.CLOSED = "CLOSED", e3.CHANNEL_ERROR = "CHANNEL_ERROR";
    })(O || (O = {}));
    const P = o;
    class $ {
      constructor(e3, t3 = { config: {} }, s3) {
        this.topic = e3, this.params = t3, this.socket = s3, this.bindings = {}, this.state = o.closed, this.joinedOnce = false, this.pushBuffer = [], this.subTopic = e3.replace(/^realtime:/i, ""), this.params.config = Object.assign({ broadcast: { ack: false, self: false }, presence: { key: "" } }, t3.config), this.timeout = this.socket.timeout, this.joinPush = new p(this, a.join, this.params, this.timeout), this.rejoinTimer = new d((() => this._rejoinUntilConnected()), this.socket.reconnectAfterMs), this.joinPush.receive("ok", (() => {
          this.state = o.joined, this.rejoinTimer.reset(), this.pushBuffer.forEach(((e4) => e4.send())), this.pushBuffer = [];
        })), this._onClose((() => {
          this.rejoinTimer.reset(), this.socket.log("channel", "close ".concat(this.topic, " ").concat(this._joinRef())), this.state = o.closed, this.socket._remove(this);
        })), this._onError(((e4) => {
          this._isLeaving() || this._isClosed() || (this.socket.log("channel", "error ".concat(this.topic), e4), this.state = o.errored, this.rejoinTimer.scheduleTimeout());
        })), this.joinPush.receive("timeout", (() => {
          this._isJoining() && (this.socket.log("channel", "timeout ".concat(this.topic), this.joinPush.timeout), this.state = o.errored, this.rejoinTimer.scheduleTimeout());
        })), this._on(a.reply, {}, ((e4, t4) => {
          this._trigger(this._replyEventName(t4), e4);
        })), this.presence = new g(this), this.broadcastEndpointURL = this._broadcastEndpointURL();
      }
      subscribe(e3, t3 = this.timeout) {
        var s3, r3;
        if (this.socket.isConnected() || this.socket.connect(), this.joinedOnce) throw "tried to subscribe multiple times. 'subscribe' can only be called a single time per channel instance";
        {
          const { config: { broadcast: i3, presence: n2 } } = this.params;
          this._onError(((t4) => e3 && e3("CHANNEL_ERROR", t4))), this._onClose((() => e3 && e3("CLOSED")));
          const o2 = {}, a2 = { broadcast: i3, presence: n2, postgres_changes: null !== (r3 = null === (s3 = this.bindings.postgres_changes) || void 0 === s3 ? void 0 : s3.map(((e4) => e4.filter))) && void 0 !== r3 ? r3 : [] };
          this.socket.accessToken && (o2.access_token = this.socket.accessToken), this.updateJoinPayload(Object.assign({ config: a2 }, o2)), this.joinedOnce = true, this._rejoin(t3), this.joinPush.receive("ok", (({ postgres_changes: t4 }) => {
            var s4;
            if (this.socket.accessToken && this.socket.setAuth(this.socket.accessToken), void 0 !== t4) {
              const r4 = this.bindings.postgres_changes, i4 = null !== (s4 = null == r4 ? void 0 : r4.length) && void 0 !== s4 ? s4 : 0, n3 = [];
              for (let s5 = 0; s5 < i4; s5++) {
                const i5 = r4[s5], { filter: { event: o3, schema: a3, table: c2, filter: h2 } } = i5, l2 = t4 && t4[s5];
                if (!l2 || l2.event !== o3 || l2.schema !== a3 || l2.table !== c2 || l2.filter !== h2) return this.unsubscribe(), void (e3 && e3("CHANNEL_ERROR", new Error("mismatch between server and client bindings for postgres changes")));
                n3.push(Object.assign(Object.assign({}, i5), { id: l2.id }));
              }
              return this.bindings.postgres_changes = n3, void (e3 && e3("SUBSCRIBED"));
            }
            e3 && e3("SUBSCRIBED");
          })).receive("error", ((t4) => {
            e3 && e3("CHANNEL_ERROR", new Error(JSON.stringify(Object.values(t4).join(", ") || "error")));
          })).receive("timeout", (() => {
            e3 && e3("TIMED_OUT");
          }));
        }
        return this;
      }
      presenceState() {
        return this.presence.state;
      }
      async track(e3, t3 = {}) {
        return await this.send({ type: "presence", event: "track", payload: e3 }, t3.timeout || this.timeout);
      }
      async untrack(e3 = {}) {
        return await this.send({ type: "presence", event: "untrack" }, e3);
      }
      on(e3, t3, s3) {
        return this._on(e3, t3, s3);
      }
      async send(e3, t3 = {}) {
        var s3, r3;
        if (this._canPush() || "broadcast" !== e3.type) return new Promise(((s4) => {
          var r4, i3, n2;
          const o2 = this._push(e3.type, e3, t3.timeout || this.timeout);
          "broadcast" !== e3.type || (null === (n2 = null === (i3 = null === (r4 = this.params) || void 0 === r4 ? void 0 : r4.config) || void 0 === i3 ? void 0 : i3.broadcast) || void 0 === n2 ? void 0 : n2.ack) || s4("ok"), o2.receive("ok", (() => s4("ok"))), o2.receive("timeout", (() => s4("timed out")));
        }));
        {
          const { event: i3, payload: n2 } = e3, o2 = { method: "POST", headers: { apikey: null !== (s3 = this.socket.accessToken) && void 0 !== s3 ? s3 : "", "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ topic: this.subTopic, event: i3, payload: n2 }] }) };
          try {
            return (await this._fetchWithTimeout(this.broadcastEndpointURL, o2, null !== (r3 = t3.timeout) && void 0 !== r3 ? r3 : this.timeout)).ok ? "ok" : "error";
          } catch (e4) {
            return "AbortError" === e4.name ? "timed out" : "error";
          }
        }
      }
      updateJoinPayload(e3) {
        this.joinPush.updatePayload(e3);
      }
      unsubscribe(e3 = this.timeout) {
        this.state = o.leaving;
        const t3 = () => {
          this.socket.log("channel", "leave ".concat(this.topic)), this._trigger(a.close, "leave", this._joinRef());
        };
        return this.rejoinTimer.reset(), this.joinPush.destroy(), new Promise(((s3) => {
          const r3 = new p(this, a.leave, {}, e3);
          r3.receive("ok", (() => {
            t3(), s3("ok");
          })).receive("timeout", (() => {
            t3(), s3("timed out");
          })).receive("error", (() => {
            s3("error");
          })), r3.send(), this._canPush() || r3.trigger("ok", {});
        }));
      }
      _broadcastEndpointURL() {
        let e3 = this.socket.endPoint;
        return e3 = e3.replace(/^ws/i, "http"), e3 = e3.replace(/(\/socket\/websocket|\/socket|\/websocket)\/?$/i, ""), e3.replace(/\/+$/, "") + "/api/broadcast";
      }
      async _fetchWithTimeout(e3, t3, s3) {
        const r3 = new AbortController(), i3 = setTimeout((() => r3.abort()), s3), n2 = await this.socket.fetch(e3, Object.assign(Object.assign({}, t3), { signal: r3.signal }));
        return clearTimeout(i3), n2;
      }
      _push(e3, t3, s3 = this.timeout) {
        if (!this.joinedOnce) throw "tried to push '".concat(e3, "' to '").concat(this.topic, "' before joining. Use channel.subscribe() before pushing events");
        let r3 = new p(this, e3, t3, s3);
        return this._canPush() ? r3.send() : (r3.startTimeout(), this.pushBuffer.push(r3)), r3;
      }
      _onMessage(e3, t3, s3) {
        return t3;
      }
      _isMember(e3) {
        return this.topic === e3;
      }
      _joinRef() {
        return this.joinPush.ref;
      }
      _trigger(e3, t3, s3) {
        var r3, i3;
        const n2 = e3.toLocaleLowerCase(), { close: o2, error: c2, leave: h2, join: l2 } = a;
        if (s3 && [o2, c2, h2, l2].indexOf(n2) >= 0 && s3 !== this._joinRef()) return;
        let u2 = this._onMessage(n2, t3, s3);
        if (t3 && !u2) throw "channel onMessage callbacks must return the payload, modified or unmodified";
        ["insert", "update", "delete"].includes(n2) ? null === (r3 = this.bindings.postgres_changes) || void 0 === r3 || r3.filter(((e4) => {
          var t4, s4, r4;
          return "*" === (null === (t4 = e4.filter) || void 0 === t4 ? void 0 : t4.event) || (null === (r4 = null === (s4 = e4.filter) || void 0 === s4 ? void 0 : s4.event) || void 0 === r4 ? void 0 : r4.toLocaleLowerCase()) === n2;
        })).map(((e4) => e4.callback(u2, s3))) : null === (i3 = this.bindings[n2]) || void 0 === i3 || i3.filter(((e4) => {
          var s4, r4, i4, o3, a2, c3;
          if (["broadcast", "presence", "postgres_changes"].includes(n2)) {
            if ("id" in e4) {
              const n3 = e4.id, o4 = null === (s4 = e4.filter) || void 0 === s4 ? void 0 : s4.event;
              return n3 && (null === (r4 = t3.ids) || void 0 === r4 ? void 0 : r4.includes(n3)) && ("*" === o4 || (null == o4 ? void 0 : o4.toLocaleLowerCase()) === (null === (i4 = t3.data) || void 0 === i4 ? void 0 : i4.type.toLocaleLowerCase()));
            }
            {
              const s5 = null === (a2 = null === (o3 = null == e4 ? void 0 : e4.filter) || void 0 === o3 ? void 0 : o3.event) || void 0 === a2 ? void 0 : a2.toLocaleLowerCase();
              return "*" === s5 || s5 === (null === (c3 = null == t3 ? void 0 : t3.event) || void 0 === c3 ? void 0 : c3.toLocaleLowerCase());
            }
          }
          return e4.type.toLocaleLowerCase() === n2;
        })).map(((e4) => {
          if ("object" == typeof u2 && "ids" in u2) {
            const e5 = u2.data, { schema: t4, table: s4, commit_timestamp: r4, type: i4, errors: n3 } = e5, o3 = { schema: t4, table: s4, commit_timestamp: r4, eventType: i4, new: {}, old: {}, errors: n3 };
            u2 = Object.assign(Object.assign({}, o3), this._getPayloadRecords(e5));
          }
          e4.callback(u2, s3);
        }));
      }
      _isClosed() {
        return this.state === o.closed;
      }
      _isJoined() {
        return this.state === o.joined;
      }
      _isJoining() {
        return this.state === o.joining;
      }
      _isLeaving() {
        return this.state === o.leaving;
      }
      _replyEventName(e3) {
        return "chan_reply_".concat(e3);
      }
      _on(e3, t3, s3) {
        const r3 = e3.toLocaleLowerCase(), i3 = { type: r3, filter: t3, callback: s3 };
        return this.bindings[r3] ? this.bindings[r3].push(i3) : this.bindings[r3] = [i3], this;
      }
      _off(e3, t3) {
        const s3 = e3.toLocaleLowerCase();
        return this.bindings[s3] = this.bindings[s3].filter(((e4) => {
          var r3;
          return !((null === (r3 = e4.type) || void 0 === r3 ? void 0 : r3.toLocaleLowerCase()) === s3 && $.isEqual(e4.filter, t3));
        })), this;
      }
      static isEqual(e3, t3) {
        if (Object.keys(e3).length !== Object.keys(t3).length) return false;
        for (const s3 in e3) if (e3[s3] !== t3[s3]) return false;
        return true;
      }
      _rejoinUntilConnected() {
        this.rejoinTimer.scheduleTimeout(), this.socket.isConnected() && this._rejoin();
      }
      _onClose(e3) {
        this._on(a.close, {}, e3);
      }
      _onError(e3) {
        this._on(a.error, {}, ((t3) => e3(t3)));
      }
      _canPush() {
        return this.socket.isConnected() && this._isJoined();
      }
      _rejoin(e3 = this.timeout) {
        this._isLeaving() || (this.socket._leaveOpenTopic(this.topic), this.state = o.joining, this.joinPush.resend(e3));
      }
      _getPayloadRecords(e3) {
        const t3 = { new: {}, old: {} };
        return "INSERT" !== e3.type && "UPDATE" !== e3.type || (t3.new = y(e3.columns, e3.record)), "UPDATE" !== e3.type && "DELETE" !== e3.type || (t3.old = y(e3.columns, e3.old_record)), t3;
      }
    }
    const x = () => {
    };
    class C {
      constructor(e3, t3) {
        var n2;
        this.accessToken = null, this.channels = [], this.endPoint = "", this.headers = i2, this.params = {}, this.timeout = 1e4, this.transport = r2.w3cwebsocket, this.heartbeatIntervalMs = 3e4, this.heartbeatTimer = void 0, this.pendingHeartbeatRef = null, this.ref = 0, this.logger = x, this.conn = null, this.sendBuffer = [], this.serializer = new f(), this.stateChangeCallbacks = { open: [], close: [], error: [], message: [] }, this._resolveFetch = (e4) => {
          let t4;
          return t4 = e4 || ("undefined" == typeof fetch ? (...e5) => Promise.resolve().then(s2.t.bind(s2, 743, 23)).then((({ default: t5 }) => t5(...e5))) : fetch), (...e5) => t4(...e5);
        }, this.endPoint = "".concat(e3, "/").concat(c.websocket), (null == t3 ? void 0 : t3.params) && (this.params = t3.params), (null == t3 ? void 0 : t3.headers) && (this.headers = Object.assign(Object.assign({}, this.headers), t3.headers)), (null == t3 ? void 0 : t3.timeout) && (this.timeout = t3.timeout), (null == t3 ? void 0 : t3.logger) && (this.logger = t3.logger), (null == t3 ? void 0 : t3.transport) && (this.transport = t3.transport), (null == t3 ? void 0 : t3.heartbeatIntervalMs) && (this.heartbeatIntervalMs = t3.heartbeatIntervalMs);
        const o2 = null === (n2 = null == t3 ? void 0 : t3.params) || void 0 === n2 ? void 0 : n2.apikey;
        o2 && (this.accessToken = o2), this.reconnectAfterMs = (null == t3 ? void 0 : t3.reconnectAfterMs) ? t3.reconnectAfterMs : (e4) => [1e3, 2e3, 5e3, 1e4][e4 - 1] || 1e4, this.encode = (null == t3 ? void 0 : t3.encode) ? t3.encode : (e4, t4) => t4(JSON.stringify(e4)), this.decode = (null == t3 ? void 0 : t3.decode) ? t3.decode : this.serializer.decode.bind(this.serializer), this.reconnectTimer = new d((async () => {
          this.disconnect(), this.connect();
        }), this.reconnectAfterMs), this.fetch = this._resolveFetch(null == t3 ? void 0 : t3.fetch);
      }
      connect() {
        this.conn || (this.conn = new this.transport(this._endPointURL(), [], null, this.headers), this.conn && (this.conn.binaryType = "arraybuffer", this.conn.onopen = () => this._onConnOpen(), this.conn.onerror = (e3) => this._onConnError(e3), this.conn.onmessage = (e3) => this._onConnMessage(e3), this.conn.onclose = (e3) => this._onConnClose(e3)));
      }
      disconnect(e3, t3) {
        this.conn && (this.conn.onclose = function() {
        }, e3 ? this.conn.close(e3, null != t3 ? t3 : "") : this.conn.close(), this.conn = null, this.heartbeatTimer && clearInterval(this.heartbeatTimer), this.reconnectTimer.reset());
      }
      getChannels() {
        return this.channels;
      }
      async removeChannel(e3) {
        const t3 = await e3.unsubscribe();
        return 0 === this.channels.length && this.disconnect(), t3;
      }
      async removeAllChannels() {
        const e3 = await Promise.all(this.channels.map(((e4) => e4.unsubscribe())));
        return this.disconnect(), e3;
      }
      log(e3, t3, s3) {
        this.logger(e3, t3, s3);
      }
      connectionState() {
        switch (this.conn && this.conn.readyState) {
          case n.connecting:
            return h.Connecting;
          case n.open:
            return h.Open;
          case n.closing:
            return h.Closing;
          default:
            return h.Closed;
        }
      }
      isConnected() {
        return this.connectionState() === h.Open;
      }
      channel(e3, t3 = { config: {} }) {
        const s3 = new $("realtime:".concat(e3), t3, this);
        return this.channels.push(s3), s3;
      }
      push(e3) {
        const { topic: t3, event: s3, payload: r3, ref: i3 } = e3, n2 = () => {
          this.encode(e3, ((e4) => {
            var t4;
            null === (t4 = this.conn) || void 0 === t4 || t4.send(e4);
          }));
        };
        this.log("push", "".concat(t3, " ").concat(s3, " (").concat(i3, ")"), r3), this.isConnected() ? n2() : this.sendBuffer.push(n2);
      }
      setAuth(e3) {
        this.accessToken = e3, this.channels.forEach(((t3) => {
          e3 && t3.updateJoinPayload({ access_token: e3 }), t3.joinedOnce && t3._isJoined() && t3._push(a.access_token, { access_token: e3 });
        }));
      }
      _makeRef() {
        let e3 = this.ref + 1;
        return e3 === this.ref ? this.ref = 0 : this.ref = e3, this.ref.toString();
      }
      _leaveOpenTopic(e3) {
        let t3 = this.channels.find(((t4) => t4.topic === e3 && (t4._isJoined() || t4._isJoining())));
        t3 && (this.log("transport", 'leaving duplicate topic "'.concat(e3, '"')), t3.unsubscribe());
      }
      _remove(e3) {
        this.channels = this.channels.filter(((t3) => t3._joinRef() !== e3._joinRef()));
      }
      _endPointURL() {
        return this._appendParams(this.endPoint, Object.assign({}, this.params, { vsn: "1.0.0" }));
      }
      _onConnMessage(e3) {
        this.decode(e3.data, ((e4) => {
          let { topic: t3, event: s3, payload: r3, ref: i3 } = e4;
          (i3 && i3 === this.pendingHeartbeatRef || s3 === (null == r3 ? void 0 : r3.type)) && (this.pendingHeartbeatRef = null), this.log("receive", "".concat(r3.status || "", " ").concat(t3, " ").concat(s3, " ").concat(i3 && "(" + i3 + ")" || ""), r3), this.channels.filter(((e5) => e5._isMember(t3))).forEach(((e5) => e5._trigger(s3, r3, i3))), this.stateChangeCallbacks.message.forEach(((t4) => t4(e4)));
        }));
      }
      _onConnOpen() {
        this.log("transport", "connected to ".concat(this._endPointURL())), this._flushSendBuffer(), this.reconnectTimer.reset(), this.heartbeatTimer && clearInterval(this.heartbeatTimer), this.heartbeatTimer = setInterval((() => this._sendHeartbeat()), this.heartbeatIntervalMs), this.stateChangeCallbacks.open.forEach(((e3) => e3()));
      }
      _onConnClose(e3) {
        this.log("transport", "close", e3), this._triggerChanError(), this.heartbeatTimer && clearInterval(this.heartbeatTimer), this.reconnectTimer.scheduleTimeout(), this.stateChangeCallbacks.close.forEach(((t3) => t3(e3)));
      }
      _onConnError(e3) {
        this.log("transport", e3.message), this._triggerChanError(), this.stateChangeCallbacks.error.forEach(((t3) => t3(e3)));
      }
      _triggerChanError() {
        this.channels.forEach(((e3) => e3._trigger(a.error)));
      }
      _appendParams(e3, t3) {
        if (0 === Object.keys(t3).length) return e3;
        const s3 = e3.match(/\?/) ? "&" : "?";
        return "".concat(e3).concat(s3).concat(new URLSearchParams(t3));
      }
      _flushSendBuffer() {
        this.isConnected() && this.sendBuffer.length > 0 && (this.sendBuffer.forEach(((e3) => e3())), this.sendBuffer = []);
      }
      _sendHeartbeat() {
        var e3;
        if (this.isConnected()) {
          if (this.pendingHeartbeatRef) return this.pendingHeartbeatRef = null, this.log("transport", "heartbeat timeout. Attempting to re-establish connection"), void (null === (e3 = this.conn) || void 0 === e3 || e3.close(1e3, "hearbeat timeout"));
          this.pendingHeartbeatRef = this._makeRef(), this.push({ topic: "phoenix", event: "heartbeat", payload: {}, ref: this.pendingHeartbeatRef }), this.setAuth(this.accessToken);
        }
      }
    }
  }, 752: (e2, t2, s2) => {
    "use strict";
    s2.r(t2), s2.d(t2, { StorageApiError: () => n, StorageClient: () => S, StorageError: () => r2, StorageUnknownError: () => o, isStorageError: () => i2 });
    class r2 extends Error {
      constructor(e3) {
        super(e3), this.__isStorageError = true, this.name = "StorageError";
      }
    }
    function i2(e3) {
      return "object" == typeof e3 && null !== e3 && "__isStorageError" in e3;
    }
    class n extends r2 {
      constructor(e3, t3) {
        super(e3), this.name = "StorageApiError", this.status = t3;
      }
      toJSON() {
        return { name: this.name, message: this.message, status: this.status };
      }
    }
    class o extends r2 {
      constructor(e3, t3) {
        super(e3), this.name = "StorageUnknownError", this.originalError = t3;
      }
    }
    const a = (e3) => {
      let t3;
      return t3 = e3 || ("undefined" == typeof fetch ? (...e4) => Promise.resolve().then(s2.t.bind(s2, 743, 23)).then((({ default: t4 }) => t4(...e4))) : fetch), (...e4) => t3(...e4);
    };
    var c = function(e3, t3, s3, r3) {
      return new (s3 || (s3 = Promise))((function(i3, n2) {
        function o2(e4) {
          try {
            c2(r3.next(e4));
          } catch (e5) {
            n2(e5);
          }
        }
        function a2(e4) {
          try {
            c2(r3.throw(e4));
          } catch (e5) {
            n2(e5);
          }
        }
        function c2(e4) {
          var t4;
          e4.done ? i3(e4.value) : (t4 = e4.value, t4 instanceof s3 ? t4 : new s3((function(e5) {
            e5(t4);
          }))).then(o2, a2);
        }
        c2((r3 = r3.apply(e3, t3 || [])).next());
      }));
    };
    const h = (e3) => e3.msg || e3.message || e3.error_description || e3.error || JSON.stringify(e3), l = (e3, t3) => c(void 0, void 0, void 0, (function* () {
      const r3 = yield (i3 = void 0, a2 = void 0, c2 = void 0, l2 = function* () {
        return "undefined" == typeof Response ? (yield Promise.resolve().then(s2.t.bind(s2, 743, 23))).Response : Response;
      }, new (c2 || (c2 = Promise))((function(e4, t4) {
        function s3(e5) {
          try {
            n2(l2.next(e5));
          } catch (e6) {
            t4(e6);
          }
        }
        function r4(e5) {
          try {
            n2(l2.throw(e5));
          } catch (e6) {
            t4(e6);
          }
        }
        function n2(t5) {
          var i4;
          t5.done ? e4(t5.value) : (i4 = t5.value, i4 instanceof c2 ? i4 : new c2((function(e5) {
            e5(i4);
          }))).then(s3, r4);
        }
        n2((l2 = l2.apply(i3, a2 || [])).next());
      })));
      var i3, a2, c2, l2;
      e3 instanceof r3 ? e3.json().then(((s3) => {
        t3(new n(h(s3), e3.status || 500));
      })).catch(((e4) => {
        t3(new o(h(e4), e4));
      })) : t3(new o(h(e3), e3));
    })), u = (e3, t3, s3, r3) => {
      const i3 = { method: e3, headers: (null == t3 ? void 0 : t3.headers) || {} };
      return "GET" === e3 ? i3 : (i3.headers = Object.assign({ "Content-Type": "application/json" }, null == t3 ? void 0 : t3.headers), i3.body = JSON.stringify(r3), Object.assign(Object.assign({}, i3), s3));
    };
    function d(e3, t3, s3, r3, i3, n2) {
      return c(this, void 0, void 0, (function* () {
        return new Promise(((o2, a2) => {
          e3(s3, u(t3, r3, i3, n2)).then(((e4) => {
            if (!e4.ok) throw e4;
            return (null == r3 ? void 0 : r3.noResolveJson) ? e4 : e4.json();
          })).then(((e4) => o2(e4))).catch(((e4) => l(e4, a2)));
        }));
      }));
    }
    function f(e3, t3, s3, r3) {
      return c(this, void 0, void 0, (function* () {
        return d(e3, "GET", t3, s3, r3);
      }));
    }
    function p(e3, t3, s3, r3, i3) {
      return c(this, void 0, void 0, (function* () {
        return d(e3, "POST", t3, r3, i3, s3);
      }));
    }
    function g(e3, t3, s3, r3, i3) {
      return c(this, void 0, void 0, (function* () {
        return d(e3, "DELETE", t3, r3, i3, s3);
      }));
    }
    var y = function(e3, t3, s3, r3) {
      return new (s3 || (s3 = Promise))((function(i3, n2) {
        function o2(e4) {
          try {
            c2(r3.next(e4));
          } catch (e5) {
            n2(e5);
          }
        }
        function a2(e4) {
          try {
            c2(r3.throw(e4));
          } catch (e5) {
            n2(e5);
          }
        }
        function c2(e4) {
          var t4;
          e4.done ? i3(e4.value) : (t4 = e4.value, t4 instanceof s3 ? t4 : new s3((function(e5) {
            e5(t4);
          }))).then(o2, a2);
        }
        c2((r3 = r3.apply(e3, t3 || [])).next());
      }));
    };
    const m = { limit: 100, offset: 0, sortBy: { column: "name", order: "asc" } }, v = { cacheControl: "3600", contentType: "text/plain;charset=UTF-8", upsert: false };
    class _ {
      constructor(e3, t3 = {}, s3, r3) {
        this.url = e3, this.headers = t3, this.bucketId = s3, this.fetch = a(r3);
      }
      uploadOrUpdate(e3, t3, s3, r3) {
        return y(this, void 0, void 0, (function* () {
          try {
            let i3;
            const n2 = Object.assign(Object.assign({}, v), r3), o2 = Object.assign(Object.assign({}, this.headers), "POST" === e3 && { "x-upsert": String(n2.upsert) });
            "undefined" != typeof Blob && s3 instanceof Blob ? (i3 = new FormData(), i3.append("cacheControl", n2.cacheControl), i3.append("", s3)) : "undefined" != typeof FormData && s3 instanceof FormData ? (i3 = s3, i3.append("cacheControl", n2.cacheControl)) : (i3 = s3, o2["cache-control"] = "max-age=".concat(n2.cacheControl), o2["content-type"] = n2.contentType);
            const a2 = this._removeEmptyFolders(t3), c2 = this._getFinalPath(a2), h2 = yield this.fetch("".concat(this.url, "/object/").concat(c2), Object.assign({ method: e3, body: i3, headers: o2 }, (null == n2 ? void 0 : n2.duplex) ? { duplex: n2.duplex } : {}));
            return h2.ok ? { data: { path: a2 }, error: null } : { data: null, error: yield h2.json() };
          } catch (e4) {
            if (i2(e4)) return { data: null, error: e4 };
            throw e4;
          }
        }));
      }
      upload(e3, t3, s3) {
        return y(this, void 0, void 0, (function* () {
          return this.uploadOrUpdate("POST", e3, t3, s3);
        }));
      }
      uploadToSignedUrl(e3, t3, s3, r3) {
        return y(this, void 0, void 0, (function* () {
          const n2 = this._removeEmptyFolders(e3), o2 = this._getFinalPath(n2), a2 = new URL(this.url + "/object/upload/sign/".concat(o2));
          a2.searchParams.set("token", t3);
          try {
            let e4;
            const t4 = Object.assign({ upsert: v.upsert }, r3), i3 = Object.assign(Object.assign({}, this.headers), { "x-upsert": String(t4.upsert) });
            "undefined" != typeof Blob && s3 instanceof Blob ? (e4 = new FormData(), e4.append("cacheControl", t4.cacheControl), e4.append("", s3)) : "undefined" != typeof FormData && s3 instanceof FormData ? (e4 = s3, e4.append("cacheControl", t4.cacheControl)) : (e4 = s3, i3["cache-control"] = "max-age=".concat(t4.cacheControl), i3["content-type"] = t4.contentType);
            const o3 = yield this.fetch(a2.toString(), { method: "PUT", body: e4, headers: i3 });
            return o3.ok ? { data: { path: n2 }, error: null } : { data: null, error: yield o3.json() };
          } catch (e4) {
            if (i2(e4)) return { data: null, error: e4 };
            throw e4;
          }
        }));
      }
      createSignedUploadUrl(e3) {
        return y(this, void 0, void 0, (function* () {
          try {
            let t3 = this._getFinalPath(e3);
            const s3 = yield p(this.fetch, "".concat(this.url, "/object/upload/sign/").concat(t3), {}, { headers: this.headers }), i3 = new URL(this.url + s3.url), n2 = i3.searchParams.get("token");
            if (!n2) throw new r2("No token returned by API");
            return { data: { signedUrl: i3.toString(), path: e3, token: n2 }, error: null };
          } catch (e4) {
            if (i2(e4)) return { data: null, error: e4 };
            throw e4;
          }
        }));
      }
      update(e3, t3, s3) {
        return y(this, void 0, void 0, (function* () {
          return this.uploadOrUpdate("PUT", e3, t3, s3);
        }));
      }
      move(e3, t3) {
        return y(this, void 0, void 0, (function* () {
          try {
            return { data: yield p(this.fetch, "".concat(this.url, "/object/move"), { bucketId: this.bucketId, sourceKey: e3, destinationKey: t3 }, { headers: this.headers }), error: null };
          } catch (e4) {
            if (i2(e4)) return { data: null, error: e4 };
            throw e4;
          }
        }));
      }
      copy(e3, t3) {
        return y(this, void 0, void 0, (function* () {
          try {
            return { data: { path: (yield p(this.fetch, "".concat(this.url, "/object/copy"), { bucketId: this.bucketId, sourceKey: e3, destinationKey: t3 }, { headers: this.headers })).Key }, error: null };
          } catch (e4) {
            if (i2(e4)) return { data: null, error: e4 };
            throw e4;
          }
        }));
      }
      createSignedUrl(e3, t3, s3) {
        return y(this, void 0, void 0, (function* () {
          try {
            let r3 = this._getFinalPath(e3), i3 = yield p(this.fetch, "".concat(this.url, "/object/sign/").concat(r3), Object.assign({ expiresIn: t3 }, (null == s3 ? void 0 : s3.transform) ? { transform: s3.transform } : {}), { headers: this.headers });
            const n2 = (null == s3 ? void 0 : s3.download) ? "&download=".concat(true === s3.download ? "" : s3.download) : "";
            return i3 = { signedUrl: encodeURI("".concat(this.url).concat(i3.signedURL).concat(n2)) }, { data: i3, error: null };
          } catch (e4) {
            if (i2(e4)) return { data: null, error: e4 };
            throw e4;
          }
        }));
      }
      createSignedUrls(e3, t3, s3) {
        return y(this, void 0, void 0, (function* () {
          try {
            const r3 = yield p(this.fetch, "".concat(this.url, "/object/sign/").concat(this.bucketId), { expiresIn: t3, paths: e3 }, { headers: this.headers }), i3 = (null == s3 ? void 0 : s3.download) ? "&download=".concat(true === s3.download ? "" : s3.download) : "";
            return { data: r3.map(((e4) => Object.assign(Object.assign({}, e4), { signedUrl: e4.signedURL ? encodeURI("".concat(this.url).concat(e4.signedURL).concat(i3)) : null }))), error: null };
          } catch (e4) {
            if (i2(e4)) return { data: null, error: e4 };
            throw e4;
          }
        }));
      }
      download(e3, t3) {
        return y(this, void 0, void 0, (function* () {
          const s3 = void 0 !== (null == t3 ? void 0 : t3.transform) ? "render/image/authenticated" : "object", r3 = this.transformOptsToQueryString((null == t3 ? void 0 : t3.transform) || {}), n2 = r3 ? "?".concat(r3) : "";
          try {
            const t4 = this._getFinalPath(e3), r4 = yield f(this.fetch, "".concat(this.url, "/").concat(s3, "/").concat(t4).concat(n2), { headers: this.headers, noResolveJson: true });
            return { data: yield r4.blob(), error: null };
          } catch (e4) {
            if (i2(e4)) return { data: null, error: e4 };
            throw e4;
          }
        }));
      }
      getPublicUrl(e3, t3) {
        const s3 = this._getFinalPath(e3), r3 = [], i3 = (null == t3 ? void 0 : t3.download) ? "download=".concat(true === t3.download ? "" : t3.download) : "";
        "" !== i3 && r3.push(i3);
        const n2 = void 0 !== (null == t3 ? void 0 : t3.transform) ? "render/image" : "object", o2 = this.transformOptsToQueryString((null == t3 ? void 0 : t3.transform) || {});
        "" !== o2 && r3.push(o2);
        let a2 = r3.join("&");
        return "" !== a2 && (a2 = "?".concat(a2)), { data: { publicUrl: encodeURI("".concat(this.url, "/").concat(n2, "/public/").concat(s3).concat(a2)) } };
      }
      remove(e3) {
        return y(this, void 0, void 0, (function* () {
          try {
            return { data: yield g(this.fetch, "".concat(this.url, "/object/").concat(this.bucketId), { prefixes: e3 }, { headers: this.headers }), error: null };
          } catch (e4) {
            if (i2(e4)) return { data: null, error: e4 };
            throw e4;
          }
        }));
      }
      list(e3, t3, s3) {
        return y(this, void 0, void 0, (function* () {
          try {
            const r3 = Object.assign(Object.assign(Object.assign({}, m), t3), { prefix: e3 || "" });
            return { data: yield p(this.fetch, "".concat(this.url, "/object/list/").concat(this.bucketId), r3, { headers: this.headers }, s3), error: null };
          } catch (e4) {
            if (i2(e4)) return { data: null, error: e4 };
            throw e4;
          }
        }));
      }
      _getFinalPath(e3) {
        return "".concat(this.bucketId, "/").concat(e3);
      }
      _removeEmptyFolders(e3) {
        return e3.replace(/^\/|\/$/g, "").replace(/\/+/g, "/");
      }
      transformOptsToQueryString(e3) {
        const t3 = [];
        return e3.width && t3.push("width=".concat(e3.width)), e3.height && t3.push("height=".concat(e3.height)), e3.resize && t3.push("resize=".concat(e3.resize)), e3.format && t3.push("format=".concat(e3.format)), e3.quality && t3.push("quality=".concat(e3.quality)), t3.join("&");
      }
    }
    const b = { "X-Client-Info": "storage-js/2.5.4" };
    var w = function(e3, t3, s3, r3) {
      return new (s3 || (s3 = Promise))((function(i3, n2) {
        function o2(e4) {
          try {
            c2(r3.next(e4));
          } catch (e5) {
            n2(e5);
          }
        }
        function a2(e4) {
          try {
            c2(r3.throw(e4));
          } catch (e5) {
            n2(e5);
          }
        }
        function c2(e4) {
          var t4;
          e4.done ? i3(e4.value) : (t4 = e4.value, t4 instanceof s3 ? t4 : new s3((function(e5) {
            e5(t4);
          }))).then(o2, a2);
        }
        c2((r3 = r3.apply(e3, t3 || [])).next());
      }));
    };
    class k {
      constructor(e3, t3 = {}, s3) {
        this.url = e3, this.headers = Object.assign(Object.assign({}, b), t3), this.fetch = a(s3);
      }
      listBuckets() {
        return w(this, void 0, void 0, (function* () {
          try {
            return { data: yield f(this.fetch, "".concat(this.url, "/bucket"), { headers: this.headers }), error: null };
          } catch (e3) {
            if (i2(e3)) return { data: null, error: e3 };
            throw e3;
          }
        }));
      }
      getBucket(e3) {
        return w(this, void 0, void 0, (function* () {
          try {
            return { data: yield f(this.fetch, "".concat(this.url, "/bucket/").concat(e3), { headers: this.headers }), error: null };
          } catch (e4) {
            if (i2(e4)) return { data: null, error: e4 };
            throw e4;
          }
        }));
      }
      createBucket(e3, t3 = { public: false }) {
        return w(this, void 0, void 0, (function* () {
          try {
            return { data: yield p(this.fetch, "".concat(this.url, "/bucket"), { id: e3, name: e3, public: t3.public, file_size_limit: t3.fileSizeLimit, allowed_mime_types: t3.allowedMimeTypes }, { headers: this.headers }), error: null };
          } catch (e4) {
            if (i2(e4)) return { data: null, error: e4 };
            throw e4;
          }
        }));
      }
      updateBucket(e3, t3) {
        return w(this, void 0, void 0, (function* () {
          try {
            const s3 = yield (function(e4, t4, s4, r3, i3) {
              return c(this, void 0, void 0, (function* () {
                return d(e4, "PUT", t4, r3, void 0, s4);
              }));
            })(this.fetch, "".concat(this.url, "/bucket/").concat(e3), { id: e3, name: e3, public: t3.public, file_size_limit: t3.fileSizeLimit, allowed_mime_types: t3.allowedMimeTypes }, { headers: this.headers });
            return { data: s3, error: null };
          } catch (e4) {
            if (i2(e4)) return { data: null, error: e4 };
            throw e4;
          }
        }));
      }
      emptyBucket(e3) {
        return w(this, void 0, void 0, (function* () {
          try {
            return { data: yield p(this.fetch, "".concat(this.url, "/bucket/").concat(e3, "/empty"), {}, { headers: this.headers }), error: null };
          } catch (e4) {
            if (i2(e4)) return { data: null, error: e4 };
            throw e4;
          }
        }));
      }
      deleteBucket(e3) {
        return w(this, void 0, void 0, (function* () {
          try {
            return { data: yield g(this.fetch, "".concat(this.url, "/bucket/").concat(e3), {}, { headers: this.headers }), error: null };
          } catch (e4) {
            if (i2(e4)) return { data: null, error: e4 };
            throw e4;
          }
        }));
      }
    }
    class S extends k {
      constructor(e3, t3 = {}, s3) {
        super(e3, t3, s3);
      }
      from(e3) {
        return new _(this.url, this.headers, e3, this.fetch);
      }
    }
  }, 284: (e2) => {
    var t2 = function() {
      if ("object" == typeof self && self) return self;
      if ("object" == typeof window && window) return window;
      throw new Error("Unable to resolve global `this`");
    };
    e2.exports = (function() {
      if (this) return this;
      if ("object" == typeof globalThis && globalThis) return globalThis;
      try {
        Object.defineProperty(Object.prototype, "__global__", { get: function() {
          return this;
        }, configurable: true });
      } catch (e3) {
        return t2();
      }
      try {
        return __global__ || t2();
      } finally {
        delete Object.prototype.__global__;
      }
    })();
  }, 296: function(e2, t2, s2) {
    "use strict";
    var r2 = this && this.__awaiter || function(e3, t3, s3, r3) {
      return new (s3 || (s3 = Promise))((function(i3, n2) {
        function o2(e4) {
          try {
            c2(r3.next(e4));
          } catch (e5) {
            n2(e5);
          }
        }
        function a2(e4) {
          try {
            c2(r3.throw(e4));
          } catch (e5) {
            n2(e5);
          }
        }
        function c2(e4) {
          var t4;
          e4.done ? i3(e4.value) : (t4 = e4.value, t4 instanceof s3 ? t4 : new s3((function(e5) {
            e5(t4);
          }))).then(o2, a2);
        }
        c2((r3 = r3.apply(e3, t3 || [])).next());
      }));
    };
    Object.defineProperty(t2, "__esModule", { value: true });
    const i2 = s2(982), n = s2(189), o = s2(73), a = s2(752), c = s2(678), h = s2(716), l = s2(610), u = s2(283), d = { headers: c.DEFAULT_HEADERS }, f = { schema: "public" }, p = { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true, flowType: "implicit" }, g = {};
    t2.default = class {
      constructor(e3, t3, s3) {
        var r3, i3, o2, a2, c2, u2, y, m;
        if (this.supabaseUrl = e3, this.supabaseKey = t3, !e3) throw new Error("supabaseUrl is required.");
        if (!t3) throw new Error("supabaseKey is required.");
        const v = (0, l.stripTrailingSlash)(e3);
        this.realtimeUrl = "".concat(v, "/realtime/v1").replace(/^http/i, "ws"), this.authUrl = "".concat(v, "/auth/v1"), this.storageUrl = "".concat(v, "/storage/v1"), this.functionsUrl = "".concat(v, "/functions/v1");
        const _ = "sb-".concat(new URL(this.authUrl).hostname.split(".")[0], "-auth-token"), b = { db: f, realtime: g, auth: Object.assign(Object.assign({}, p), { storageKey: _ }), global: d }, w = (0, l.applySettingDefaults)(null != s3 ? s3 : {}, b);
        this.storageKey = null !== (i3 = null === (r3 = w.auth) || void 0 === r3 ? void 0 : r3.storageKey) && void 0 !== i3 ? i3 : "", this.headers = null !== (a2 = null === (o2 = w.global) || void 0 === o2 ? void 0 : o2.headers) && void 0 !== a2 ? a2 : {}, this.auth = this._initSupabaseAuthClient(null !== (c2 = w.auth) && void 0 !== c2 ? c2 : {}, this.headers, null === (u2 = w.global) || void 0 === u2 ? void 0 : u2.fetch), this.fetch = (0, h.fetchWithAuth)(t3, this._getAccessToken.bind(this), null === (y = w.global) || void 0 === y ? void 0 : y.fetch), this.realtime = this._initRealtimeClient(Object.assign({ headers: this.headers }, w.realtime)), this.rest = new n.PostgrestClient("".concat(v, "/rest/v1"), { headers: this.headers, schema: null === (m = w.db) || void 0 === m ? void 0 : m.schema, fetch: this.fetch }), this._listenForAuthEvents();
      }
      get functions() {
        return new i2.FunctionsClient(this.functionsUrl, { headers: this.headers, customFetch: this.fetch });
      }
      get storage() {
        return new a.StorageClient(this.storageUrl, this.headers, this.fetch);
      }
      from(e3) {
        return this.rest.from(e3);
      }
      schema(e3) {
        return this.rest.schema(e3);
      }
      rpc(e3, t3 = {}, s3) {
        return this.rest.rpc(e3, t3, s3);
      }
      channel(e3, t3 = { config: {} }) {
        return this.realtime.channel(e3, t3);
      }
      getChannels() {
        return this.realtime.getChannels();
      }
      removeChannel(e3) {
        return this.realtime.removeChannel(e3);
      }
      removeAllChannels() {
        return this.realtime.removeAllChannels();
      }
      _getAccessToken() {
        var e3, t3;
        return r2(this, void 0, void 0, (function* () {
          const { data: s3 } = yield this.auth.getSession();
          return null !== (t3 = null === (e3 = s3.session) || void 0 === e3 ? void 0 : e3.access_token) && void 0 !== t3 ? t3 : null;
        }));
      }
      _initSupabaseAuthClient({ autoRefreshToken: e3, persistSession: t3, detectSessionInUrl: s3, storage: r3, storageKey: i3, flowType: n2, debug: o2 }, a2, c2) {
        const h2 = { Authorization: "Bearer ".concat(this.supabaseKey), apikey: "".concat(this.supabaseKey) };
        return new u.SupabaseAuthClient({ url: this.authUrl, headers: Object.assign(Object.assign({}, h2), a2), storageKey: i3, autoRefreshToken: e3, persistSession: t3, detectSessionInUrl: s3, storage: r3, flowType: n2, debug: o2, fetch: c2 });
      }
      _initRealtimeClient(e3) {
        return new o.RealtimeClient(this.realtimeUrl, Object.assign(Object.assign({}, e3), { params: Object.assign({ apikey: this.supabaseKey }, null == e3 ? void 0 : e3.params) }));
      }
      _listenForAuthEvents() {
        return this.auth.onAuthStateChange(((e3, t3) => {
          this._handleTokenChanged(e3, "CLIENT", null == t3 ? void 0 : t3.access_token);
        }));
      }
      _handleTokenChanged(e3, t3, s3) {
        "TOKEN_REFRESHED" !== e3 && "SIGNED_IN" !== e3 || this.changedAccessToken === s3 ? "SIGNED_OUT" === e3 && (this.realtime.setAuth(this.supabaseKey), "STORAGE" == t3 && this.auth.signOut(), this.changedAccessToken = void 0) : (this.realtime.setAuth(null != s3 ? s3 : null), this.changedAccessToken = s3);
      }
    };
  }, 341: function(e2, t2, s2) {
    "use strict";
    var r2 = this && this.__createBinding || (Object.create ? function(e3, t3, s3, r3) {
      void 0 === r3 && (r3 = s3);
      var i3 = Object.getOwnPropertyDescriptor(t3, s3);
      i3 && !("get" in i3 ? !t3.__esModule : i3.writable || i3.configurable) || (i3 = { enumerable: true, get: function() {
        return t3[s3];
      } }), Object.defineProperty(e3, r3, i3);
    } : function(e3, t3, s3, r3) {
      void 0 === r3 && (r3 = s3), e3[r3] = t3[s3];
    }), i2 = this && this.__exportStar || function(e3, t3) {
      for (var s3 in e3) "default" === s3 || Object.prototype.hasOwnProperty.call(t3, s3) || r2(t3, e3, s3);
    }, n = this && this.__importDefault || function(e3) {
      return e3 && e3.__esModule ? e3 : { default: e3 };
    };
    Object.defineProperty(t2, "__esModule", { value: true }), t2.createClient = t2.SupabaseClient = t2.FunctionsError = t2.FunctionsRelayError = t2.FunctionsFetchError = t2.FunctionsHttpError = void 0;
    const o = n(s2(296));
    i2(s2(765), t2);
    var a = s2(982);
    Object.defineProperty(t2, "FunctionsHttpError", { enumerable: true, get: function() {
      return a.FunctionsHttpError;
    } }), Object.defineProperty(t2, "FunctionsFetchError", { enumerable: true, get: function() {
      return a.FunctionsFetchError;
    } }), Object.defineProperty(t2, "FunctionsRelayError", { enumerable: true, get: function() {
      return a.FunctionsRelayError;
    } }), Object.defineProperty(t2, "FunctionsError", { enumerable: true, get: function() {
      return a.FunctionsError;
    } }), i2(s2(73), t2);
    var c = s2(296);
    Object.defineProperty(t2, "SupabaseClient", { enumerable: true, get: function() {
      return n(c).default;
    } }), t2.createClient = (e3, t3, s3) => new o.default(e3, t3, s3);
  }, 283: (e2, t2, s2) => {
    "use strict";
    Object.defineProperty(t2, "__esModule", { value: true }), t2.SupabaseAuthClient = void 0;
    const r2 = s2(765);
    class i2 extends r2.GoTrueClient {
      constructor(e3) {
        super(e3);
      }
    }
    t2.SupabaseAuthClient = i2;
  }, 678: (e2, t2, s2) => {
    "use strict";
    Object.defineProperty(t2, "__esModule", { value: true }), t2.DEFAULT_HEADERS = void 0;
    const r2 = s2(506);
    let i2 = "";
    i2 = "undefined" != typeof Deno ? "deno" : "undefined" != typeof document ? "web" : "undefined" != typeof navigator && "ReactNative" === navigator.product ? "react-native" : "node", t2.DEFAULT_HEADERS = { "X-Client-Info": "supabase-js-".concat(i2, "/").concat(r2.version) };
  }, 716: function(e2, t2, s2) {
    "use strict";
    var r2 = this && this.__createBinding || (Object.create ? function(e3, t3, s3, r3) {
      void 0 === r3 && (r3 = s3);
      var i3 = Object.getOwnPropertyDescriptor(t3, s3);
      i3 && !("get" in i3 ? !t3.__esModule : i3.writable || i3.configurable) || (i3 = { enumerable: true, get: function() {
        return t3[s3];
      } }), Object.defineProperty(e3, r3, i3);
    } : function(e3, t3, s3, r3) {
      void 0 === r3 && (r3 = s3), e3[r3] = t3[s3];
    }), i2 = this && this.__setModuleDefault || (Object.create ? function(e3, t3) {
      Object.defineProperty(e3, "default", { enumerable: true, value: t3 });
    } : function(e3, t3) {
      e3.default = t3;
    }), n = this && this.__importStar || function(e3) {
      if (e3 && e3.__esModule) return e3;
      var t3 = {};
      if (null != e3) for (var s3 in e3) "default" !== s3 && Object.prototype.hasOwnProperty.call(e3, s3) && r2(t3, e3, s3);
      return i2(t3, e3), t3;
    }, o = this && this.__awaiter || function(e3, t3, s3, r3) {
      return new (s3 || (s3 = Promise))((function(i3, n2) {
        function o2(e4) {
          try {
            c(r3.next(e4));
          } catch (e5) {
            n2(e5);
          }
        }
        function a2(e4) {
          try {
            c(r3.throw(e4));
          } catch (e5) {
            n2(e5);
          }
        }
        function c(e4) {
          var t4;
          e4.done ? i3(e4.value) : (t4 = e4.value, t4 instanceof s3 ? t4 : new s3((function(e5) {
            e5(t4);
          }))).then(o2, a2);
        }
        c((r3 = r3.apply(e3, t3 || [])).next());
      }));
    };
    Object.defineProperty(t2, "__esModule", { value: true }), t2.fetchWithAuth = t2.resolveHeadersConstructor = t2.resolveFetch = void 0;
    const a = n(s2(743));
    t2.resolveFetch = (e3) => {
      let t3;
      return t3 = e3 || ("undefined" == typeof fetch ? a.default : fetch), (...e4) => t3(...e4);
    }, t2.resolveHeadersConstructor = () => "undefined" == typeof Headers ? a.Headers : Headers, t2.fetchWithAuth = (e3, s3, r3) => {
      const i3 = (0, t2.resolveFetch)(r3), n2 = (0, t2.resolveHeadersConstructor)();
      return (t3, r4) => o(void 0, void 0, void 0, (function* () {
        var o2;
        const a2 = null !== (o2 = yield s3()) && void 0 !== o2 ? o2 : e3;
        let c = new n2(null == r4 ? void 0 : r4.headers);
        return c.has("apikey") || c.set("apikey", e3), c.has("Authorization") || c.set("Authorization", "Bearer ".concat(a2)), i3(t3, Object.assign(Object.assign({}, r4), { headers: c }));
      }));
    };
  }, 610: (e2, t2) => {
    "use strict";
    Object.defineProperty(t2, "__esModule", { value: true }), t2.applySettingDefaults = t2.isBrowser = t2.stripTrailingSlash = t2.uuid = void 0, t2.uuid = function() {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (function(e3) {
        var t3 = 16 * Math.random() | 0;
        return ("x" == e3 ? t3 : 3 & t3 | 8).toString(16);
      }));
    }, t2.stripTrailingSlash = function(e3) {
      return e3.replace(/\/$/, "");
    }, t2.isBrowser = () => "undefined" != typeof window, t2.applySettingDefaults = function(e3, t3) {
      const { db: s2, auth: r2, realtime: i2, global: n } = e3, { db: o, auth: a, realtime: c, global: h } = t3;
      return { db: Object.assign(Object.assign({}, o), s2), auth: Object.assign(Object.assign({}, a), r2), realtime: Object.assign(Object.assign({}, c), i2), global: Object.assign(Object.assign({}, h), n) };
    };
  }, 506: (e2, t2) => {
    "use strict";
    Object.defineProperty(t2, "__esModule", { value: true }), t2.version = void 0, t2.version = "2.39.0";
  }, 840: (e2, t2, s2) => {
    var r2;
    if ("object" == typeof globalThis) r2 = globalThis;
    else try {
      r2 = s2(284);
    } catch (e3) {
    } finally {
      if (r2 || "undefined" == typeof window || (r2 = window), !r2) throw new Error("Could not determine global this");
    }
    var i2 = r2.WebSocket || r2.MozWebSocket, n = s2(387);
    function o(e3, t3) {
      return t3 ? new i2(e3, t3) : new i2(e3);
    }
    i2 && ["CONNECTING", "OPEN", "CLOSING", "CLOSED"].forEach((function(e3) {
      Object.defineProperty(o, e3, { get: function() {
        return i2[e3];
      } });
    })), e2.exports = { w3cwebsocket: i2 ? o : null, version: n };
  }, 387: (e2, t2, s2) => {
    e2.exports = s2(794).version;
  }, 794: (e2) => {
    "use strict";
    e2.exports = { version: "1.0.34" };
  } }, r = {};
  function i(e2) {
    var t2 = r[e2];
    if (void 0 !== t2) return t2.exports;
    var n = r[e2] = { exports: {} };
    return s[e2].call(n.exports, n, n.exports, i), n.exports;
  }
  return i.n = (e2) => {
    var t2 = e2 && e2.__esModule ? () => e2.default : () => e2;
    return i.d(t2, { a: t2 }), t2;
  }, t = Object.getPrototypeOf ? (e2) => Object.getPrototypeOf(e2) : (e2) => e2.__proto__, i.t = function(s2, r2) {
    if (1 & r2 && (s2 = this(s2)), 8 & r2) return s2;
    if ("object" == typeof s2 && s2) {
      if (4 & r2 && s2.__esModule) return s2;
      if (16 & r2 && "function" == typeof s2.then) return s2;
    }
    var n = /* @__PURE__ */ Object.create(null);
    i.r(n);
    var o = {};
    e = e || [null, t({}), t([]), t(t)];
    for (var a = 2 & r2 && s2; "object" == typeof a && !~e.indexOf(a); a = t(a)) Object.getOwnPropertyNames(a).forEach(((e2) => o[e2] = () => s2[e2]));
    return o.default = () => s2, i.d(n, o), n;
  }, i.d = (e2, t2) => {
    for (var s2 in t2) i.o(t2, s2) && !i.o(e2, s2) && Object.defineProperty(e2, s2, { enumerable: true, get: t2[s2] });
  }, i.g = (function() {
    if ("object" == typeof globalThis) return globalThis;
    try {
      return this || new Function("return this")();
    } catch (e2) {
      if ("object" == typeof window) return window;
    }
  })(), i.o = (e2, t2) => Object.prototype.hasOwnProperty.call(e2, t2), i.r = (e2) => {
    "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(e2, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(e2, "__esModule", { value: true });
  }, i(341);
})()));
