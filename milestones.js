/* =========================================================================
   A&P MILESTONES (Tier 2)
   -------------------------------------------------------------------------
   The Clubhouse Network A&P report asks how many youth hit each milestone
   at least once in a reporting period. Two sets:
     Social / Communication / Leadership:  Team Member → Presenter → Mentor → Community Leader
     Technical Skill / Project-Making:     Apprentice → Creator → Refiner → Integrator

   HOW A MILESTONE GETS CREDITED
     • CONFIRMED: a staff member opens "milestones" on a sign-in row and taps
       the behavior they saw.
     • FROM SIGN-IN DATA ("inferred"): the sheet SUGGESTS a milestone from
       what the sign-in says (performed at open mic, was here with a group).
       It is only a suggestion. Nothing is ever credited until staff tap
       Credit, and the report keeps these counts separate from confirmed ones.
       Being in the room together is a hint that kids collaborated, not proof.

   EDIT THE WORDING HERE. Each program's lines below say what that milestone
   looks like in that program (from the curriculums). `null` = not tracked.
   ========================================================================= */
window.TTCMilestones = (function () {
  if (!window.TTC) return {};
  const TABLE = "milestones";
  const SOCIAL = ["Team Member", "Presenter", "Mentor", "Community Leader"];
  const TECHNICAL = ["Apprentice", "Creator", "Refiner", "Integrator"];
  const TRACK_OF = {}; SOCIAL.forEach(m => TRACK_OF[m] = "social"); TECHNICAL.forEach(m => TRACK_OF[m] = "technical");

  /* How many people need to be signed in at the same time before the sheet
     suggests "Team Member" for being there together. */
  const MIN_TOGETHER = 3;

  const PROGRAMS = {
    openmic: { name: "Open Mic", table: "openmic_visits", criteria: {
      "Team Member": "Helps another teen prep, or stays to support others after their slot",
      "Presenter": "Performs (every act counts)",
      "Mentor": "Coaches a first-timer through setup, breakdown, or scheduling",
      "Community Leader": "Hosts and promotes the night",
      "Apprentice": "Signs up, attends, and performs (covers count)",
      "Creator": "Performs an original piece (own poem, own beat)",
      "Refiner": "Returns having rehearsed, revised, or reworked a piece",
      "Integrator": "Combines elements (guitar + backing track + live drums, films the set, uses the screen)" } },
    musicvideo: { name: "Music Video", table: "musicvideo_visits", criteria: {
      "Team Member": "Works with others, compromises, works through conflict",
      "Presenter": "Shares and explains finished work to the group",
      "Mentor": "Leads a session or teaches a skill, taking a whole session off staff",
      "Community Leader": "Makes something addressing a social issue",
      "Apprentice": "Completes the Session 1 guided linear edit",
      "Creator": "Original video project beyond the guided edit",
      "Refiner": "Adjusts and improves after critique",
      "Integrator": "Combines tools and skills (makes a song, then edits a video for it; advanced VFX)" } },
    ftc: { name: "FTC Robotics", table: "ftc_visits", criteria: {
      "Team Member": "Adaptable, helps any section (logistics, parts, input to coders, lead communicator)",
      "Presenter": "Contributes to the engineering notebook (parts, decisions, reasoning)",
      "Mentor": null,   // N/A: no returning kids year to year
      "Community Leader": "Uses the notebook to showcase the year, recruits or encourages others to join",
      "Apprentice": "Starting out, learning fast, keeping things on par",
      "Creator": "Leads the robot design",
      "Refiner": "Gives feedback to builders and coders, keeps comms clear",
      "Integrator": "Pulls builder + coder + leader skills into one, makes the whole team better" } },
    youthcouncil: { name: "Youth Council", table: "youthcouncil_visits", criteria: {
      "Team Member": "Joins the council",
      "Presenter": "Brings up a point or shares something learned",
      "Mentor": "Helps others, or takes a delegated mentorship or leadership task",
      "Community Leader": "Puts something on the agenda, or mobilizes the council around a cause",
      "Apprentice": "Basic participation (first suggestion via the box or QR)",
      "Creator": "Proposes a new program or idea",
      "Refiner": "Revises a proposal after group feedback",
      "Integrator": "Combines several people's input into one plan, or owns the ops side (spreadsheets, attendance, suggestion box)" } },
    vibecoding: { name: "Vibe Coding", table: "vibecoding_visits", criteria: {
      "Team Member": "Works with others, compromises",
      "Presenter": "Shares and explains a finished build",
      "Mentor": "Leads a session or teaches",
      "Community Leader": "Builds something addressing a social issue",
      "Apprentice": "Follows the guided TV lesson with AI tools",
      "Creator": "Original tool or app beyond the lesson (budget tracker, planner)",
      "Refiner": "Improves after testing or feedback",
      "Integrator": "Combines features into one workflow tool" } },
    peerpanel: { name: "Career Panel", table: "peerpanel_visits", criteria: {
      "Team Member": "Audience member who engages, asks thoughtful questions, supports the flow",
      "Presenter": "The working teen leading the panel",
      "Mentor": "Past presenter returns to help a newer one shape their panel",
      "Community Leader": "Recruits other working teens for a future panel",
      "Apprentice": "First-time presenter in the basic format",
      "Creator": "Designs their own panel structure or content",
      "Refiner": "Adjusts their approach after running it once",
      "Integrator": "Combines story + visuals + open Q&A into one cohesive session" } },
  };

  /* Suggestions straight from what a sign-in says. Each returns
     [milestone, reason]. Keep these conservative: they are hints for staff. */
  const HINTS = {
    openmic: r => [
      r.role === "Performing" && ["Presenter", "signed in as performing"],
      r.role === "Performing" && ["Apprentice", "signed in as performing"],
      r.role === "Performing" && (r.originality === "Original" || r.originality === "Both") && ["Creator", "performing an original piece"],
      r.role === "Hosting" && ["Community Leader", "signed in as host"],
    ],
    musicvideo: r => [(r.stage || []).includes("Guided") && ["Apprentice", "did the guided segment"]],
    ftc: r => [(r.worked_on || []).includes("Engineering notebook") && ["Presenter", "worked on the engineering notebook"]],
    youthcouncil: r => [["Team Member", "joined the council"]],
    vibecoding: r => [r.stage === "Watching demo" && ["Apprentice", "followed the demo lesson"]],
    peerpanel: r => [r.role === "Presenter" && ["Presenter", "signed in as presenter"]],
  };

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const key = (f, l) => (String(f || "") + " " + String(l || "")).trim().toLowerCase();
  const pad = n => String(n).padStart(2, "0");
  const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const has = p => !!PROGRAMS[p];

  /* who is marking (one shared staff code, so we ask for a name once per device) */
  const WHO_KEY = "ttc-staff-name";
  const who = () => { try { return localStorage.getItem(WHO_KEY) || ""; } catch (e) { return ""; } };
  const setWho = v => { try { localStorage.setItem(WHO_KEY, v); } catch (e) {} };

  /* ask for the staff member's name if this device doesn't have one yet */
  function needWho(then) {
    if (who()) return then();
    TTCBar.modal(
      `<h2 style="font-family:var(--display);font-weight:800;margin:0 0 6px">Who's marking?</h2>
       <p style="margin:0 0 10px;color:var(--muted);font-size:15px">Your name goes on the record next to each milestone. This device will remember it.</p>
       <label class="ms-who"><span class="mono">marked by</span><input type="text" id="ms-who" autocomplete="off" placeholder="your name"></label>
       <div style="display:flex;gap:10px"><button class="ttc-btn" data-close style="flex:1">Cancel</button><button class="ttc-btn ttc-btn-primary" id="ms-who-ok" style="flex:1">Continue</button></div>`,
      () => {
        const w = document.getElementById("ms-who"); w.focus();
        const go = () => { const v = w.value.trim(); if (!v) { w.focus(); return; } setWho(v); TTCBar.closeModal(); then(); };
        document.getElementById("ms-who-ok").onclick = go; w.onkeydown = e => { if (e.key === "Enter") go(); };
      });
  }

  /* today's marks for one program, kept fresh by the sheet's own refresh */
  const day = {};   // program -> rows
  async function loadDay(program, date) {
    day[program] = await TTC.select(TABLE, `program=eq.${program}&date=eq.${date || dateKey()}`);
    return day[program];
  }
  const marksFor = (program, row) => (day[program] || []).filter(m => m.name_key === key(row.first_name, row.last_name));

  async function credit(program, row, milestone, source, reason) {
    const saved = await TTC.insert(TABLE, {
      first_name: row.first_name, last_name: row.last_name || "", program, track: TRACK_OF[milestone], milestone,
      date: row.date || dateKey(), source, reason: reason || null, confirmed_by: who() || null, visit_id: row.id || null
    });
    (day[program] = day[program] || []).push(saved);
    return saved;
  }
  /* staff saw it themselves: turn a sign-in suggestion into a confirmed mark */
  async function confirmMark(mark) {
    await TTC.update(TABLE, mark.id, { source: "confirmed", confirmed_by: who() || null });
    mark.source = "confirmed"; mark.confirmed_by = who() || null;
  }
  async function uncredit(program, mark) {
    await TTC.remove(TABLE, mark.id);
    day[program] = (day[program] || []).filter(m => m.id !== mark.id);
  }

  /* ---------- suggestions (never credited automatically) ---------- */
  const mins = hm => { if (!hm) return null; const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
  function togetherCount(row, rows) {
    const a0 = mins(row.time_in), a1 = mins(row.time_out) ?? 1e9;
    if (a0 === null) return 0;
    return rows.filter(o => { if (o.id === row.id) return false; const b0 = mins(o.time_in), b1 = mins(o.time_out) ?? 1e9; return b0 !== null && a0 <= b1 && b0 <= a1; }).length + 1;
  }
  function suggestions(program, rows) {
    if (!has(program)) return [];
    const out = [], seen = new Set();
    rows.forEach(row => {
      const have = new Set(marksFor(program, row).map(m => m.milestone));
      const list = (HINTS[program] ? HINTS[program](row) : []).filter(Boolean);
      const n = togetherCount(row, rows);
      if (n >= MIN_TOGETHER && !list.some(x => x[0] === "Team Member")) list.push(["Team Member", `here with ${n - 1} others`]);
      list.forEach(([m, why]) => {
        const id = key(row.first_name, row.last_name) + "|" + m;
        if (!PROGRAMS[program].criteria[m] || have.has(m) || seen.has(id)) return;
        seen.add(id); out.push({ row, milestone: m, reason: why });
      });
    });
    return out;
  }

  /* ---------- pieces a sheet drops into its page (staff mode only) ---------- */
  function rowButton(program, row) {
    if (!has(program)) return "";
    const n = marksFor(program, row).length;
    return `<button class="tog ms-open" data-ms-row="${esc(row.id)}" aria-label="Milestones for ${esc(row.first_name)} ${esc(row.last_name)}">★ milestones${n ? " · " + n : ""}</button>`;
  }
  function suggestCard(program, rows) {
    const s = suggestions(program, rows);
    if (!s.length) return "";
    return `<div class="card ms-sug"><div class="ms-sug-head"><div><b>Suggested from today's sign-ins</b>
        <span>Only a hint. Credit it if it really happened. These are counted separately in the A&amp;P report.</span></div>
        <button class="ttc-btn" id="ms-all">Credit all ${s.length}</button></div>
      ${s.map((x, i) => `<div class="ms-sug-row"><span><b>${esc(x.row.first_name)} ${esc(x.row.last_name)}</b> · ${esc(x.milestone)} <i>(${esc(x.reason)})</i></span><button class="tog" data-ms-sug="${i}">Credit</button></div>`).join("")}</div>`;
  }
  function wire(root, program, rows, rerender) {
    if (!has(program)) return;
    root.querySelectorAll("[data-ms-row]").forEach(b => b.onclick = () => { const r = rows.find(x => String(x.id) === b.dataset.msRow); if (r) openFor(program, r, rerender); });
    const s = suggestions(program, rows);
    const take = list => needWho(async () => {
      if (!TTC.isStaff()) return;
      try { for (const x of list) await credit(program, x.row, x.milestone, "inferred", x.reason); TTC.toast(list.length === 1 ? "Credited." : `Credited ${list.length}.`); }
      catch (e) { TTC.toast("Couldn't save that — check the WiFi."); }
      rerender();
    });
    root.querySelectorAll("[data-ms-sug]").forEach(b => b.onclick = () => take([s[+b.dataset.msSug]]));
    const all = root.querySelector("#ms-all"); if (all) all.onclick = () => take(s);
  }

  /* ---------- the "mark milestones" panel for one person ---------- */
  function openFor(program, row, rerender) {
    const P = PROGRAMS[program];
    let history = [];
    const paint = () => {
      const today = marksFor(program, row);
      const col = (title, list) => `<div class="ms-col"><div class="mono">${title}</div>${list.map(m => {
        const text = P.criteria[m];
        if (!text) return `<div class="ms-item off"><b>${m}</b><span>Not tracked for ${esc(P.name)}</span></div>`;
        const mark = today.find(x => x.milestone === m);
        const before = history.filter(h => h.milestone === m && h.date !== (row.date || dateKey())).length;
        return `<button type="button" class="ms-item" data-m="${esc(m)}" aria-pressed="${!!mark}"><b>${mark ? "✓ " : ""}${m}</b><span>${esc(text)}</span>${mark && mark.source === "inferred" ? `<small>from sign-in data · tap to confirm you saw it</small>` : ""}${before ? `<small>earned ${before} time${before === 1 ? "" : "s"} before</small>` : ""}</button>`;
      }).join("")}</div>`;
      TTCBar.modal(
        `<h2 style="font-family:var(--display);font-weight:800;margin:0 0 4px">${esc(row.first_name)} ${esc(row.last_name)}</h2>
         <p style="margin:0 0 12px;color:var(--muted);font-size:15px">${esc(P.name)} · tap what you saw today. Tap a confirmed one again to undo it.</p>
         <label class="ms-who"><span class="mono">marked by</span><input type="text" id="ms-who" autocomplete="off" placeholder="your name" value="${esc(who())}"></label>
         <div class="ms-grid">${col("Social / leadership", SOCIAL)}${col("Technical / project", TECHNICAL)}</div>
         <div style="display:flex;margin-top:14px"><button class="ttc-btn ttc-btn-primary" data-close style="flex:1">Done</button></div>`,
        () => {
          const box = document.querySelector(".ttc-scrim > div"); if (box) { box.style.maxWidth = "760px"; box.style.maxHeight = "92vh"; box.style.overflowY = "auto"; }
          const w = document.getElementById("ms-who"); w.oninput = () => setWho(w.value.trim());
          document.querySelectorAll(".ms-item[data-m]").forEach(b => b.onclick = async () => {
            if (!TTC.isStaff()) { TTC.toast("Staff mode timed out. Unlock it again."); return; }
            if (!who()) { w.focus(); TTC.toast("Add your name first, so the record shows who confirmed it."); return; }
            const m = b.dataset.m, mark = marksFor(program, row).find(x => x.milestone === m);
            try {
              if (!mark) await credit(program, row, m, "confirmed", null);
              else if (mark.source === "inferred") await confirmMark(mark);
              else await uncredit(program, mark);
            }
            catch (e) { TTC.toast("Couldn't save that — check the WiFi."); }
            paint();
          });
        });
    };
    const scrimGone = new MutationObserver(() => { if (!document.querySelector(".ttc-scrim")) { scrimGone.disconnect(); rerender && rerender(); } });
    paint();
    scrimGone.observe(document.body, { childList: true });
    TTC.select(TABLE, `program=eq.${program}&name_key=eq.${encodeURIComponent(key(row.first_name, row.last_name))}&select=milestone,date`)
      .then(h => { history = h; if (document.querySelector(".ms-grid")) paint(); }).catch(() => {});
  }

  const css = document.createElement("style");
  css.textContent =
    ".tog{font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;margin:6px 6px 0 0;padding:5px 11px;border:2px solid var(--ink);border-radius:999px;background:#fff;color:var(--ink)}" +
    ".tog.ms-open{background:var(--yel)}" +
    ".ms-sug{margin-top:18px;padding:16px 18px;border-style:dashed}" +
    ".ms-sug-head{display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:8px}" +
    ".ms-sug-head b{font-family:var(--display);font-size:19px;display:block}.ms-sug-head span{font-size:14px;color:var(--muted)}" +
    ".ms-sug-head .ttc-btn{min-height:46px;font-size:15px}" +
    ".ms-sug-row{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:8px 0;border-top:1px solid var(--line);font-size:16px}" +
    ".ms-sug-row i{color:var(--muted);font-style:normal;font-size:14px}.ms-sug-row .tog{margin:0;flex:0 0 auto}" +
    ".ms-who{display:flex;flex-direction:column;gap:5px;margin-bottom:12px}.ms-who input{font:inherit;min-height:46px;padding:8px 14px;border:var(--b);border-radius:var(--radius-sm);background:#fff;color:var(--ink);max-width:260px}" +
    ".ms-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:640px){.ms-grid{grid-template-columns:1fr}}" +
    ".ms-col{display:flex;flex-direction:column;gap:8px}" +
    ".ms-item{font:inherit;text-align:left;display:flex;flex-direction:column;gap:2px;padding:10px 14px;border:var(--b);border-radius:var(--radius-sm);background:#fff;color:var(--ink);cursor:pointer;box-shadow:var(--shadow-sticker-sm)}" +
    ".ms-item b{font-family:var(--display);font-size:17px}.ms-item span{font-size:13.5px;color:var(--muted);line-height:1.3}.ms-item small{font-family:var(--mono);font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}" +
    ".ms-item[aria-pressed=true]{background:var(--mint)}.ms-item[aria-pressed=true] span,.ms-item[aria-pressed=true] small{color:var(--ink)}" +
    ".ms-item.off{box-shadow:none;border-style:dashed;opacity:.6;cursor:default}";
  document.head.appendChild(css);

  return { PROGRAMS, SOCIAL, TECHNICAL, TABLE, has, loadDay, marksFor, suggestions, rowButton, suggestCard, wire, openFor, MIN_TOGETHER };
})();
