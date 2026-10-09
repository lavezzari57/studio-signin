# Kings Highway Teen Tech Center — Sign-In Hub

One link, every sign-in sheet and the program calendar, all on the one
Supabase project. Open it on any iPad, laptop, or the TV. Enter the staff
code once and staff tools unlock on every sheet for 10 minutes — so you can
walk around with one iPad and sign kids into any program on the spot.

Live at: **https://lavezzari57.github.io/studio-signin/**

---

## The files

| File | What it is |
|------|------------|
| `index.html` | The hub home screen (the tiles) |
| `studio.html` | The music studio sign-in (your original sheet, untouched) |
| `ftc.html` | FTC robotics sign-in |
| `calendar.html` | The program calendar |
| `theme.css` | **The one knob.** Shared look: colors, fonts, the "Studio Sticker" shape language |
| `config.js` | **The control panel.** Supabase connection, staff code, and the list of programs/tiles |
| `staffbar.js` | The shared top bar (home button, title, staff unlock) every sheet uses |
| `names.js` | The shared name dropdown. Once someone signs in anywhere, their name is a tap away on every sheet |
| `sheet.js` + `sheet.css` | The shared engine behind the program sheets below |
| `youthcouncil.html`, `musicvideo.html`, `openmic.html`, `peerpanel.html`, `askajob.html`, `linkedin.html`, `vibecoding.html` | Program sign-in sheets. Each is just its colors plus a short list of questions |

---

## How to change the look

Everything visual lives in `theme.css`. Change it there and **every sheet
repaints at once.**

- **Make it all a different color:** edit `--bgc` (the screen wash) and
  `--ac` (the accent) near the top of `theme.css`.
- **Change a single sheet only:** each sheet file has its own
  `:root{ --bgc:...; --ac:...; }` block near the top — editing that changes
  only that sheet, and it can never affect the others.

Each sheet has its own "bent" (its own color flavor) on purpose. Studio is
pink, FTC is steel-blue, the calendar is green. They share the same bones
(hard outlines + offset shadows, chunky Bricolage headings, mono labels,
one pastel flood) but each looks like its own thing.

---

## How to add a NEW sign-in sheet

You vibe-code a new sheet in another chat (say podcasting). To bring it in:

1. **Drop the file** in this folder, e.g. `podcasting.html`.
2. **Add one line** to the `PROGRAMS` list in `config.js`:

   ```js
   { id:"podcasting", name:"Podcasting", file:"podcasting.html",
     color:"var(--sal)", emoji:"🎧", blurb:"Podcast booth sign-in" },
   ```

   (A tile with `file:null` shows as "coming soon" — that's how the
   placeholder tiles work. Give it a real filename to make it live.)

That's it. The tile appears on the hub and the staff code already works on it.

**To make the new sheet match the family:** have it `<link>` to `theme.css`
and `<script src="config.js">` + `<script src="staffbar.js">`, then call
`TTCBar.mount("Your Title")`. Use `TTC.insert / select / update / remove`
for its data. Copy `ftc.html` as a starting point — it's the simplest sheet.

### Program sheets (the quick way)

The program sheets all run on `sheet.js`. Open one (say `openmic.html`) and
you'll see a `fields` list: each line is one question. Change the wording or
the options there and that sheet updates. A question needs a matching column
in that sheet's table (pick-one and typed answers are `text`, pick-many is
`text[]`). In staff mode each of these sheets has an **Export all sign-ins
(CSV)** button under the list.

### The name dropdown

Every sheet loads `names.js`. Tap a name box and a dropdown shows people who
have signed in before; tap a name and it fills in first and last. New names
are saved automatically the first time someone signs in, on any sheet. In
staff mode each name in the dropdown has a ✕ for clearing out typos (that
only removes it from the dropdown, never from the sign-in records).

---

## The database

All sheets talk to ONE Supabase project (`ieieslzgxmdmflykuafl`). Each sheet
uses its own table:

- studio → `visits`
- FTC → `ftc_visits`
- podcasting → `podcast_visits`, 3D printer → `printer_visits`, art → `art_visits`
- Youth Council → `youthcouncil_visits`, Music Video → `musicvideo_visits`,
  Open Mic → `openmic_visits`, Career Panel → `peerpanel_visits`,
  Ask a Job → `askajob_visits`, LinkedIn → `linkedin_visits`,
  Vibe Coding → `vibecoding_visits`
- the name dropdown → `members` (one row per person, shared by every sheet)
- calendar → `calendar_events`
- generated event sheets → `event_sheets` (definitions) + `event_signins` (rows)
- a new sheet → make it a new table (keep the same shape: a `date` column,
  `time_in` / `time_out`, and whatever fields that program needs).

The connection and the staff code are in `config.js` — change them there,
once, and every sheet follows.

### Make an event sign-in sheet yourself — no code

On the hub in staff mode there's a **"+ New sign-in sheet"** tile. Type an
event name, pick a color, optionally type one question to ask (e.g. "Which
school are you from?"), hit **Make it** — and a live sign-in sheet exists
instantly, as a tile on the hub, on the same database. Use it, and next time
that event happens the tile's already there. Staff can remove a generated
tile with the ✕ on it (the sign-ins people did stay in the database).

These generated sheets are NOT files — they're rows in `event_sheets`, and a
single smart page (`event.html?id=<sheet id>`) renders any of them. All their
sign-ins live in `event_signins`, tagged by `sheet_id`.

### The calendar is live on the database

Events live in the `calendar_events` table, so **adding/editing events works
on every device at once** (laptop, iPad, the TV wall). In staff mode the
calendar shows a **"+ Add event"** button, and tapping any event lets you
**edit or remove** it. Editing/removing a repeating event asks "just this
day, or the whole series." The `EVENTS` block still in `calendar.html` is
only a fallback shown if the database is briefly unreachable.

### Still to do (known, on purpose)

- **The studio sheet has its own staff code** (`2026`, built into
  `studio.html`). The hub's shared unlock doesn't carry into it yet. One
  small bridge line would connect them whenever you want.
- **Milestone tracking (A&P)** — the "4 kids in the studio = they
  collaborated" idea isn't built yet. The sign-in data already captures what
  it needs (who, when, doing what, together); the reporting layer is the
  next build.

---

## Notes for later

- The Supabase anon key and staff code are visible in the page source. That's
  normal for a sign-in sheet, but it means names are world-readable to anyone
  with the link and a curious kid could find the staff code. Fine for now;
  tighten with per-staff logins if that ever matters.
- Free Supabase projects pause after ~7 days of no activity. Daily use keeps
  it awake; a long break (winter closure) could pause it — first sign-in
  after wakes it.
