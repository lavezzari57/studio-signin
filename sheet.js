/* =========================================================================
   SHARED PROGRAM-SHEET ENGINE
   -------------------------------------------------------------------------
   One engine, many sheets. A program's file is just its colors plus one
   TTCSheet.mount({...}) call that lists its questions. To change what a
   sheet asks, edit the `fields` list in THAT sheet's file — never here.

   mount({
     title:    "Open Mic",                  // top bar
     table:    "openmic_visits",            // its Supabase table
     eyebrow:  "Kings Highway · ...",       // small caps line
     headline: ["Sign in to", "open mic"],  // second part gets the sticker box
     hereLabel:"in the room right now",
     listTitle:"Signed in today",
     toast:    "Signed in. Break a leg.",
     fields: [
       { key:"role", label:"...", type:"choice", options:[...] },   // pick one
       { key:"acts", label:"...", type:"chips",  options:[...] },   // pick many
       { key:"name", label:"...", type:"text",   placeholder:"" },  // one line
       { key:"more", label:"...", type:"longtext" },                // a few lines
       // optional on any field:
       //   showIf: v => v.role === "Performing"   (only ask when it applies)
       //   hint:   "small helper line under the question"
       //   required: true                          (must answer to sign in)
       //   list: false                             (leave out of today's table)
     ],
     staffToggles: [ { key:"helped_others", label:"Helped others" } ], // staff-only taps on a row
     program: "openmic"   // turns on A&P milestone marking (must match a program in milestones.js)
   })

   Column types in the table:  choice/text/longtext → text,  chips → text[],
   staffToggles → boolean.
   ========================================================================= */
