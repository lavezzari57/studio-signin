/* =========================================================================
   SHARED TOP BAR — home button, title, staff chip.
   Drop this on any sheet and call TTCBar.mount("Sheet Title").
   The staff chip reflects the shared session: tap it to unlock (enter code)
   or lock. When unlocked it turns green on every sheet.
   onStaffChange(cb) lets a sheet re-render when staff mode flips.
   ========================================================================= */
window.TTCBar = (function () {
  const listeners = [];
  function onStaffChange(cb) { listeners.push(cb); }
  function fire() { listeners.forEach(cb => { try { cb(TTC.isStaff()); } catch (e) {} }); }

  function mount(title) {
    const bar = document.createElement("div");
    bar.className = "ttc-topbar";
    bar.innerHTML =
      '<button class="ttc-home" title="Home" aria-label="Home">⌂</button>' +
      '<h1></h1>' +
      '<button class="ttc-staff">Staff</button>';
    bar.querySelector("h1").textContent = title || "";
    document.body.insertBefore(bar, document.body.firstChild);

    bar.querySelector(".ttc-home").onclick = () => { location.href = "index.html"; };

    const chip = bar.querySelector(".ttc-staff");
    function paint() { chip.dataset.on = TTC.isStaff() ? "1" : "0"; chip.textContent = TTC.isStaff() ? "Staff ✓" : "Staff"; }
    chip.onclick = () => { TTC.isStaff() ? panel() : login(); };
    paint();

    // keep the chip honest as the 10-min window expires
    setInterval(() => { paint(); }, 5000);

    // ---- login modal ----
    function login() {
      modal(
        '<h2>Staff</h2><p>Enter the staff code to add, fix, or remove rows and to export.</p>' +
        '<input type="password" inputmode="numeric" id="ttc-pin" autocomplete="off" placeholder="code" ' +
        'style="width:100%;min-height:var(--tap);font-size:20px;text-align:center;letter-spacing:4px;border:1px solid var(--line);border-radius:var(--radius-sm);margin:4px 0 2px">' +
        '<div id="ttc-pin-err" style="color:var(--bad);font-size:14px;min-height:18px"></div>' +
        '<div style="display:flex;gap:10px;margin-top:6px">' +
          '<button class="ttc-btn" data-close style="flex:1">Cancel</button>' +
          '<button class="ttc-btn ttc-btn-primary" id="ttc-pin-ok" style="flex:1">Open</button>' +
        '</div>',
        () => {
          const go = () => {
            const v = document.getElementById("ttc-pin").value;
            if (!TTC.checkPin(v)) { document.getElementById("ttc-pin-err").textContent = "That code doesn't match."; return; }
            TTC.unlockStaff(); paint(); fire(); close(); TTC.toast("Staff mode on — unlocked everywhere for " + TTC.STAFF_MINUTES + " min.");
          };
          document.getElementById("ttc-pin-ok").onclick = go;
          const inp = document.getElementById("ttc-pin");
          inp.focus(); inp.onkeydown = e => { if (e.key === "Enter") go(); };
        }
      );
    }
    // ---- staff panel (when already unlocked) ----
    function panel() {
      const mins = Math.max(0, Math.round((TTC.staffUntil() - Date.now()) / 60000));
      modal(
        '<h2>Staff mode is on</h2>' +
        '<p>Unlocked on every sheet for about ' + mins + ' more minute' + (mins===1?'':'s') + '. ' +
        'You can remove rows right on each sheet and export from the studio and FTC sheets.</p>' +
        '<div style="display:flex;gap:10px;margin-top:6px">' +
          '<button class="ttc-btn" data-close style="flex:1">Keep it on</button>' +
          '<button class="ttc-btn ttc-btn-danger" id="ttc-lock" style="flex:1">Lock staff mode</button>' +
        '</div>',
        () => { document.getElementById("ttc-lock").onclick = () => { TTC.lockStaff(); paint(); fire(); close(); TTC.toast("Staff mode locked."); }; }
      );
    }

    return { paint };
  }

  // ---- bare-bones shared modal ----
  function modal(html, after) {
    close();
    const scrim = document.createElement("div");
    scrim.className = "ttc-scrim";
    scrim.style.cssText = "position:fixed;inset:0;background:rgba(20,24,20,.45);display:flex;align-items:center;justify-content:center;padding:18px;z-index:50";
    const box = document.createElement("div");
    box.style.cssText = "background:var(--paper);color:var(--ink);border:var(--b);border-radius:var(--radius);padding:24px;max-width:420px;width:100%;box-shadow:var(--shadow-sticker)";
    box.innerHTML = html;
    scrim.appendChild(box); document.body.appendChild(scrim);
    scrim.addEventListener("click", e => { if (e.target === scrim || e.target.hasAttribute("data-close")) close(); });
    if (after) after();
  }
  function close() { const s = document.querySelector(".ttc-scrim"); if (s) s.remove(); }

  return { mount, onStaffChange, modal, closeModal: close };
})();
