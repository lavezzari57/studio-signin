/* =========================================================================
   SHARED NAME DROPDOWN — "type your name once, it's there every time."
   -------------------------------------------------------------------------
   Drop this on any sheet (after config.js). Nothing else to wire up:
     • It watches the name boxes (#f-first / #f-last, or the studio's single
       #f-name) and shows a dropdown of members who have signed in before.
       Tap a name and both boxes fill in.
     • Every time someone signs in on ANY sheet, their name is saved to the
       shared `members` table, so it shows up on every other sheet too.
     • In staff mode each name gets a ✕ so you can clear out typos.
   ========================================================================= */
window.TTCNames = (function () {
  if (!window.TTC) return {};
  const TABLE = "members";
  const CACHE_KEY = "ttc-roster";
  const MAX = 6;
  const NAME_IDS = ["f-first", "f-last", "f-name"];

  let roster = [];
  try { roster = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]") || []; } catch (e) { roster = []; }

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const norm = s => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();
  const title = s => String(s || "").trim().replace(/\s+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const full = m => (m.first_name + " " + (m.last_name || "")).trim();

  async function load() {
    try {
      roster = await TTC.select(TABLE, "select=id,first_name,last_name,last_seen&order=last_seen.desc&limit=2000");
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(roster)); } catch (e) {}
    } catch (e) { /* offline: keep the cached list */ }
  }

  /* Save a name to the roster (or bump its last-seen if it's already there). */
  async function remember(first, last) {
    first = title(first); last = title(last);
    if (!first) return;
    try {
      await realFetch(TTC.rest(TABLE) + "?on_conflict=name_key", {
        method: "POST",
        headers: TTC.headers({ "Prefer": "resolution=merge-duplicates,return=minimal" }),
        body: JSON.stringify({ first_name: first, last_name: last, last_seen: new Date().toISOString() })
      });
      load();
    } catch (e) {}
  }

  /* Catch every sign-in on every sheet without touching each sheet's code:
     when a row is saved to a sign-in table, remember the name on it. */
  const realFetch = window.fetch.bind(window);
  window.fetch = async function (url, opts) {
    const res = await realFetch(url, opts);
    try {
      const u = String(url && url.url ? url.url : url);
      const isPost = opts && String(opts.method || "").toUpperCase() === "POST";
      if (isPost && res.ok && u.startsWith(TTC.SUPABASE_URL + "/rest/v1/") && !u.includes("/rest/v1/" + TABLE) && typeof opts.body === "string") {
        const b = JSON.parse(opts.body);
        if (b && b.first_name) remember(b.first_name, b.last_name || "");
        else if (b && typeof b.name === "string" && "time_in" in b) {
          const parts = b.name.trim().split(/\s+/);
          remember(parts[0], parts.slice(1).join(" "));
        }
      }
    } catch (e) {}
    return res;
  };

  /* ---------------- the dropdown ---------------- */
  const css = document.createElement("style");
  css.textContent =
    ".ttc-names{position:absolute;z-index:40;background:var(--paper);border:var(--b);border-radius:var(--radius-sm);box-shadow:var(--shadow-sticker);overflow:hidden;display:none;max-width:calc(100vw - 24px)}" +
    ".ttc-names.open{display:block}" +
    ".ttc-names .cap{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding:8px 14px 4px}" +
    ".ttc-names .row{display:flex;align-items:stretch;border-top:1px solid var(--line)}" +
    ".ttc-names .row:first-of-type{border-top:0}" +
    ".ttc-names .pick{flex:1;font:inherit;font-weight:700;text-align:left;min-height:52px;padding:10px 14px;background:none;border:0;color:var(--ink);cursor:pointer}" +
    ".ttc-names .pick:hover,.ttc-names .pick:active{background:color-mix(in srgb,var(--ac) 22%,var(--paper))}" +
    ".ttc-names .rm{font:inherit;font-weight:800;width:52px;background:none;border:0;border-left:1px solid var(--line);color:var(--bad);cursor:pointer}";
  document.head.appendChild(css);

  const box = document.createElement("div");
  box.className = "ttc-names";
  document.addEventListener("DOMContentLoaded", () => document.body.appendChild(box));
  if (document.body) document.body.appendChild(box);

  let anchor = null;

  function matches(input) {
    const id = input.id, q = norm(input.value);
    let list = roster;
    if (id === "f-last") {
      const first = norm((document.getElementById("f-first") || {}).value);
      if (first) list = list.filter(m => norm(m.first_name).startsWith(first));
      if (q) list = list.filter(m => norm(m.last_name).startsWith(q));
    } else if (q) {
      list = list.filter(m => norm(full(m)).startsWith(q) || norm(m.first_name).startsWith(q) || norm(m.last_name).startsWith(q));
    }
    return list.slice(0, MAX);
  }

  function alreadyFilled(m) {
    const single = document.getElementById("f-name");
    if (single) return norm(single.value) === norm(full(m));
    const f = document.getElementById("f-first"), l = document.getElementById("f-last");
    return f && l && norm(f.value) === norm(m.first_name) && norm(l.value) === norm(m.last_name);
  }

  function show(input) {
    anchor = input;
    const list = matches(input);
    if (!list.length || (list.length === 1 && alreadyFilled(list[0]))) { hide(); return; }
    const staff = TTC.isStaff();
    box.innerHTML = '<div class="cap">been here before? tap your name</div>' + list.map(m =>
      '<div class="row"><button type="button" class="pick" data-id="' + esc(m.id) + '">' + esc(full(m)) + '</button>' +
      (staff ? '<button type="button" class="rm" data-rm="' + esc(m.id) + '" title="Remove from the name list" aria-label="Remove ' + esc(full(m)) + ' from the name list">✕</button>' : '') +
      '</div>').join("");
    const r = input.getBoundingClientRect();
    box.style.left = Math.max(12, r.left + window.scrollX) + "px";
    box.style.top = (r.bottom + window.scrollY + 8) + "px";
    box.style.minWidth = Math.max(240, r.width) + "px";
    box.classList.add("open");
  }
  function hide() { box.classList.remove("open"); anchor = null; }

  function setVal(el, v) {
    if (!el) return;
    el.value = v;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  function pick(m) {
    const single = document.getElementById("f-name");
    if (single) setVal(single, full(m));
    else { setVal(document.getElementById("f-first"), m.first_name); setVal(document.getElementById("f-last"), m.last_name || ""); }
    hide();
    if (document.activeElement && NAME_IDS.includes(document.activeElement.id)) document.activeElement.blur();
  }

  // pointerdown (not click) so the tap lands before the input loses focus
  box.addEventListener("pointerdown", async e => {
    const p = e.target.closest("[data-id]"), rm = e.target.closest("[data-rm]");
    if (!p && !rm) return;
    e.preventDefault();
    if (p) { const m = roster.find(x => x.id === p.dataset.id); if (m) pick(m); return; }
    if (rm && TTC.isStaff()) {
      const id = rm.dataset.rm, keep = anchor;
      try {
        await TTC.remove(TABLE, id);
        roster = roster.filter(x => x.id !== id);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(roster)); } catch (err) {}
        TTC.toast("Removed from the name list.");
        if (keep && document.contains(keep)) show(keep); else hide();
      } catch (err) { TTC.toast("Couldn't remove it."); }
    }
  });

  const isNameBox = t => t && t.tagName === "INPUT" && NAME_IDS.includes(t.id);
  document.addEventListener("focusin", e => { if (isNameBox(e.target)) show(e.target); });
  document.addEventListener("input", e => { if (isNameBox(e.target) && e.isTrusted) show(e.target); });
  document.addEventListener("focusout", e => { if (isNameBox(e.target)) setTimeout(() => { if (!isNameBox(document.activeElement)) hide(); }, 120); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") hide(); });
  window.addEventListener("resize", () => { if (anchor && document.contains(anchor)) show(anchor); else hide(); });

  load();
  setInterval(load, 60000);

  return { remember, reload: load, list: () => roster.slice() };
})();