window.TTCSheet = (function () {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const pad = n => String(n).padStart(2, "0");
  const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const pretty = hm => { if (!hm) return ""; let [h, m] = hm.split(":").map(Number); const ap = h >= 12 ? "pm" : "am"; h = h % 12 || 12; return `${h}:${pad(m)} ${ap}`; };
  const titleName = s => String(s || "").trim().replace(/\s+/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  function mount(cfg) {
    const TABLE = cfg.table;
    const FIELDS = cfg.fields || [];
    const TOGGLES = cfg.staffToggles || [];
    const app = document.getElementById("app");
    const isStaff = () => TTC.isStaff();
    const MS = (cfg.program && window.TTCMilestones && TTCMilestones.has(cfg.program)) ? TTCMilestones : null;

    document.title = cfg.title + " — Sign In";
    TTCBar.mount(cfg.title);

    let today = [], online = false, busy = false;
    const blank = () => { const v = {}; FIELDS.forEach(f => { v[f.key] = f.type === "chips" ? [] : ""; }); return v; };
    const draft = { first: "", last: "", timeIn: "", v: blank() };

    const shown = f => !f.showIf || !!f.showIf(draft.v);
    const answered = f => f.type === "chips" ? draft.v[f.key].length > 0 : !!String(draft.v[f.key] || "").trim();
    const ready = () => !!draft.first.trim() && !!draft.last.trim() && !busy && FIELDS.every(f => !f.required || !shown(f) || answered(f));

    function fieldHtml(f) {
      if (!shown(f)) return "";
      const hint = f.hint ? `<span class="hint">${esc(f.hint)}</span>` : "";
      const val = draft.v[f.key];
      if (f.type === "chips" || f.type === "choice") {
        const on = o => f.type === "chips" ? val.includes(o) : val === o;
        return `<div class="field"><span class="fl" id="l-${esc(f.key)}">${esc(f.label)}</span>
          <div class="chips" role="group" aria-labelledby="l-${esc(f.key)}">${f.options.map(o => `<button type="button" class="chip" data-k="${esc(f.key)}" data-o="${esc(o)}" aria-pressed="${on(o)}">${esc(o)}</button>`).join("")}</div>${hint}</div>`;
      }
      if (f.type === "longtext")
        return `<div class="field"><label for="x-${esc(f.key)}">${esc(f.label)}</label><textarea id="x-${esc(f.key)}" data-t="${esc(f.key)}" rows="2" placeholder="${esc(f.placeholder || "")}">${esc(val)}</textarea>${hint}</div>`;
      return `<div class="field"><label for="x-${esc(f.key)}">${esc(f.label)}</label><input type="text" id="x-${esc(f.key)}" data-t="${esc(f.key)}" autocomplete="off" placeholder="${esc(f.placeholder || "")}" value="${esc(val)}">${hint}</div>`;
    }

    const summary = row => FIELDS.filter(f => f.list !== false).map(f => {
      const x = row[f.key];
      return Array.isArray(x) ? x.join(", ") : (x || "");
    }).filter(Boolean).map(esc).join(" · ");

    function render() {
      const here = today.filter(r => !r.time_out).length;
      const [h1, h2] = cfg.headline || ["Sign in to", cfg.title.toLowerCase()];
      const rows = today.slice().sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
      const staff = isStaff();
      app.innerHTML = `
        <div class="lead">
          <span class="mono">${esc(cfg.eyebrow || "Kings Highway · Teen Tech Center")}</span>
          <h2>${esc(h1)} <em>${esc(h2)}</em></h2>
          <span class="here"><b>${here}</b> ${esc(cfg.hereLabel || "signed in right now")}</span>
        </div>
        <section class="card form">
          <div class="names">
            <div class="field"><label for="f-first">first name</label><input type="text" id="f-first" autocomplete="off" autocapitalize="words" placeholder="first" value="${esc(draft.first)}"></div>
            <div class="field"><label for="f-last">last name</label><input type="text" id="f-last" autocomplete="off" autocapitalize="words" placeholder="last" value="${esc(draft.last)}"></div>
          </div>
          ${FIELDS.map(fieldHtml).join("")}
          <div class="field"><label for="f-in">time in</label><input type="time" id="f-in" value="${esc(draft.timeIn || nowHM())}"></div>
          <button class="ttc-btn ttc-btn-primary go" id="goBtn" ${ready() ? "" : "disabled"}>Sign in</button>
        </section>
        <div class="sheet"><h3>${esc(cfg.listTitle || "Signed in today")}</h3>
          <div class="tablewrap"><table><thead><tr><th style="width:30%">name</th><th>details</th><th>in</th><th>out</th></tr></thead><tbody>
          ${rows.length ? rows.map(r => `<tr>
              <td class="nm">${esc(r.first_name)} ${esc(r.last_name)}${staff ? ` <button class="del" data-del="${esc(r.id)}">remove</button>` : ""}</td>
              <td>${summary(r)}${staff && (TOGGLES.length || MS) ? `<div>${MS ? MS.rowButton(cfg.program, r) : ""}${TOGGLES.map(t => `<button class="tog" data-tog="${esc(t.key)}" data-row="${esc(r.id)}" aria-pressed="${!!r[t.key]}">${r[t.key] ? "✓ " : ""}${esc(t.label)}</button>`).join("")}</div>` : ""}</td>
              <td>${pretty(r.time_in)}</td>
              <td>${r.time_out ? pretty(r.time_out) : (staff ? `<button class="del" data-out="${esc(r.id)}">sign out</button>` : "—")}</td>
            </tr>`).join("") : `<tr class="muted-row"><td colspan="4">Nobody signed in yet today.</td></tr>`}
          </tbody></table></div>
          ${staff && MS ? MS.suggestCard(cfg.program, rows) : ""}
          ${staff ? `<div class="stafftools"><button class="ttc-btn" id="exportBtn">Export all sign-ins (CSV)</button></div>` : ""}
        </div>
        <p class="status ${online ? "" : "bad"}" id="status">${online ? "Live — synced." : "Connecting…"}</p>`;
      wire();
    }

    function tg() { const go = document.getElementById("goBtn"); if (go) go.disabled = !ready(); }

    function wire() {
      const on = (id, fn) => { const el = document.getElementById(id); if (el) el.oninput = fn; };
      on("f-first", e => { draft.first = e.target.value; tg(); });
      on("f-last", e => { draft.last = e.target.value; tg(); });
      on("f-in", e => { draft.timeIn = e.target.value; });
      app.querySelectorAll("[data-t]").forEach(el => el.oninput = e => { draft.v[el.dataset.t] = e.target.value; tg(); });
      app.querySelectorAll(".chip").forEach(c => c.onclick = () => {
        const f = FIELDS.find(x => x.key === c.dataset.k), o = c.dataset.o;
        if (f.type === "chips") { const a = draft.v[f.key], i = a.indexOf(o); i < 0 ? a.push(o) : a.splice(i, 1); }
        else draft.v[f.key] = draft.v[f.key] === o ? "" : o;
        render();   // a choice can reveal or hide follow-up questions
      });
      const go = document.getElementById("goBtn"); if (go) go.onclick = submit;
      app.querySelectorAll("[data-del]").forEach(b => b.onclick = () => removeRow(b.dataset.del));
      app.querySelectorAll("[data-out]").forEach(b => b.onclick = () => signOut(b.dataset.out));
      app.querySelectorAll("[data-tog]").forEach(b => b.onclick = () => toggle(b.dataset.row, b.dataset.tog));
      const ex = document.getElementById("exportBtn"); if (ex) ex.onclick = exportCsv;
      if (MS && isStaff()) MS.wire(app, cfg.program, today, render);
    }

    async function submit() {
      if (!ready()) return;
      const first = titleName(draft.first), last = titleName(draft.last);
      if (today.some(r => !r.time_out && r.first_name.toLowerCase() === first.toLowerCase() && r.last_name.toLowerCase() === last.toLowerCase())) {
        TTC.toast(`${first}, you're already signed in.`); return;
      }
      busy = true; tg();
      try {
        const row = { first_name: first, last_name: last, date: dateKey(), time_in: draft.timeIn || nowHM() };
        FIELDS.forEach(f => {
          const on = shown(f);
          row[f.key] = f.type === "chips" ? (on ? draft.v[f.key].slice() : []) : ((on && String(draft.v[f.key] || "").trim()) || null);
        });
        today.push(await TTC.insert(TABLE, row));
        draft.first = ""; draft.last = ""; draft.timeIn = ""; draft.v = blank();
        TTC.toast(cfg.toast || "Signed in.");
      } catch (e) { TTC.toast("Couldn't save — check the WiFi and try again."); }
      busy = false; render();
    }
    async function removeRow(id) {
      if (!isStaff()) return;
      try { await TTC.remove(TABLE, id); today = today.filter(r => r.id !== id); render(); TTC.toast("Removed."); }
      catch (e) { TTC.toast("Couldn't remove it."); }
    }
    async function signOut(id) {
      if (!isStaff()) return;
      const tm = nowHM();
      try { await TTC.update(TABLE, id, { time_out: tm, signed_out_at: new Date().toISOString() }); const r = today.find(x => x.id === id); if (r) r.time_out = tm; render(); TTC.toast("Signed out."); }
      catch (e) { TTC.toast("Couldn't sign out."); }
    }
    async function toggle(id, key) {
      if (!isStaff()) return;
      const r = today.find(x => x.id === id); if (!r) return;
      const next = !r[key];
      try { await TTC.update(TABLE, id, { [key]: next }); r[key] = next; render(); }
      catch (e) { TTC.toast("Couldn't save that."); }
    }

    async function exportCsv() {
      if (!isStaff()) return;
      try {
        const rows = await TTC.select(TABLE, "order=date.asc,time_in.asc&limit=10000");
        const cols = ["date", "first_name", "last_name", "time_in", "time_out", ...FIELDS.map(f => f.key), ...TOGGLES.map(t => t.key)];
        const cell = x => { const s = Array.isArray(x) ? x.join("; ") : (x === null || x === undefined ? "" : String(x)); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
        const csv = [cols.join(","), ...rows.map(r => cols.map(c => cell(r[c])).join(","))].join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = `${TABLE}_${dateKey()}.csv`;
        document.body.appendChild(a); a.click(); a.remove();
        TTC.toast(`Exported ${rows.length} sign-in${rows.length === 1 ? "" : "s"}.`);
      } catch (e) { TTC.toast("Couldn't export — check the WiFi."); }
    }

    async function refresh() {
      try {
        today = await TTC.select(TABLE, `date=eq.${dateKey()}&order=created_at.asc`);
        if (MS) { try { await MS.loadDay(cfg.program, dateKey()); } catch (e) {} }
        online = true;
        if (!document.querySelector(".ttc-scrim")) render();
      } catch (e) {
        online = false;
        const s = document.getElementById("status");
        if (s) { s.textContent = "Can't reach the list — check the WiFi."; s.className = "status bad"; }
      }
    }

    TTCBar.onStaffChange(() => render());
    render(); refresh();
    setInterval(() => {
      const a = document.activeElement;
      const typing = a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA");
      if (!typing && !document.querySelector(".ttc-scrim")) refresh();
    }, 8000);
  }

  return { mount };
})();
