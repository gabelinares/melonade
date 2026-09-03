# Issues, in two designs

Two candidate designs for the Issues page of the standalone agents product, built
as two independent applications with two independent design systems.

The brief (Mehdi, 2026-08-19): one page in two options. Option A stays compact and
close to the current layout with different colours and fonts. Option B is
"something dramatically different". The menu is what gets judged, because it has
to survive more agents being added.

Both run. Both have Storybook. Neither shares a line of styling with the other.

**Live, one URL each:**

| Option | URL |
| --- | --- |
| A, Graphite | https://melonade-graphite.vercel.app |
| B, Atrium | https://melonade-atrium.vercel.app |

---

## Running them

Each option is a separate app with its own `node_modules`, its own component
library, and its own tokens. There is no shared build.

```bash
# Option A, Graphite (Ant Design v6)
cd option-a
npm install          # already installed
npm run dev          # http://localhost:4310
npm run storybook    # http://localhost:6310

# Option B, Atrium (Mantine v8)
cd option-b
npm install          # already installed
npm run dev          # http://localhost:4320
npm run storybook    # http://localhost:6320
```

Neither port collides with the OpenReplay prototype on 3333/3334.

**Start them detached.** A dev server launched as an agent background task gets
reaped when the turn ends; `nohup npx vite --port 4310 & disown` survives.

**Hard-reload after a run of CSS edits.** Vite's HMR can leave one stylesheet
stale in a long-lived tab, and the symptom looks like a layout bug rather than a
caching one - cards stacking instead of gridding, a blur scrim positioned against
the wrong ancestor. Reload before diagnosing anything visual.

Each app also has `npm run tsc` (typecheck), `npm run build` (typecheck then build)
and `npm run build-storybook`.

## The prototype controls

Bottom right of each app, collapsed by default, and deliberately styled as
scaffolding so nobody wonders whether it ships. It carries the three things a
static screenshot cannot answer:

- **Agents in the menu.** Drag it from 1 to 11. This is the answer to "does the
  menu survive more stuff in it", and it is meant to be looked at rather than
  claimed.
- **Queue state.** Loaded, loading, empty. Loading and empty are where list
  designs actually fail, so they are one click away instead of unreachable.
