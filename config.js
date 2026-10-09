/* =========================================================================
   KINGS HIGHWAY TTC — SHARED CONFIG + STAFF SESSION
   -------------------------------------------------------------------------
   One place for the backend connection and the staff code. Every sheet
   loads this file, so you change the Supabase project or the staff PIN
   HERE and nowhere else.

   The staff session is shared across every sheet on this device: enter the
   code once on any sheet, and staff mode stays unlocked for 10 minutes on
   ALL sheets (studio, ftc, calendar...). That's what lets you walk around
   with one iPad and sign kids into any sheet without re-entering the code.
   ========================================================================= */
window.TTC = (function () {

  /* ---- Supabase (the ONE project — publishable key, safe in the page) ---- */
  const SUPABASE_URL = "https://ieieslzgxmdmflykuafl.supabase.co";
  const SUPABASE_KEY = "sb_publishable_lHWcaI3grlK7S3XDESF9JA_QOLFfUg7";

  /* ---- Staff code. Change it here; takes effect on every sheet. ---- */
  const STAFF_PIN = "2115";
  const STAFF_MINUTES = 10;           // how long staff mode stays unlocked

  /* ---- The programs list. THIS is how you add a new sheet. ----
     To bring in a sheet you vibe-coded in another chat:
       1. Drop its file in this same folder (e.g. podcasting.html)
       2. Add one line to this array.
     Order here = order of the tiles on the home screen.
     `file:null` makes a "coming soon" tile (no page yet).                */
  const PROGRAMS = [
    { id:"studio",      name:"Music Studio",   file:"studio.html",   color:"var(--lav)",  emoji:"🎙️", blurb:"Song + music video sign-in" },
    { id:"mixdesk",     name:"Vocal Mix Desk", file:"mixdesk.html",  color:"var(--sky)",  emoji:"🎚️", blurb:"Vocal mixing, step by step", guide:true },
    { id:"ftc",         name:"FTC Robotics",   file:"ftc.html",      color:"var(--mint)", emoji:"🤖", blurb:"Robotics team sign-in" },
    { id:"calendar",    name:"Program Calendar", file:"calendar.html", color:"var(--yel)", emoji:"🗓️", blurb:"What's on, and when" },
    { id:"podcasting",  name:"Podcasting",     file:"podcasting.html", color:"var(--lav)",  emoji:"🎧", blurb:"Podcast booth sign-in" },
    { id:"printer",     name:"3D Printer",     file:"printer.html",    color:"var(--sal)",  emoji:"🖨️", blurb:"Maker bench sign-in" },
    { id:"art",         name:"Art Studio",     file:"art.html",        color:"var(--ac)",   emoji:"🎨", blurb:"Art studio sign-in" },
    /* ---- programs (each one is a small file built on sheet.js) ---- */
    { id:"youthcouncil", name:"Youth Council", file:"youthcouncil.html", color:"var(--sal)",  emoji:"🗳️", blurb:"Council meeting sign-in" },
    { id:"musicvideo",  name:"Music Video",    file:"musicvideo.html", color:"var(--mint)", emoji:"🎬", blurb:"Tuesday music video program" },
    { id:"openmic",     name:"Open Mic",       file:"openmic.html",    color:"var(--ac)",   emoji:"🎤", blurb:"Performers, hosts, and supporters" },
    { id:"peerpanel",   name:"Career Panel",   file:"peerpanel.html",  color:"var(--lav)",  emoji:"🪑", blurb:"Peer-to-peer career panel" },
    { id:"askajob",     name:"Ask a Job",      file:"askajob.html",    color:"var(--yel)",  emoji:"💬", blurb:"Talk to someone about their job" },
    { id:"linkedin",    name:"LinkedIn Workshop", file:"linkedin.html", color:"var(--sky)", emoji:"💼", blurb:"Profile workshop (16+)" },
    { id:"vibecoding",  name:"Vibe Coding",    file:"vibecoding.html", color:"var(--mint)", emoji:"💻", blurb:"Build your own tool or app" },
  ];

  /* =======================================================================
     Below here is machinery. You normally won't touch it.
     ======================================================================= */

  const STAFF_UNTIL_KEY = "ttc-staff-until";

  // ---- staff session (shared across sheets via localStorage) ----
  function staffUntil() {
    try { return parseInt(localStorage.getItem(STAFF_UNTIL_KEY) || "0", 10) || 0; }
    catch (e) { return 0; }
  }
  function isStaff() { return Date.now() < staffUntil(); }
  function unlockStaff() {
    const until = Date.now() + STAFF_MINUTES * 60 * 1000;
    try { localStorage.setItem(STAFF_UNTIL_KEY, String(until)); } catch (e) {}
    return until;
  }
  function lockStaff() {
    try { localStorage.removeItem(STAFF_UNTIL_KEY); } catch (e) {}
  }
  function checkPin(pin) { return String(pin) === String(STAFF_PIN); }

  // ---- Supabase REST helper. Each sheet says which table it uses. ----
  function headers(extra) {
    return Object.assign({
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
      "Content-Type": "application/json"
    }, extra || {});
  }
  function rest(table) { return SUPABASE_URL + "/rest/v1/" + table; }

  async function select(table, query) {
    const url = rest(table) + (query ? "?" + query : "");
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) throw new Error("select failed " + res.status);
    return res.json();
  }
  async function insert(table, row) {
    const res = await fetch(rest(table), {
      method: "POST", headers: headers({ "Prefer": "return=representation" }),
      body: JSON.stringify(row)
    });
    if (!res.ok) throw new Error("insert failed " + res.status);
    return (await res.json())[0];
  }
  async function update(table, id, patch) {
    const res = await fetch(rest(table) + "?id=eq." + id, {
      method: "PATCH", headers: headers({ "Prefer": "return=minimal" }),
      body: JSON.stringify(patch)
    });
    if (!res.ok) throw new Error("update failed " + res.status);
  }
  async function remove(table, id) {
    const res = await fetch(rest(table) + "?id=eq." + id, { method: "DELETE", headers: headers() });
    if (!res.ok) throw new Error("delete failed " + res.status);
  }

  // ---- tiny shared UI helpers every sheet can use ----
  function toast(msg) {
    let t = document.querySelector(".ttc-toast");
    if (!t) { t = document.createElement("div"); t.className = "ttc-toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2600);
  }

  return {
    SUPABASE_URL, SUPABASE_KEY, STAFF_MINUTES, PROGRAMS,
    isStaff, unlockStaff, lockStaff, checkPin, staffUntil,
    select, insert, update, remove, rest, headers, toast
  };
})();