- **Type systems.** Five, in a dropdown, each taken from software that handles
  type well rather than assembled from fonts: **Graphite** (the shipped voice),
  **Swiss** (Linear - one grotesque, tight headings, tags in small caps),
  **Console** (Vercel - tags and every figure in the mono), **Editorial** (Notion
  - a text serif on the page title and the write-up) and **System** (GitHub - the
  OS's own face, a size up, nothing loaded). Each moves the family, the page
  title, the tags and the figures. See DESIGN.md section 14.
- Option A's menu is one width at every size, so there is nothing to toggle.

Option B also has real keyboard triage: `J` and `K` walk the queue, `Enter` goes
one step deeper into the flow, `Esc` comes back one step, `F` toggles full width,
`C` opens the critical dialog, `E` hides, and `Cmd K` opens the command palette.

## What is and is not built

Built, in option A: the Issues page and its flow, **the Tests agent** (its list,
its runs and its environments), **the Audits list**, the menu, and every state any
of them can be in.

**The shell changed on 2026-08-28** (DESIGN.md section 13): one ground, one
plane. The window is painted in a single colour, the menu sits on it with no
surface of its own, and the content is a card floating on that ground with an
equal margin on four sides — so the ground wraps the content instead of meeting
it at a seam. The menu is labelled again, with an agent's sections nested under
it, four tools on one row at the foot and a credits meter under them. Option B is the
Issues page only - it is the argument for a layout, not a second application.

**Tests and Audits arrived on 2026-08-27, and the Tests page's other two
sections on the 28th**, ported from what production runs today. Tests is three
tabs - the tests, their **Runs**, and the **Environments** they run against - with
the tabs in the page header rather than in a band of their own. Everything at
list level is real and wired: the queue order, the status tabs, the filters, the
bulk actions, the row menus, the run log with its seven-day window, the
environment list and the delete that pauses the tests it would strand.

No detail panel is built yet - the test panel, the run panel with its HAR viewer,
the audit report, the environment form - so a row opens a drawer that says so and
names what is coming. See DESIGN.md section 12.

Not built: Sessions, Preferences, Support. Clicking them lands on a plainly
labelled placeholder. The menu rows themselves are real, so the menu is still
fully judgeable.

**Held back in option A: the issue write-up.** It is built and it is being
reworked, so it is behind one flag, `DETAIL_IS_WIP` in `shared/flags.ts`, and A
shows a plainly labelled note in its place. Nothing was deleted:
`option-a/src/issues/IssueDetailPanel.tsx` is untouched and keeps its story, so
the design stays reviewable while it is off the deployed page. The expanding caret
survives, because reading in place is A's structural answer to "where does the
detail live" and a dead caret answers nothing.

**Option B's detail was replaced rather than restored.** Since 2026-08-24 it is a
three-depth flow: the queue, the write-up, the replay. Every step takes its space
from the step you just finished, on two axes at once, and the session strip is the
constant that carries you between them. It is the most designed thing in this
repo, and **DESIGN.md section 10 is the argument** - read that before touching
`WorkPane.tsx`, `IssueContext.tsx`, `SessionStrip.tsx` or `src/replay/`.

Short version, because it is worth knowing before you open the app: the pane has
one header across the full width and everything hangs below it. Click a session
card and the issue queue leaves, the write-up collapses away, the player takes
what they both gave up, and **the journey panel opens on the right** - one row per
step, on the clock, every row a seek. The glyph at the far right of the header
collapses it again, which is also what `F` does. `Enter` goes deeper, `Esc` comes
back one level, `J`/`K` walk the queue at triage and the sessions once a recording
is open, the title in the header re-opens the write-up over the top half with the
replay still playing, and "Jump to the failure" seeks to the moment the issue bit.
Triage is **one scrolling document**: the write-up, the answer and the sessions
band, each exactly as tall as its contents. The band is a **shortlist of three**
out of the hundred-odd sessions that hit the issue - one per variation, best of
each kind, see `shortlistSessions`. The queue collapses from the glyph at the far
left of the header, mirroring the panel toggles on the far right, and the width
it frees goes to margin rather than to a 140-character measure. On the replay
screen the strip says `3 of 134`, grows by three at a time, and will play you
through the recordings if you ask it to.
The player's content is a mock; its clock and every control on it are real.

## Layout of the repo

```
melonade-app/
  shared/
    issues-data.ts     the mock dataset, extracted verbatim from the OpenReplay
                       prototype's issuesStore.ts (11 issues, 8 segments, 4
                       critical descriptions, 23 sessions)
    issues-logic.ts    the domain logic: filters, grouping, criticality,
                       counts. Pure, no React, shared by both options
    brand-mark.ts      the Melonade mark as geometry. One shape, two renderers
    replay.ts          replay as data: the journey split into timeline markers,
                       the failure moment, durations. Pure and deterministic
    flags.ts           prototype flags. Currently: A's write-up is held back
    tests-data.ts      the tests dataset and its schedule vocabulary, ported
                       from the production Tests page (31 tests, 5 states)
    tests-logic.ts     the tests domain: the queue order, the status counts,
                       the filters, merging and the bulk scopes. Pure
    audits-data.ts     audits as data plus the job arithmetic: the sample
                       share, the health bands, one tick of a running audit
    runs-data.ts       81 runs, ported from the production fixture (11 written
                       out, 70 generated the way production generates them)
    runs-logic.ts      the runs log: the period window, the result counts, the
                       five filter dimensions. Pure
  option-a/            Graphite. Ant Design v6.
  option-b/            Atrium. Mantine v8.
  tools/
    oklch.mjs          OKLCH to sRGB, WCAG contrast, Oklab lightness
    gen-palette.mjs    generates both palettes from OKLCH intent and audits them
    gen-css.mjs        generates tokens.css from tokens.ts
    shoot.mjs          screenshot harness
    interact.mjs       interaction-state screenshots
    measure-prose.mjs  measures real characters per line
    crop.mjs           element-level crops
    look.mjs           one screenshot, optional element crop
    pix.mjs            reads COMPUTED colours out of a running app as hex
    mark-check.mjs     asserts the OpenReplay mark's two triangles trade places
    live-verify.mjs    asserts a DEPLOYED url really mounted, not just 200'd
    flow-shot.mjs      walks option B's three depths and shoots each one
    watch-shot.mjs     one shot of the watch depth, playback advanced
    jump-shot.mjs      "jump to the failure", caught mid-playback
  DESIGN.md            the two design systems, the decisions, and the comparison
```

**Why the domain logic is shared and the design systems are not.** The two options
are a question about design, so they have to differ in design only. Same data,
same filters, same ranking, same counts. If option B looked better because it also
quietly reordered the list, the comparison would be worthless.

## Regenerating the tokens

The palettes are computed, not hand-picked. Every colour starts as an OKLCH
intent, gets clamped into the sRGB gamut, and is then audited for contrast before
it is written.

```bash
npm run tokens   # regenerates both palettes, both tokens.css, and runs the audit
```

The audit fails the build on a contrast regression. It checks two different things
with two different metrics, because one metric does not cover both:

- **Text** against WCAG contrast ratio (4.5:1 body, 3:1 for icons and UI).
- **Surfaces** against Oklab lightness distance. The WCAG ratio is useless here:
  its flare term dominates at the dark end, so two clearly different near-blacks
  both score about 1.05 and the number stops meaning anything. Dark mode surfaces
  are judged in perceptual lightness steps instead.

Both were added after the first dark-mode render came out flat. The numbers now
say what the eye said.

## Deploying

Two Vercel projects, one per option, so each has its own link to send.

```bash
cd option-a && npm run deploy   # -> melonade-graphite.vercel.app
cd option-b && npm run deploy   # -> melonade-atrium.vercel.app
```

`npm run deploy` typechecks, builds, and ships. There is no git auto-deploy, and
that is deliberate: these apps live outside `openreplay-repo` and are not under
version control.

**Vercel does not build them.** It serves the `dist/` produced on this machine,
and each `vercel.json` sets `buildCommand` to a no-op. The reason is the `@shared`
alias: both options import the domain layer and the brand mark from `../shared`,
which sits above the project root, and they share the root `node_modules` too, so
a remote build from either directory cannot see either one. Building locally and
shipping the output keeps one source of truth and avoids restructuring two apps to
suit a deploy.

Two things this arrangement will bite you with, both already fixed in the configs:

- `dist/` is in `.gitignore`, and the CLI falls back to `.gitignore` for anything
  `.vercelignore` does not decide. The first deploy therefore shipped an **empty**
  project: the alias returned 200 and every path 404'd. Each `.vercelignore` now
  re-allows `dist` explicitly.
- A deploy reporting "Ready" proves nothing about what it serves. `curl` returns
  200 on an empty deployment and on a blank page alike. Verify with
  `node tools/live-verify.mjs <url> <shell> <mark> [expand] [writeUp]`, which
  loads the real URL in both themes and asserts the shell mounted, the mark is
  watermelon, the WIP note is showing and the write-up is genuinely absent.
