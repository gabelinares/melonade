# Two design systems for the Issues page

Written 2026-08-21. Companion to the two running apps in `option-a/` and
`option-b/`.

---

## 1. The brief, and what each option is answering

From the 08-19 review:

> One page first, the Issues main page, in two options. Option A: compact,
> simplified further, different colours and fonts, almost the same layout, cheap.
> Option B: something dramatically different, a day to a week is fine.
> "I'm more interested in the menu how it's going to look like and trying to
> imagine if we're going to add more stuff in it."
> Simplify to the maximum, with licence to cut.
> The component library is open.

So the deliverable is not really two page layouts. It is **two answers to "how does
the navigation hold when this product has eight agents instead of three"**, each
wearing a complete visual system so the answer can be judged rather than imagined.

| | Option A: Graphite | Option B: Atrium |
|---|---|---|
| Library | Ant Design v6 | Mantine v8 |
| Register | Compact, monochrome, hairline | Airy, committed colour, editorial |
| Primary action | Ink, near black | The plum accent |
| Type | IBM Plex Sans + IBM Plex Mono | Instrument Sans + Instrument Serif + JetBrains Mono |
| Base size | 13px | 14px, prose at 17px |
| Radii | 2 / 4 / 6 | 4 / 6 / 10 / 14 |
| Layout | Left nav plus a content card. Close to today. | Agent rail plus queue plus reading pane. Three panes, no page. |
| The menu | Labelled vertical list, 216px, collapses to a rail | Icon rail, 56px, never collapses because it is already minimal |
| Filters | One funnel plus one display control, searchable filter tree, counts per option | Identical behaviour, its own chrome |
| Grouping | Off by default. Synthetic header rows in the table, and it disables pagination | Impact bands by default, switchable to category or none |
| Reading an issue | Expands in place inside the row | Fills the permanent right pane |
| Pagination | Yes, ten per page | None. The queue scrolls. |

Both apps render the same eleven issues, the same eight segments, the same four
critical descriptions, from the same shared domain layer.

---

## 2. What both options share, and why

### The domain layer is shared

`shared/issues-data.ts` is the mock dataset lifted verbatim from the prototype's
`issuesStore.ts`. `shared/issues-logic.ts` is the filtering, grouping, criticality
derivation and counting, as pure functions with no React.

This is deliberate. The two options are a question about design, so they must
differ in design only: same data, same ranking, same counts. If B looked better
partly because it also quietly reordered the list, the comparison would tell us
nothing. Each app then has its own thin `useIssues()` hook, about 130 lines, that
holds state and delegates every question to the pure layer.

Splitting it that way also fixed a real problem. A hook in `shared/` would resolve
a second copy of React (each app owns its own `node_modules`) and break hooks at
runtime. Pure domain in the middle, React binding per app.

### The token architecture is shared, the values are not

Both apps use the same three-layer structure and the same token NAMES, which is
what makes them comparable at all: identical roles, different decisions behind
them.

```
palette.ts    GENERATED primitives. "n-600" is a value with no meaning.
tokens.ts     Semantic roles. "content-muted" is a decision. Light and dark.
tokens.css    GENERATED from tokens.ts. 127 custom properties in A, 132 in B.
```

Three rules the old codebase broke and this one enforces:

1. **Nothing reads a primitive directly.** A component reaches a colour through
   `t('surface-default')`, which is typed, so a typo is a compile error.
2. **Dark mode only ever redefines roles.** Primitives never move. The generator
   fails the build if a role exists in one theme and not the other.
3. **The CSS layer is generated from the TS layer.** A token that exists in TS but
   not in CSS is a silent transparent background weeks later. One source, two
   outputs, no drift.

This is the direct answer to the design-system inconsistency in the current app:
67 hardcoded colour literals and no role layer, so every theme change was a
search and replace and every one of them missed something.

### The palettes are computed, not picked

Every colour begins as an OKLCH intent (`oklch(50% 0.012 220)`), gets clamped into
the sRGB gamut by binary search, and is audited before it is written. Clamping
matters: an out-of-gamut light tint clips a channel, which shifts its hue, which is
how "one accent" quietly becomes two.

The audit checks text with WCAG contrast ratios and surfaces with Oklab lightness
distance. **Both metrics are needed and the second one was added after a failure.**
The first dark theme passed every WCAG check and still rendered as one flat black
plane, because the WCAG ratio's flare term dominates at the dark end: two obviously
different near-blacks both score about 1.05. Surfaces are now held to perceptual
lightness steps, and the dark ladder was widened from 2.5 points per step to 4 or 5
as a result.

All 27 text checks and all 11 surface checks pass, in both options.

### The Melonade mark is shared, and it is not an accent

Both options now carry the real logo instead of the placeholder each had — option A
an ink tile with an "M" in it, option B a plum-filled square with the same "M". A
filled square holding the brand's initial in the brand's accent colour is a workspace
avatar, not a logo.

**The shape lives in `shared/brand-mark.ts`**, next to the issue data, for the same
reason: it is not a decision either option gets to make. There is one Melonade and it
has one shape. Each app renders that geometry with its own CSS and its own class
prefix, so the two component libraries stay independent while the identity does not
fork.

The shape is the live landing page's, verbatim: a disc with one small square sitting
outside it — everything you shipped, and the one thing misbehaving in it. Both shapes
are **rects**, never a circle plus a rect, because a rect whose `rx` is half its width
*is* a circle, and that is what lets one become the other with nothing to morph and no
path interpolation. On hover, on keyboard focus, and once on mount, the two trade
places: the disc becomes the small square and the square becomes the disc. Five CSS
geometry properties animate (`x`, `y`, `width`, `height`, `rx`) and nothing else —
adding opacity or a transform makes the shapes look replaced rather than swapped. A
browser without CSS geometry-property animation still draws the mark correctly from
the SVG attributes and simply does not animate it.

The turn fires from `data-mark-host` on whatever element holds the mark, which is a
button in option B's rail and a plain div in option A's brand row. That attribute is
the contract for a reason: an unqualified `:hover >` selector would fire whenever the
pointer is anywhere in the mark's ancestor chain, and hard-coding `button` would leave
option A's mark inert.

**The colour is a role of its own, `brand-mark`, and it is the one exception to the
generated palette.** The three watermelon values are literal hexes lifted off the
landing page (`#d64560` light, `#f06a84` dark, with `#bc3854` carried for the day the
mark sits on a tint and needs 4.5:1) rather than recomputed from hue 14, because
re-deriving them came back one or two channels off and a logo that is nearly the right
colour is the wrong colour.

It is not wired into any semantic role in either option, and if it ever appears on a
control that is a bug. **A logo is identity; an accent is a signal.** In Graphite that
one glyph is the only chromatic thing in the whole interface, which is the strongest
version of its ration-the-colour argument rather than a hole in it. In Atrium it is the
only watermelon thing in an otherwise plum app — see the note on why the accent could
not simply become the brand hue.

### Filters: one control, in both options

Reworked 2026-08-21 against Linear as the reference, because filters are the
control people actually live in.

**What replaced what.** Option A had three sibling dropdowns on the toolbar (Tags,
Found in, Display). Option B had one tall popover with every dimension stacked
inside it. Both are now the same two controls: a funnel for filters and a slider
for display.

Three buttons is not three times the power of one. Each had to be opened to find
out whether it held anything, none could show a count against an option, and
adding a sixth filter meant finding another 90px on a row that had already started
wrapping. Stacking is not collapsing either: B's single popover grew taller every
time a dimension was added.

**What makes the collapse a gain rather than a trade:**

- **Search spans every dimension.** Typing "checkout" surfaces the Checkout tag
  and the Billing & checkout segment together. You never have to know which
  dimension a value lives in before you can reach it, which is the thing separate
  dropdowns structurally cannot do.
- **Every option carries its count**, computed with the other filters still
  applied, so "Payment 2" means two more rows rather than two in total. That turns
  the menu from a guess into a plan. It is the one thing the reference does that a
  plain list of checkboxes does not, and it needed a new shared function.
- **Options that match nothing are still listed, just quieter.** A menu that
  changes shape as you use it is harder to learn than one with a zero in it.
- **Applied filters render as removable chips beside the list.** This is the price
  of a single icon and it is not optional: a funnel can say "3 applied" but it
  cannot say which three. Each chip names its dimension as well as its value,
  because "High" is ambiguous once impact and critical both have options.

**The checkbox only appears on hover, on focus, or when the option is selected.**
A column of empty checkboxes turns a menu into a form: it pulls the eye to the
controls instead of the labels, and it makes nine unchecked boxes as loud as the
one that matters. The slot is RESERVED rather than inserted on hover, which is what
stops every label shifting sideways under the cursor.

**The model had to change to support this**, which is worth saying because it was
not a styling pass. `criticalOnly` and `mineOnly` were two booleans: they made
"critical to me" and "critical to the team" mutually reinforcing rather than two
values of one dimension, and there was no way to ask for "not flagged" at all. One
`CriticalState[]` says all three and composes like every other dimension. Impact
became filterable at the same time, since a filter tree makes it natural and two
booleans never did.

### Display: how the list is drawn, not which rows are in it

A second control, modelled on the same reference's slider menu: grouping,
ordering with a direction toggle, hidden issues, and field pills.

Kept separate from the filter menu on purpose. None of it narrows the result set,
and putting "hidden issues" behind the filter badge would make the badge count
something the filter menu cannot account for.

Three deliberate departures from the reference:

1. **No List / Board toggle.** There is no board. A control for a view that does
   not exist is a dead control, and shipping one to look complete is worse than the
   gap it hides.
2. **Hidden issues is a three-way, not a switch.** Exclude, include, only. A
   boolean cannot say "show me only the ones I hid", which is the question you have
   when auditing what the agent was told to ignore.
3. **Only fields the option can actually draw are offered.** A table has columns
   to toggle; a two-line row has different slots. Option A does not offer the
   Sessions pill because a table row has nowhere to put it, and offering a pill
   that does nothing is the same defect as the board toggle.

**Grouping means something different in each option**, which is the clearest
illustration of why these are two designs and not two skins. In A it inserts
synthetic full-width header rows into an antd table that has no grouping of its
own, and **it turns pagination off**: grouping within a ten-row page made every
band count a half-truth (the Low band read "2" while three existed), and grouping
across pages would start a band on page one and finish it on page two. In B it
changes what the sticky band headers say while you scroll, which was previously
hard-wired to impact and is now a choice.

### One control family, and why it took three rounds of review to get right

Reviewed 2026-08-21. Every point below was caught by eye in a browser, not by a
check, and each one is the same defect wearing different clothes: **controls that
are meant to look alike were built more than once.**

- The three controls at the head of option B's queue were built three ways.
  Search was Mantine's `ActionIcon` at 34px, the filter and display triggers were
  hand-rolled buttons at 28px, and the row holding them had no `gap` rule at all,
  so they sat flush. Three sizes and no rhythm in a group of three.
- Then the same thing across the pane divider: the reading pane's previous and
  next arrows were `ActionIcon` at 34px facing 32px buttons opposite. Two headers
  that read as two products.
- Then a pixel: the toolbar icons were 15px and the detail icons 16px, so boxes
  that should have been identical differed by 1px.
- And in option A, the row's disclosure caret was 18px while the kebab beside it
  was 26px, which put them 2px apart on the same line.

**The fix is a component, not a stylesheet.** `IconButton` in each app owns one
height, one radius, one badge treatment, one disabled state, and a pinned 15px
icon box so swapping a glyph cannot change the width. Two variants, differing only
in whether they carry a border. Every icon-only control in both apps now goes
through it.

**And the alignment is now measured.** `tools/align-check.mjs` reports every icon
control's height, width, radius and vertical centre, groups them by visual row,
and fails when a row disagrees. Option A: 23 controls, all 26px, every row
agreeing. Option B: 6 controls, all 32 by 33, radius 4, all sharing a vertical
centre of 26 including across the divider. Eyeballing this is exactly what let
three sizes ship in the first place.

### Category is a checkbox, not a radio

Category was the only single-select dimension, which made it the one radio in a
menu of checkboxes and meant you could not ask for "errors or slowness". It is a
`CategoryName[]` now, like every other dimension, and an empty list means no
constraint.

The strips followed, because a strip and a menu offering the same dimension must
agree. Option B's pill row became a multi-toggle. Option A's antd `Segmented` had
to be **replaced** rather than adjusted: it is single-select by construction. It is
now a toggle strip styled to read like the control it replaced, so the toolbar
looks the same and each item is independent. "All" is not a fourth option, it is
the empty selection.

### One field, one ring

The filter menu's search field in option B had a 1px gap between its text and its
own focus ring, and then briefly two plum rings at once. Both come from the same
root: Mantine's `unstyled` variant strips the padding along with the border, and
the ring was landing on the input while Mantine also changed its border colour.

The rule now, in both options: **the ring belongs to the row, not to the bare
text.** The row is the field (an icon, an input, and the rule under them), the
input autofocuses when the menu opens, and a ring drawn tight around the glyphs
collides with the icon beside it. The ring is not removed, because a focusable
element with no visible focus state is the defect this system audits for.

`tools/field-gap-all.mjs` now walks every field reachable only through an
interaction: the filter menu's search, the command palette, and each dialog.
Storybook cannot reach those compositions, which is exactly how a 1px gap shipped
in the one field that had no story.

### Both do three things the current app does not

- **Every interactive element has a visible focus ring**, declared once, never
  removed, including table rows, sortable column headers and custom buttons.
  Verified by walking the tab order and asserting an indicator at every stop,
  which is how the four places option A was missing one were found.
- **Every icon-only control has a 44px hit area** via a pseudo-element, so the
  visual box can stay 20px without failing the touch-target floor.
- **Loading is a skeleton with the shape of the thing loading**, not a spinner, and
  empty states name the filter that emptied the list instead of saying "no
  results".

---

## 3. Option A: Graphite

**In one line: ink is the primary action, colour is rationed to one restrained
teal, and every rule is a hairline.**

### Colour

Monochrome. The neutral ramp is tinted 0.002 to 0.012 chroma toward hue 210, the
accent's own hue, so the surfaces cohere with the one chromatic colour without
reading as tinted. The accent is a deep slate teal, `#0d636f`.

The identity decision is that **the primary button is ink, not the accent.**
Coloured primary buttons are what make an app read as "the blue one", which is
exactly what this must stop reading as. So antd's `colorPrimary` is the teal and it
drives every selection, checked and focus affordance, while `Button` overrides it to
near black. The teal appears on maybe two percent of the surface: a selected row
tint, a focus ring, and the badge on an issue found inside a segment.

Status colour is kept far apart in hue so a chip is never ambiguous: danger at 27,
warning at 75, success at 152.

### Type

IBM Plex Sans for the interface, IBM Plex Mono for durations and ids. One
superfamily, two cuts, so numerals sit beside prose without a pairing clash. Plex is
humanist and slightly engineered, which suits a triage table. It is deliberately not
Inter and deliberately not Figtree, which is the current app's face.

Base 13px on an untouched 16px root. The root font size stays at the browser
default in both options: the current app sets it to 14px, which rescales every rem
in the codebase and is why text beside a component never lined up. Compactness
comes from the scale, not from moving the root out from under the user's zoom.

Three weights only. A fourth is how a quiet system starts shouting.

### Density and depth

Row height 38px. Controls 26 / 30 / 36. Radii 2 / 4 / 6. One border width, 1px,
with no 2px rule anywhere in the system.

**Cards carry a border, never a shadow.** Only floating layers get one. This is the
direct answer to "there's like something thick, it's like more like a shadow" from
the 08-19 header review.

### The menu

A labelled vertical list, 216px, and four decisions carry the scaling answer:

1. **Agents are peers, not children.** Today Issues, Tests and Audits are nested
   inside a collapsible "Agents" item, so reaching any of them costs a disclosure
   click and the tree holds open state. Flattened, a new agent costs exactly one
   row and nothing has to be expanded. The section label carries the count so the
   group is still legible as a group.
2. **The shoulders are pinned.** Only the agent list scrolls. Replay sits above it
   and the account below, both fixed, so Preferences can never be pushed
   off-screen, which is what happens in a nav that grows as one long column.
3. **The nav is the queue.** Each agent carries its open count, so eleven agents is
   a worklist rather than eleven doors. Length only becomes a problem when the rows
   say nothing.
4. **It collapses to a rail** below 1080px, or on demand. Structural
   responsiveness, driven from React rather than a media query, because a CSS-only
   collapse shrinks the box while React keeps rendering labels.

Verified at 1, 3, 6 and 11 agents. At 11 the list is 11 rows plus an "Add agent"
row, the footer has not moved, and nothing scrolls.

### The page

Almost the same layout as today, which is the brief, with things cut:

- Docs and Settings were two full buttons in the header. They are destinations, not
  actions on this page, so they collapse into one overflow and the header gets its
  width back.
- Impact shows the level as a word beside the bars instead of hiding it in a
  tooltip. A reader with no legend cannot tell two filled bars from three, and the
  current app makes them hover to find out.
- The category tab bar, the three filters and the date range stay on one row.
- **Reading an issue expands the row in place.** No navigation. The write-up is the
  product and everything else on the screen is a way of choosing which write-up to
  read, so making somebody leave the list to read one and come back to pick the
  next is the wrong shape for the job. It also means nothing on the page is a dead
  control, which a one-page deliverable otherwise ends up with.

---

## 4. Option B: Atrium

**In one line: a committed plum accent on plum-tinted neutrals, where the chrome
sits darker than the content, and the page has become a console.**

### The structural idea

Three panes, full height, each scrolling independently. The document does not
scroll at all.

```
56px          400px                        the rest
┌────┬──────────────────────┬──────────────────────────────────┐
│    │ Issues            11 │  ‹ ›  1 of 11      Critical  ···  │
│ M  │ [2 segments ~8%]     ├──────────────────────────────────┤
│    ├──────────────────────┤                                  │
│ ▶  │ All Errors UI/UX ... │  Card declined with no            │
│ ─  │──────────────────────│  error message at checkout        │
│ 🐞 │ HIGH IMPACT        5 │                                  │
│ ⚗  │ ● Card declined …    │  ● High · Errors · Billing · 3m   │
│ 📋 │   Errors · Billing   │                                  │
│ +  │ ● "Place order" …    │  WHAT IS HAPPENING                │
│    │ ● Card form rejects  │  When the payment processor …     │
│    │──────────────────────│                                  │
│    │ MEDIUM IMPACT      3 │  ┌ SUGGESTED FIX ──────────────┐ │
│ 🔍 │ ● Product images …   │  └─────────────────────────────┘ │
│ ⚙  │                      │  SESSIONS THAT HIT IT          3 │
│ GL │                      │                                  │
└────┴──────────────────────┴──────────────────────────────────┘
 rail        the queue                the reading plane
```

The argument: **the agent's write-up is the product.** Everything to the left of it
is a way of choosing which write-up to read. So reading one should never cost you
your place in the queue, and it never does.

That single decision removes several things rather than adding them, which is what
"simplify to the maximum" should mean:

- **No pagination.** Paging exists to stop a wide table running off a page. There
  is no page here, and "back to page 3" is exactly the cost this layout exists to
  remove.
- **No sortable columns.** The list is grouped by impact band with a sticky header
  per band. A sortable table asks the reader to choose an order and then read a
  flat list. A grouped list has already made the only ordering decision that
  matters and tells you where you are in it while you scroll.
- **No separate detail page**, so no back button, no scroll restoration, no
  "instance details" tab bar.
- **No table row.** A table row puts every field in a fixed column, which is right
  when you are comparing rows and wrong when you are choosing which one to read.
  The title gets two full lines at reading size, everything else drops to one quiet
  meta line, and nothing is truncated to fit a column boundary because there are no
  column boundaries.

### Colour

Committed accent, grey neutrals. The accent is a deep plum, `#873a82` — watermelon
flesh, deepened and desaturated until it is serious. The primary action IS the
accent, which is the whole point of a committed palette and the clearest difference
from option A at a glance.

**Elevation is inverted.** In option A, and in the app being replaced, the page is
grey and the card is white. Here the rail and the queue are the tinted surfaces and
the reading pane is the brightest thing on screen, so depth runs toward the content
rather than toward the frame. This survives into dark mode: rail deepest, queue
middle, pane lightest.

Error is moved to hue 38, a burnt orange-red, 68 degrees from the accent, so a red
chip and a plum chip are never confusable on a small element.

#### The recolour, 2026-08-21: "too plum, and the dark should be greyer"

The first build of this option was judged **too plum**, and the diagnosis was that
the hue was in the wrong places rather than that it was the wrong hue. Three things
were carrying it that should not have been:

1. **The neutrals.** The ramp was tinted at 0.003 to 0.015 chroma toward hue 330,
   which is the same chroma as the accent itself at the dark end. Every surface in
   the shell was therefore faintly purple, and a grey room with a plum accent in it
   became a purple room. Neutral chroma is now **halved**, 0.015 down to 0.0075 at
   the darkest steps.
2. **The tinted planes.** `a-50` and `a-900` are not decoration; they are the
   selected row, the suggested-fix panel and the active-filter chips — large areas.
   Held at the accent's chroma they read as a *state*, not a surface. The accent
   ramp now **desaturates at both ends** (`a-900` from 0.062 to 0.026, `a-50` from
   0.020 to 0.014) while its middle is untouched. The rule this produces, and the
   option now follows it everywhere: **the accent at full strength only ever appears
   on a small shape.**
3. **Tinted prose.** The suggested-fix panel set its whole paragraph in `a-200`.
   A tinted plane with tinted type on it doubles the hue in the one place the eye
   rests longest, and it was the single most purple thing on the screen. The panel
   keeps its ground, its border and an accent eyebrow; the sentence is now ordinary
   reading colour.

The dark ladder also **drops 2 Oklab points and loses two thirds of its chroma**:
canvas `#030303`, rail `#090809`, queue `#121011`, pane `#1d1b1d`. Every step keeps
its exact spacing from its neighbours, so the inverted elevation survives intact and
all 11 surface-separation checks still pass — the room is simply darker and grey.

One consequence had to be designed around rather than absorbed. **Selection used to
be a wash and nothing else, and it worked only because the wash was saturated.**
With grey surfaces it was not just quiet but comparatively quiet: hovering any other
row lifts it to `surface-hover`, which is *lighter* than the selected row, so the eye
went to the wrong one. Selection is now the wash **plus a 2px accent rail** on the
leading edge — the accent at full chroma, on a small shape, exactly where the
recolour says the hue belongs. It also survives the next surface tuning, which a wash
never does.

The account avatar in the rail was moved off the accent tokens to the neutral ones at
the same time. It was a plum disc at the bottom of a 56px strip with the watermelon
mark at the top: two coloured circles close enough in hue to look like a mismatched
pair rather than a deliberate one. An avatar is not selected, active or
informational, so it has no claim on the accent.

#### Watermelon was tried as the accent, and rejected

The obvious move — make the UI accent the brand's watermelon — **does not work, and
the reason is worth recording so nobody re-derives it.** Watermelon is hue 14. This
option's danger ramp is hue 38. Twenty-four degrees apart, at comparable chroma, is
not enough separation: the selected row, the suggested-fix panel, the impact dot and
a destructive confirm would all land in the same family, and the impact signal — the
thing this page exists to rank by — would stop meaning anything. Plum's 68 degrees of
clearance from danger is the whole reason a committed accent is affordable here.

So the brand hue and the accent hue are deliberately two different hues. See the mark
below.

### Type

Paired on a contrast axis rather than on similarity. Instrument Sans, a slightly
condensed grotesk, for the interface. Instrument Serif, a high-contrast display
serif, for the one thing the product is selling. Two grotesks that are almost the
same is the pairing mistake; sans plus serif is a decision anyone can see.

**The serif is display only, and there are exactly two places it appears:** an
issue title in the reading pane, and an empty-state headline. It is applied by an
explicit `.m-display` class rather than a global heading rule, precisely so that
adding a heading somewhere cannot accidentally put a display face on a label. A
display font in UI chrome is the fastest way to make a work tool feel costumed.

Base 14px, prose at 17px. The prose size is set by the measure, not by taste: 17px
in a 32rem column is 68 characters per line, inside the 65 to 75 readable band.
Measured on the render, not assumed.

### Density and depth

Row height 68px, two lines. Controls 28 / 32 / 36. Radii 4 / 6 / 10 / 14, visibly
rounder than A, which is the cheapest legible difference between the two at a
glance. Shadows are soft and wide instead of tight and dark, and still only on
things that genuinely float.

The reading pane header follows the 08-19 notes literally: **one horizontal rule,
no shadow, no vertical separators anywhere, and the metadata is one line of text
rather than a row of bordered cells**, because cells are what put a separator
between every field. The title sits 40px clear of the rule above it, so the
content reads as separate from the header instead of crowded against it.

### The menu

An icon rail, 56px, and it answers the scaling question structurally rather than by
arrangement:

1. **It costs no width, ever.** 56px at every window size and every agent count.
   Option A's labelled nav is 216px and has to collapse to a rail on a small
   screen, which means two layouts to keep honest. This has one. The eleventh agent
   takes 44px of vertical space that was empty anyway.
2. **Groups are space, not headers.** There is no room for an "Agents" caption, so
   the boundary between replay and the agents is a gap and a hairline. Two groups
   need a separator, not a caption.
3. **Only the agents block scrolls.** Replay above, account below, both pinned.
   Same principle as A, different geometry.
4. **The discoverability cost is paid for explicitly.** An icon rail hides names.
   So this option ships a real command palette behind `Cmd K` and the search slot:
   every agent and every issue is reachable and searchable by name even though no
   name is on screen. Without it the rail would be a genuinely worse menu than the
   labelled list it replaces, and it would be dishonest to present it without
   saying so.

The counts survive as small outlined badges. The first version made them filled
pills, near black for inactive agents and plum for the active one. Rendered, three
of those on a 56px rail were the loudest thing in the product and they overlapped
the glyphs they annotated. A count is information, not an alarm.

### Keyboard

`J` and `K` walk the queue, `C` opens the critical dialog, `E` hides, `Cmd K` opens
the palette. Guarded so nothing fires while somebody is typing in a field, and the
selection always scrolls itself into view, because a shortcut that moves the
selection somewhere you cannot see is worse than no shortcut.

This is the payoff of keeping the queue on screen: triaging eleven issues is eleven
keystrokes rather than eleven round trips through a list page.

---

## 5. The component library decision

The 08-19 notes flag this as open and Gabriel's to propose, and warn against
deciding it by drift. So, explicitly:

**Option A stays on Ant Design v6.** It is the cheap option and its whole premise
is proximity to what exists. antd's Table, Segmented, Popover, Dropdown and Modal
are exactly what the current page is built from, so this option is a token swap and
a layout trim rather than a rewrite. Everything antd cannot express is overridden in
one 90-line stylesheet against the same tokens, and every rule in it states why it
exists.

**Option B moves to Mantine v8, and the reason is coverage rather than taste.** This
option needs a command palette, a drawer, a scroll area with sticky group headers, a
segmented control, a combobox and a kbd. Mantine ships all of them, themes through
CSS variables (so the bridge is a mapping rather than a fight), and has a genuinely
larger set: roughly 120 components plus a hooks package. The palette alone is a week
of work and an unreviewed dependency on a smaller kit, which is where the "cheap
option A" argument stops being true for B.

Two things worth being straight about:

- Mantine's `dark` colour tuple is positional, not a ramp: 0 to 4 are text weights,
  5 is the default border, 6 is a hover surface, 7 is the paper background. Filling
  it as a naive ramp is the usual mistake and produces borders that read as text.
  The bridge in `option-b/src/theme/mantine.ts` documents each slot.
- Switching libraries cuts against the componentization mandate, which assumed the
  antd base. The mitigation is that the componentization is in OUR components, not
  antd's: both apps' atoms have the same names, the same props and the same token
  roles, so a component built for one ports to the other by swapping which kit its
  primitives come from. That is what the parallel Storybooks demonstrate.

---

## 6. Storybook

Each app has its own, and each carries five foundations pages that read the real
token modules at runtime rather than restating hex values:

Colour (every primitive ramp plus every semantic role in both themes), Type (every
step at real size, and for B a side-by-side of the serif and the sans so the
contrast-axis pairing is visible), Space (tokens as real-width bars, radii as real
boxes), Elevation (the shadow rule stated and shown), Motion (each duration on
something you can trigger, plus the reduced-motion contract).

Every atom has a story per state, including the ones that usually go unbuilt:
disabled, loading, empty, overflow with text longer than its container, and long
text that actually hits a clamp. The four critical-flag states are storied side by
side with captions, because the entire point of that component is that the states
are distinguishable, and in the live app they are not.

The nav components have stories at 3, 6 and 11 agents. That is the scaling claim,
in a place where it can be checked without running the app.

85 entries in option A, 74 in option B. **All 159 were loaded in a headless
browser and asserted to actually render**, rather than trusted because
`build-storybook` exited zero: the check measures the mounted node count and the
rendered area of the correct root for the view mode, and treats a console error as
a failure. One entry renders nothing, and correctly so: MoreCount with nothing to
report. Both Storybooks also load their real webfonts, which is how option A's was
found to have been silently rendering IBM Plex as the system fallback.

---

## 7. What I verified, and how

Screenshot harness in `tools/`, Chromium via Playwright, device scale factor 2, and
I read every screenshot rather than only producing it.

- Both apps: typecheck clean (`tsc --noEmit`, strict, with `noUncheckedIndexedAccess`
  and `noUnusedLocals`), production build clean, **no console errors** at any
  viewport, **on the development server as well as the production build**. The
  second half matters: React's DOM-validity warnings are stripped from a
  production build, and that is how a nested button survived every screenshot in
  this document's first draft.
- Viewports: 1728, 1600, 1440, 1180 and 900 wide. No horizontal overflow at any of
  them (asserted programmatically, not eyeballed).
- Both themes, at every viewport.
- Interaction states rendered and inspected: the expanded write-up, the menu at
  maximum agents, the collapsed rail, loading, empty, the critical dialog, the
  command palette, and the keyboard walk.
- Option B's row behaviour asserted after it was rebuilt: clicking anywhere on a
  row selects it and the pane follows, clicking the flag opens the dialog WITHOUT
  changing the selection, and `J` still walks the queue.
- **Keyboard focus walked and asserted**, not assumed: tab through the first 30
  focusable elements in each app and require a visible outline or shadow on the
  focused element or its wrapper. Both apps now pass at 30 stops.
- Prose measured, not assumed: 74, 75 and 57 characters per line in A; 68 and 63 in
  B. The first versions of both ran at 100 and 110 characters, because `ch` is the
  advance of the "0" glyph and about 1.4x an average character, so a 72ch cap buys
  100 characters. Both were fixed by sizing the COLUMN to the measure instead of
  capping a paragraph inside a wide one, which also removed the dead space a capped
  paragraph leaves beside itself.
- Contrast: 42 text pairings and 11 surface pairings, audited by the generator,
  which exits non-zero on a regression.

**Seventeen defects were found by looking at renders and are fixed.** They are listed
here because the pattern matters more than the individual bugs: every one of them
passed a code review and failed a look.

1. Option A dark mode read as one flat black plane. The surface ladder stepped 2.5
   Oklab points at a time and the hairlines were darker than the card. Widened to 4
   and 5, borders stepped up, and the surface metric added to the audit.
2. Dark status chips reused the light theme's tint inverted, which landed on a
   mid-saturation red that shouted louder than the row title it annotated. They now
   use dedicated dark tint steps at low lightness and low chroma.
3. antd lays a sortable column header out with `space-between`, so on a wide column
   the sort arrow floated hundreds of pixels from its label and read as an
   unrelated control.
4. Option B's capture pill stretched to the full 400px of the queue column and read
   as a disabled text input rather than a pill.
5. Option B's rail count badges were filled pills, two different fills, overlapping
   their glyphs, and the loudest thing in the product.
6. Both detail panels left large dead areas, in three different ways across three
   attempts. Documented at the top of both stylesheets so the next person does not
   rediscover them.
7. **Four controls in option A had no visible focus ring**, which matters because
   the section above claims every interactive element has one. The theme had
   switched off antd's focus shadow on the assumption that the global
   `:focus-visible` rule would cover it, and antd's own `outline: none` is more
   specific, so the search input and all three sortable column headers had nothing
   but a border-colour change. Found by tabbing and asserting, not by reading.
8. The matched critical description was printed twice in the same dialog, once
   under "it matches this description" and again in the full project list. The list
   now shows only what the block above did not.
9. **A cascade bug kept option B's reading pane in two columns at 820px**, where
   the prose collapsed to a 30-character ribbon. The two-column layout was the
   default and a max-width query collapsed it, but a later base rule at the same
   specificity re-set the column placement and won. Rewritten mobile-first, so the
   narrow case is the default and no later rule can undo it.
10. Option B's meta line used standalone separator dots, so a wrapped line could
    end on an orphaned dot and read as a typo. The dot is now drawn with `::before`
    on the item that follows it, so it always moves with its item.
11. **Option B's list row was a `<button>` containing another `<button>`**, which
    is invalid HTML and breaks the inner control for keyboard and screen-reader
    users. React says so, but only in a DEVELOPMENT build, so it survived every
    production screenshot and only appeared when the dev server was started.
    Rebuilt with the stretched-target pattern: the row is a div, one button covers
    it and carries the selection, and the flag is lifted above it with z-index.
    Two sibling buttons, no nesting. **The lesson is that a production build is
    the wrong place to look for a correctness warning.**
12. **The display badge read "2" before anyone touched it** in option B, because
    `displayChangeCount` measured against the shared default while B starts from a
    different baseline (grouped by impact, different field set). A badge reporting
    the difference between two defaults rather than anything the reader did. The
    baseline is now a parameter each app passes.
13. **The category strip pushed the whole queue 300px down the pane.** Promoting it
    from a child of the old filter row to a top-level row of the column left
    `flex: 1` on it, which had meant "take the leftover horizontal space" and now
    meant "grow vertically". Same declaration, different axis, and the difference
    is only which container it lands in. Caught from a screenshot, then confirmed
    by measuring the height of every direct child of the column, which is now a
    tool.
14. **Three icon controls, three sizes, and no gap between them** at the head of
    option B's queue, then the same mismatch across the pane divider, then a 1px
    width difference from a 15px versus 16px glyph, then a 2px offset between
    option A's caret and its kebab. One root cause: a control family built more
    than once. Fixed with an `IconButton` component per app and an alignment check
    that fails on disagreement.
15. **The search field's text sat 1px from its own focus ring**, and for one build
    carried two plum rings at once. Mantine's `unstyled` variant strips padding
    with the border. The ring now belongs to the row in both options.
16. **The filter menu had no story**, which is why the field audit could not see
    the field that was broken. Storybook covers all four new components now.
17. **Option A's Storybook never loaded IBM Plex**, so every story and the whole
    Type foundations page rendered in the system fallback, arguing for a typeface
    the reader could not see. It had no `preview-head.html`. Found by diffing the
    two Storybook setups against each other, then confirmed with
    `document.fonts.check()`, which is the only reliable test: a computed
    `fontFamily` reports the stack, not which member actually loaded.

Five more were in my own verification tooling, which is worth stating because
the fixes above were chosen from its output. `getComputedStyle().font` returns an empty `getComputedStyle().font` returns an empty
string on non-form elements in Chromium, so the first line-length numbers were
measured in the body font and were wrong. The focus walk reported false failures on
every wrapped control until it learned to look at the focused node's ancestors, since
component kits put the ring on a wrapper. And the Storybook render check reported 61
of 85 healthy entries as broken, twice, first by matching Storybook's always-present
hidden error container and then by measuring the empty container belonging to the
other view mode. The field audit measured padding on the input rather than from
whichever element draws the visible edge, which reports a correct Ant Design field
as cramped, because antd nests inputs in a wrapper that owns the padding. And it
counted a 1px TRANSPARENT border as a visible edge, which reported a
correctly-fixed field as still broken. **A verification tool that has never been
wrong has not been tested**, and every one of these five believed a computed value
without asking whether it renders.

Two of those false positives are still live in `tools/input-audit.mjs`, which is
noted rather than fixed: `tools/field-gap-all.mjs` measures it correctly, and a
half-corrected tool is worse than a documented quirk.

---

## 8. My recommendation

**Ship the comparison as it stands, and expect to pick B's structure with A's
restraint.**

Option A is the honest cheap option and it is genuinely better than what exists:
one less nav level, the impact level readable without hovering, the four critical
states finally distinguishable, no shadow, fewer rules, and a token layer that
makes the next theme change a one-file edit. If the decision is "we want this in
production in a week", it is A, and A is not a compromise.

Option B is the one that answers the question actually being asked. The menu
question is really "will this product still make sense with eight agents", and B's
answer holds without a second layout, because it never spends width on the menu at
all. It also removes more than it adds, which is what the "simplify to the maximum"
instruction should produce, and it makes the product's actual value, the write-up,
the brightest thing on the screen instead of a page you navigate to.

The risk in B is the icon rail, and it is a real one: it trades name visibility for
width, and the command palette is what makes that trade survivable rather than
merely defensible. If we ship B, the palette is not optional.

Two things I would want before committing:

1. **Nikita's read on the Mantine move.** Not on whether it is possible, it plainly
   is, but on what it costs him to maintain two kits during a transition if any of
   this lands in the existing app rather than a clean spin-off.
2. **Mehdi on the rail specifically**, with the agent count slider in his hands. The
   whole design rests on whether an icon-only menu reads as clean or as hidden, and
   that is his call and not mine.

## 9. The issue detail was held back, and in option B it was replaced

Set 2026-08-21, after the recolour. The detail as built was being reworked, so both
options showed a plainly labelled note where it used to be, behind one flag:
`DETAIL_IS_WIP` in `shared/flags.ts`.

**⚠ Option B no longer reads that flag, as of 2026-08-24.** Its detail was not
restored, it was **replaced**: see section 10. Option A is still on the old
expanding-row write-up and still needs the flag, so the flag stays.

**The flag was shared rather than per-app deliberately.** This deliverable is a
comparison, and a flag flipped in one option and forgotten in the other turns the
comparison into a confound. B dropping it is that flag being answered rather than
forgotten: there is no held-back screen left in B to gate.

**Nothing was deleted.** `IssueDetailPanel` and `DetailPane` are untouched, both
keep their stories, and both stories pass `wip={false}`. The design stays
reviewable in Storybook while it is off the page anyone is sent.

What survives in each option is the part that belongs to the LIST rather than to
the detail, because those parts are the structural answer each option is making
and hiding them would take the argument down with the unfinished content:

- **Option A keeps the expanding caret.** Reading in place is its whole answer to
  "where does the detail live", and a dead caret answers nothing. The expanded
  region also keeps the write-up panel's own ground and left inset, because antd
  zeroes the expanded cell's padding and lets the panel supply it - without that
  the note sits flush against the table edge on an unshaded strip and the row
  stops reading as one block.
- **Option B kept the pane, the prev/next arrows and the position counter,** for
  as long as this applied to it. A permanent reading plane is the layout's entire
  premise, so removing the pane would have collapsed three panes into two and
  answered a different question.

What goes, in both, is anything that acts **on** the detail - Rename, Hide, the
critical flag in B's pane header. Offering an action on content nobody can see is
offering nothing, and all three are still reachable from the queue row.

The note itself is the existing `Placeholder` component, extended with `title`,
`note` and `compact` rather than duplicated. There is now one piece of honest
scaffolding in each app with two callers: a destination that was never built, and
a screen that is built and deliberately withheld.

## 10. Option B: the flow, list to write-up to replay

Built 2026-08-24, replacing the held-back detail rather than restoring it. The
brief, in Gabriel's words: *issue list, issue detail very quick scan, selection of
one of the issue replay sessions, watch it* - and *as you get deeper into this
flow, the panels start collapsing with only the main information, so eventually
you see the replay session screen as the main screen but still somehow being able
to see the details and easily go back to the issue list.*

### The rule

**Every step takes its space from the step you just finished.**

That is the whole design, and everything below is that one sentence applied. You
read the write-up in order to pick a session; the moment you pick one, the
write-up has done its job, so it gives its height to the player. It does not
disappear - disappearing would mean navigating, and navigating is exactly what
this layout was built to argue against.

It runs on **two axes at once**, which is the answer to "divide it vertically or
horizontally": *both, and each pane collapses along the axis it already lives on.*

- **The queue goes.** 400px at triage, and nothing once a recording is open: it
  answers "which issue" and you have answered that twice by then. The journey
  panel takes the slot on the other side of the pane.
- **The write-up collapses vertically.** The full article, then its header alone.
- **The session strip never collapses at all.** It is the constant.

### Three depths, three rows, nine cells

The work pane is a flex column of three rows, always in this order, and **exactly
one of them carries `flex: 1` at any moment.** That single constraint is the
entire mechanism: nothing animates height by hand, nothing is measured, nothing is
absolutely positioned.

| row | triage | watching | panel collapsed |
| --- | --- | --- | --- |
| the header | full width | full width | full width |
| the write-up | the whole article | gone, or half while peeked | same |
| the sessions | cards | a chip strip | a chip strip |
| the replay | absent | `flex: 1` | `flex: 1` |
| the queue, on the left | 400px | gone | gone |
| the journey, on the right | absent | 320px | 0 |

**The header spans everything**, and the body under it is a row of two columns:
the flow on the left, whichever side panel is open on the right. That is what
makes the right-hand column a region rather than one special case - both columns
begin under the same top edge, so the control that opens each panel sits in the
header, and a second panel is a second glyph rather than a second layout.

**Depth is derived, never stored.** There is one fact behind it - has a session
been opened - plus the full-width toggle. Storing a `depth` string would create a
second source of truth and with it the classic prototype bug: a screen that says
it is watching with nothing to watch. Here that state cannot be represented.

### The session strip is the constant, and it does not move

Everything else either collapses or appears. The strip does neither: it is on
screen at every depth, in the same slot, and it is what carries you from "which
session" to "watching one" and back. One component with two densities, not a list
and separately a tab bar that happen to hold the same data.

It does not travel between depths either. It sits directly under the issue, and
when the issue collapses from an article to its header **the strip rides up
because the thing above it got shorter.** Nothing jumps; the space above it is
what changed. That is the trick that makes the collapse read as one movement
rather than as a re-layout, and it is why the strip's slot was fixed before
anything else was designed.

At triage it is wide cards with the **variation** at reading size, because three
sessions of one issue are not interchangeable - one person retried twice, one gave
up instantly, one was on a phone - and choosing between those is the entire reason
to pick a session rather than take the first. While watching it is one row of
chips carrying **the same variation**, so the tab and the card you clicked say the
same thing.

The chips used to be labelled with the person: `daniel  12m1s`. That is an
identifier for somebody you have never met. It sorts three tabs without telling
you a thing about which one to open next, and it silently changed the subject
between the card ("pay button reset on mobile") and the tab for the same session
("amara"). The label a tab needs is **what is in the recording.** Identity is one
hover away, and it is on the card you chose from.

### The header is one object at every size, and it belongs to the pane

The collapse does not rebuild the header and does not drop controls out of it.
Same markup, same height, same back button on the same pixel, same labelled
critical flag, same overflow menu. The only thing that changes between the sizes
is whether anything is rendered **under** the header, and the caret turning over.

It is also no longer the write-up's lid. It was, which meant it stopped where the
write-up stopped while the journey panel started at the very top of the window
beside it: two pieces of chrome on two different top edges. `IssueHeader` is now
the pane's own header and everything else hangs below it, which is what let the
panel toggles move into it. Collapsing the write-up is now literally
`IssueContext` not rendering, so there is no second, smaller copy of a header to
keep in agreement with the real one.

An earlier version kept the journey sentence on a second line while collapsed,
reasoning that what survives a collapse should be *what to look for* rather than
the metadata. The reasoning was right and the placement was wrong: two lines made
the bar taller than the header it was supposed to be, which pushed the back button
off its own centre line, and it left the row carrying a glyph where the expanded
state carried a labelled button. Two rows that are meant to be the same row cannot
differ in height, in controls, or in what they say.

What to look for did not get dropped, it **moved to where it belongs**: the
journey panel on the right, one step per row, on the clock. The write-up still
promotes the journey to second position, right after the meta line, with a rule
down its left edge in the accent, so the sentence, the panel and the track under
the player are recognisably one object seen three ways.

### Getting back

Every step out is one click on the thing you want back, which is the same
principle as going in:

- the **bar** re-opens the write-up over the top half, *with the replay still
  playing underneath*, for when you need to re-read the fix without losing your
  place;
- its **chevron** leaves the session and returns the cards;
- the **queue** is one Esc away, and picking a different issue restarts the flow -
  you have not chosen a session for that one, so there is nothing to watch;
- **Esc** unwinds exactly one level, **Enter** goes one level deeper, and neither
  is a mode switch: both move you along a path you can also click.

### The player: mock content, real clock

Faking a recording would have produced a screenshot with buttons drawn on it, and
would quietly claim the product can already do something it cannot. What is being
designed here is the **frame** - how much room the replay gets, what stays beside
it, how you move between the sessions of one issue, and how you get back - and
none of that needs real pixels.

So the viewport is an unmistakable wireframe, and it earns its place by being
informative rather than convincing: **the timeline's markers are the session's own
journey string, split on its clauses.** Hover one and it names what the person
did; the caption under the cursor tracks the clause the playhead is inside. Scrub
and you read the story, and it cannot contradict the write-up because it *is* the
same sentence.

Everything that looks like a control is one: play, pause, drag-scrub, speed, the
markers, and **"Jump to the failure"**, which seeks to four seconds before the
first error or rage marker and plays. That button is the payoff of the whole flow.
Someone arriving here already knows what went wrong; what they want is the eight
seconds where it happened, and making them hunt for it on a track is the small
indignity this design exists to remove.

### The queue leaves and the journey takes its place

The queue answers *which issue*. By the time a recording is playing you have
answered that twice: once picking the issue, once picking the session. So the
column that exists to help you decide is not narrowed to 232px and parked beside
the player, it is **gone**, and what stands in the same slot on the other side of
the pane is about the session you are actually watching.

An issue and a session inside it are two different things, and the layout now says
so. You move between issues on the list screen, with the detail and the session
thumbnails in front of you. You move between the recordings of one issue on the
replay screen, with the tabs above the player. There is never a list of the ten
issues you are not watching next to the one you are.

That also fixed a keyboard bug the old layout had been hiding: J and K walked the
queue at every depth, so at watch depth they changed a selection nobody could see.
They now walk **the sessions** while a recording is open, which is the same move
the tabs make.

### The journey panel: a scrubber, not a summary

Every row seeks. The step the playhead is inside is lit, and the thread above it
is drawn in the accent, so the column reports position as well as content and the
replay can be driven from either axis: the track along the bottom for time, this
column for meaning. There is **one playhead**, owned by the work pane, because two
things read it. Two clocks would be two recordings.

Three things earn a row and nothing else does.

**The glyph** says what kind of event it was, from the same table the track under
the player colours its markers from - one table, so "rage" cannot look like one
thing on the track and another in the panel. Only three kinds are allowed to be
loud: an error, a rage burst and a stall are the three things worth scrubbing to,
and everything else is a quiet tick so those three have a rhythm to stand out
from.

**The page** is printed once, on the step that arrives on it. A path repeated down
every row is a column of identical text that teaches nothing; printed on change it
becomes the chapter heading of the session. The thread runs on behind the heading,
because a page change is a break in the page, not in the journey. Steps that name
no page inherit the page the last one named, which is what makes "print on change"
possible at all.

**The failure** is marked in the danger colour, and marked *only there.* The
temptation is to grey out everything after it as aftermath, and that is wrong:
what the person did after it broke is frequently the most useful part of the
recording - the retries, the hunt for an error message, the abandonment. The steps
that follow are ordinary steps. The ring and the glyph say it and there is no
caption under the row: a label spelling out what a red warning triangle already
means is the one thing on this panel that would be there twice.

### The panel collapses from the header, and that killed "full width"

The toggle is a glyph at the far right of the pane header, behind its own
hairline, because everything to its left is about the **issue** and everything in
that group is about the **pane**. One glyph today; the divider is what will make
the second one read as belonging to a set rather than as an item appended to the
issue actions.

Adding it exposed a duplicate. Once the queue stopped rendering at watch depth,
the `theater` / "full width" toggle had exactly one remaining effect - hiding the
journey - which made it the same control as this one wearing a different name,
with its own button in the player transport. So `theater` is gone and the state is
`sidePanel: 'journey' | null`. A named panel is the value that survives a second
panel being added; a boolean is not. `F` and the header glyph now do one thing,
and the transport has one fewer button on it.

The rows under the pane header line up, too: the session strip was 44px and the
panel's own label row was 52px, so two hairlines that read as one line missed each
other by 8px. They share `--m-subheader-height` now, because "the row directly
under the pane header" turned out to be a layout idea two components have rather
than a number each of them picks.

The steps are the same clauses the write-up numbers and the track marks, split by
the same function. Splitting prose is shallow by design and it is the honest
option here: the alternative was inventing a plausible-looking event stream, which
would have produced a panel that looks right, says nothing, and can contradict the
paragraph one collapse above it.

**Measured, not eyeballed.** The thread is 1px, and at 1px `--m-border-default`
(#282528 on a #1d1b1d surface) is four Oklab points and invisible in dark mode -
while the same token reads fine as the 22px ring around a node. The wire uses
`--m-border-strong`. That is only findable by rendering it and reading the
computed values back.


### Three sessions, always, and nothing resizes when you filter

Two complaints, one cause. Clicking search grew the band by 14px and pushed every
card down; filtering three sessions to one grew that card from 17rem to 24rem and
its thumbnail with it. Both were the band sizing itself to its contents.

**The header row is a fixed height.** Three things take turns in it - the hint,
the loader, and the search field - and the field is a 32px control while the hint
is a line of 12px text. A header that moves the content when you touch the header
is the loudest possible way to say "something happened" about the least
interesting event on screen.

**The rail is a three-column grid, not a flex row.** A flex row shares its width
between however many cards are in it, so the count and the size were the same
fact told twice, and the second telling was the one nobody asked for. A grid gives
every card the same column whether three arrive or one does.

**The band is capped at three**, and that is what lets the grid have a fixed
number of columns at all. It is not a session list, it is a SHORTLIST: nobody
watches eleven recordings of one bug, they watch the two or three that show it
clearest. `rankSessions` says what clearest means, most decisive tie-break first:
how clearly it fails (an error beats rage clicks beats a stall - you are picking
evidence), then how much of the story is on it, then how long it takes to watch,
shorter winning. Stable, so equal sessions keep the order the data gives them and
a shortlist cannot reshuffle between renders.

The label says `x of n` whenever the band is showing fewer than the issue has,
whether a filter or the cap did it. A bare "3" on an issue with eight sessions
would be the band shortening its own label by lying about the issue.

**One shortlist, derived in the controller.** The cards, the chips, the arrows and
`J`/`K` all read it. Two of those used to derive "the three sessions you can hop
between" independently, which is exactly how the chip that is highlighted stops
being the chip that is playing.

### The strip: what is on it, and every control at one end

The chips had an arrow at each end with the list between them, which is a pager
wrapped around a list you can already click. With three chips on screen "next"
is a slower way to do what pointing at the next chip already does.

**The left end says what is on the strip, not where the playhead is.** The
playhead is already reported by the chip that is lit and by the clock under the
player. What a strip showing three of a hundred and thirty needs to say is that
there are a hundred and thirty.

**Every control is at the right end, in one group.** Show more adds three.
Autoplay rolls one recording into the next - a mode, so it survives moving
between sessions and between issues, because somebody who asked to be played
through did not ask once per recording. The arrows follow behind their own
hairline, and **only when the chips actually overflow**, measured rather than
guessed from a count: the pane narrows when a side panel opens and a chip is as
wide as its variation, so a threshold on the number of them would be wrong at
both ends. The overflowing edge fades, because a row of chips cut off dead
straight at the pane edge reads as a rendering fault rather than as "there is
more".

The chip that is playing is scrolled into view whenever it changes. A pager that
moves the selection somewhere the reader cannot see is worse than no pager.

### A hundred and thirty sessions, because three of three proves nothing

The eleven issues carry two or three hand-written sessions each, because those
are the ones with a real journey on them and everything downstream - the
write-up, the timeline, the cursor walk - is derived from that prose. A real
issue is hit by dozens or hundreds of people, and a strip that can only ever say
"3 of 3" cannot answer the question the strip exists to answer.

So the pool is derived, roughly proportional to impact: the top issue lands near
130 and the pricing bounce near 28. The hand-written sessions come first,
verbatim, and the rest are the same issue happening to other people - same
variations, same journeys, same tags, on different people, devices and places.
**Nothing is invented about what happened, only about who it happened to**, which
is the one part of a session the rest of the app never reasons from. Deterministic
and memoised per issue, the second of which matters for more than speed: the app
turns a shortlist entry back into a player index with `indexOf`, so a pool rebuilt
on every render would break the selection rather than merely cost something.

That immediately exposed a flaw in ranking by quality alone. The first render of
the strip read "Retried the same card twice, then left" three times over, at
10m13s, 10m15s and 10m17s: the best example of the commonest way it fails, in all
three slots. Three recordings of one story is not a shortlist, it is the same
card dealt three times. The front of the list is now **one session per variation**,
each the best of its own kind, with the duplicates behind them for anyone who
presses show more.

### The loader is the logo

Re-ranking a shortlist is real work in the product this prototypes: the agent
scores the sessions against the query, and that is a round trip. Pretending it is
instant would design a band that cannot exist, so the prototype spends the time
and shows what the reader would actually see.

**Skeletons in the exact three slots**, built out of the card's own classes rather
than a second set of boxes that happen to be about the same size, so they cannot
drift from the card they stand in for and the band is exactly as tall loading as
loaded.

**The mark, turning, in the middle.** The Melonade mark already has one honest
piece of motion in it - the disc and the small square trading places - and it is
the only watermelon thing in this app, so it is the one element that can move
without competing with anything; a ring spinner beside it would have been a
second animation saying the same word. It drives the same `is-turned` state the
mount flip and the hover use, so there is one turn in the component and three ways
to ask for it.

It sits behind **two pixels of blur and a breath of the pane's own surface**, not
a curtain: the three slots stay legible through it, which is the point of having
drawn them. And it stays long enough to be read rather than glimpsed - a 200ms
loader is a flash that reads as a glitch, and the thing it stands in for is an
agent re-scoring a hundred and thirty sessions.

**The band does not move.** Getting there took three passes and each one was a
place where a height was a function of its own contents rather than a constant:
the header row sized itself to whichever of the hint, the loader and the search
field was in it; the variation clamped at two lines without reserving two, so a
card's height depended on how long its own headline was and three cards in a row
came out at three heights; and the last two rows of the card were the sum of
whatever a plan chip and a device string happened to measure. All four slots are
now pinned by the card's own rules, and **the skeleton adds nothing of its own** -
it takes those rules and centres a bar in each. Traced every 50ms across the
whole cycle, the band, the card and every part inside it hold one geometry from
start to finish: `600/400`, `331`, `217.1 / 39.2 / 20.0 / 17.0`.

### The strip's controls are always there, and go quiet instead of vanishing

Four buttons, always drawn, disabled when they have nothing to do. This is the
one place in the app that breaks the "controls are simply not part of this
depth" rule, and it earns it: the bar is beside a running replay, the reader is
watching rather than reading, and a control group that changes width every time
the list grows or the selection reaches an end is movement in the corner of the
eye of somebody trying to watch something else. **A steady bar of four is
quieter than a correct bar of one to four.**

The glyphs got simpler with them. Show-more was a list-with-a-plus and autoplay
a list-with-a-triangle: two dense marks that had to be studied, side by side, at
15px. They are now a plain `+` and a circled play, which is one idea each.

### The write-up got a Details tab

The article answers what happened and why. Details answers **who and where**,
which is the other half of a session and the half you reach for once the
write-up has convinced you: which browser, which country, is this a phone, what
plan are they on.

It appears exactly when there is a session to be detailed, which is while a
recording is open. At triage the fact grid at the top of the article is already
saying the issue-level version, and a third tab repeating it would answer a
question the header answered two inches above.

Every fact is either read off the session or looked up from a table keyed by
something the session already says, so a version cannot contradict the browser
beside it. The row's NAME is the value doing the naming wherever that is natural
- "Germany", "Chrome", "Mac OS X" - because "Country: Germany" is the same word
twice.

It also exposed a ranking bug worth keeping. The derived sessions were
displacing the hand-written ones purely by being a few seconds shorter, so the
Details tab filled up with people the write-up above it had never mentioned.
`rankSessions` now puts **a session the agent has written up above one it has
only counted**, which is both the right product statement and the reason the
tab shows daniel@black-bird.io in Frankfurt rather than a name from a table.

### The queue collapses too, from the same header

The queue already leaves on its own once a recording opens. This is the other
half: a reader who has picked their issue and wants the whole pane for it can
put it away without going a depth deeper. The control is a `PanelLeft` at the
far left of the pane header, **mirroring the side-panel toggles on the far
right** - left control for the left column, right controls for the right one -
and it stays put whether the queue is open or shut, so there is one place to
look for it either way.

**The width it frees is margin, not room to fill.** An article that simply
expands into whatever the window gives it ends up at a 140-character measure,
which is unreadable for exactly the reason a newspaper column is narrow, and the
session cards end up as three enormous stills of a wireframe. Everything is
capped at 74rem and the difference goes to the sides.

Capped by **padding**, not by width, and that distinction cost a render to find.
The bands' backgrounds have to stay full bleed, because the suggested fix and the
sunken sessions band are the pane's own furniture rather than cards floating in
it. And `max-width` plus `margin-inline: auto` on a flex child cancels the
stretch and leaves the box shrink-to-fit: the article did not notice, because a
paragraph's max-content is wider than the cap, but the session rail came out at
846px of a 1184px allowance with its three cards huddled in the middle of the
pane.

### Triage is one document

The write-up and the sessions band were two boxes with heights of their own, each
with its own scrollbar. That is where the dead space came from: the article was
stretched to the pane so the fix strip could be pushed to the bottom by
`margin-top: auto`, which spent the difference on an empty band between the prose
and the answer - in the one place where the next thing to read is directly below.
The cards band was capped at 25rem for the same kind of reason.

One scroll now, and every section is exactly as tall as its contents, so the
space between the prose and the fix belongs to the prose and the space under the
cards belongs to the cards. The last section grows into whatever is left, so the
foot of the page is the sessions band rather than a gap after it.

What this gives up is the old promise that the picker is never below the fold.
That promise was being kept by two fixed heights and it was costing two
scrollbars with no way to tell which one you were in.

It also cost a second pass to get the air back. When the article was pane-height
the breathing arrived for free, as the gap left over above the fix strip; once
every section became exactly as tall as its contents the whole pane went tight,
and **the difference between "no dead space" and "no space" is padding.** The
article now has 2.5rem on all four sides, the fix band 2rem, the sessions band
2rem over 2.5rem, and the gaps inside the article went up a step. Deliberately
generous at the article's foot, because the next thing under it is a tinted band
with a rule on top and prose that runs into a rule reads as prose that was cut
off.

The peek keeps the tight rhythm. It is a fixed half of the pane laid over a
running replay, so every line of air it takes comes straight off the video
underneath, while the same air in a scroll costs nothing. Same component, two
jobs, and the spacing is the part that has to differ.

### Two things in the queue's chrome

**The capture control is a glyph now.** It was a wide pill on a row of its own
reading "2 segments ~8%": 40px of column height spent on a setting somebody
touches once a month, and it read as a filter chip while being the opposite of
one. It sits in the toolbar with search, filters and display, with the count on
its badge, and behind it is the same panel it always had.

**The sort direction moved to the right of the field it applies to,** and the
pair is exactly as wide as the three selects around it, so all four controls in
the display panel end on one line. It used to lead the row from the left, which
put one select's left edge 40px in from the other two and made a column of three
read as a column of two and a half.

### The fix is the third tab

Three answers, read in order: what, why, what to do. The fix used to be a tinted
full-bleed band pinned under the article, and that was the right call while it
also carried the only Jira button in the pane - the answer could not be the thing
that scrolled off.

The action moved to the pane header, at every depth, and once it had the band was
a highlight drawn around a sentence whose button had left. It was also charging
the peek 125px of a running video to say so. So the sentence joined its
neighbours: same size, same colour, same measure, **marked rather than
coloured** - one rule down the left in the accent, which is the ornament this
article already spends on the journey. The two places the agent has something of
its own to say are now marked the same way.

The peek came down from 50% of the pane to 42% with the band gone. Still a fixed
fraction rather than the content's own height: it sits over a running video, and
a panel that changes height when you switch tabs is the video jumping.

### The one action, at two widths

The labelled "Create Jira task" lives in the suggested-fix band, which is the
right place for it while you are reading. But the band is off screen the whole
time a recording is playing, and "file this" is exactly what somebody does two
minutes into watching one. So the pane header carries the same action at icon
width: same fill, same glyph, same handler, no room for the words.

That is a second filled accent in the pane, which the "one primary action, and
it lives inside the fix" rule was written to prevent. It is the same action
rather than a second one, and the two are never both on screen at a moment when
the band's version is reachable, so the rule holds in the form that mattered:
there is one thing to do next, said once.

Once filed, both of them stop offering to file it again and report the key
instead. A primary that stays primary after it has been used invites the second
duplicate ticket.

It sits AFTER the critical flag. The flag is a statement - somebody's
description matched - and the button is the action that statement argues for, so
left to right is a reason and then its consequence.

### The switch had no off state

Mantine draws the off track in its own gray.4 and the thumb in pure white, which
in the dark theme is a `#282528` track on a `#282628` popover: the track vanishes
and all that is left is a bright dot floating in the panel, saying nothing about
which side it is on. A toggle whose off state is invisible is a toggle you have
to click to read. The track now carries the state - sunken and outlined when off,
filled with the accent when on - and the thumb steps down from pure white so it
reads as the handle rather than as the loudest thing in the panel.

### The dark border ramp was broken, and the journey panel is where it showed

The complaint was that the journey sidebar had "only one weird divider". It was
right, and the cause was three tokens rather than that panel. Measured against
dark's own `#1d1b1d` surface:

| token | was | ratio | now | ratio | light's step |
| --- | --- | --- | --- | --- | --- |
| `border-subtle` | `#1e1b1d` | 1.002 | `#2c292b` | 1.189 | 1.186 |
| `border-default` | `#282528` | 1.129 | `#322f31` | 1.293 | 1.298 |
| `border-strong` | `#4a464a` | 1.847 | `#3f3c3e` | 1.571 | 1.560 |

`subtle` at 1.002 was not a faint border, it was **no border**. Every horizontal
seam in the work pane is drawn in it - under the pane header, under the session
strip, under a panel's own label - and none of them rendered, which left the
journey panel's vertical edge as the only line on that half of the screen with
nothing to belong to. The ramp was also out of order once measured, with `strong`
further from the surface than light's is and `default` closer, so "subtle <
default < strong" was true by name and not by contrast. Matching light's contrast
steps fixes all of it and is the same rule the surface tokens already follow.

On top of that the panel now has dividers of its own: each page heading sits on a
rule that runs to the panel edge, with air above it, so a page change reads as a
chapter break. The thread runs on **behind** the heading, because a page change
breaks the page and not the journey.

### The sessions band got the queue's toolbar

The band under the write-up is a list of things with a header, so it now
introduces itself the way the queue does: label and count on the left, search and
filter on the right. Two lists in one app cannot have two different grammars for
that.

It is the **same `FilterMenu`**, not a second one that looks like it. The
component was generic in everything except its key type, so `FilterKey` became a
type parameter and the dimension-to-glyph map became a prop; the queue's map is
still the default, so every existing callsite is untouched. Two filter menus that
merely look alike drift the day one of them gains a feature.

The vocabulary is the band's own - plan, browser, device, tags - built from the
sessions actually present rather than from a fixed list, because three sessions of
one issue are frequently all on Chrome and a menu offering Firefox with a zero
beside it is a menu describing a different issue. The search covers what is
visible on a card (the variation, the person, the place, the device), not the raw
journey, which would match on words that are nowhere on screen.

The state is **band-local, deliberately not in the issues controller.** Narrowing
this issue's sessions is a way of reading one band, not a filter on the app: it
has no business surviving a walk to the next issue, and hoisting it would have
meant remembering to clear it on every path that changes the selection.

### The session card leads with a still

A picker for recordings without a still is a list of filenames, and this card
spent its first version being exactly that: three paragraphs of prose in a row,
distinguishable only by reading them.

The thumbnail is now the largest thing on it, and **it is not frame zero.** Every
session of one issue starts on the same page and looks identical at 0:00, so the
opening frame would give three identical pictures and teach nothing. It is the
**failure moment**: the cursor sits where the click that broke that session
landed, with the ring held on it, and the frame is labelled with the journey
clause it belongs to. Three sessions of one issue then look different from each
other, which is the only thing a thumbnail is here to do.

It is the same `ReplayFrame` the player draws, at the card's width, and that
matters more than it sounds. The alternative was a second, smaller wireframe that
looked roughly like the first, and two drawings of one page drift silently: the
card would keep showing a checkout with three fields long after the player had
four. The frame sets no size of its own; everything inside is in container units,
so identical markup scales from a 1500px stage to a 280px thumbnail.

Consequences worth noting: the variation dropped from three lines to two, because
the frame now carries the weight it used to; the duration moved onto the still
where a video puts it; and the "Watch" text link went away, because a still with
a play badge already says what a click does.

### The bar and the write-up were two objects; now they are one

The complaint was that the collapsed bar and the expanded write-up had nothing to
do with each other, and it was right. They were built as two different things:
the bar had the title on it, the expanded header did not, so expanding moved the
title off the bar and down into the body at a different size, a different face
and a different position. The transition read as a swap rather than as a growth.

**The bar is now the header at every size except triage,** unchanged, and
expanding grows what is underneath it. Only the caret turns over. Triage keeps
its serif title in the article because there the write-up is a document and the
bar carries an eyebrow instead.

That first pass got the title right and left three other things behind: the
collapsed row was still taller, still carried a glyph where the open one carried a
labelled button, and still had no overflow menu. It is now literally one piece of
markup rendered at every size. See "The header is one object at every size" above.

And the peek's content changed with it. It now drops the title, the fact grid and
the footer - not to save space, but because that is what the peek is *for*. You
opened it while a replay was running, so you know which issue it is and you read
the numbers already. What is left is the three things you might actually have come
back for: the steps, the diagnosis and the fix.

### The write-up was too text-heavy, and none of it was reworded

The verdict was that a reader would not understand a thing, and the shape was the
reason: a title, a run-on meta line, an italic sentence, a tag row, then a
hundred-word paragraph. **Nothing was reworded.** The dataset is shared with
option A and rewriting it would make the two options incomparable, so every change
is structural.

1. **The meta line became a 2x2 fact grid.** Impact, found in, sessions, last
   seen, each labelled and readable on its own. The old line ran all four
   together with dots between them: one sentence built out of four unrelated
   facts, ranking none of them. A fixed 2x2 rather than `auto-fit`, which gave
   three across and one orphan and read as a layout that ran out of room.
2. **The journey became numbered steps, and this is the one that matters.** That
   sentence was always a list, set as one italic run because that is how it
   arrived. Split on its own clauses it is five steps you can count - and they
   are the SAME clauses that become the markers on the replay timeline, because
   `splitJourney` in `shared/replay.ts` produces both. Read the steps, scrub the
   track, glance at the collapsed bar: one object, three appearances, which
   cannot disagree.
3. **The diagnosis leads with its first sentence,** separated by weight and
   colour rather than size. A size step was tried at 20px and a 20px sentence
   under a 26px serif title reads as a second headline, shouting at a reader who
   is only trying to find out what broke.
4. **The tags moved to the bottom.** They are labels for filtering, not content,
   and they were sitting between the reader and the diagnosis.

### It fits on one screen, and that was measured (superseded by the tabs above, but the method stands)

The write-up was a single 36.5rem column in a 984px pane, using 584 of them and
making the reader scroll for the fix. It is now **two columns**, and the split is
a real division rather than a way of consuming width: left is the EVIDENCE (what
it is, how much of it, what the person did), right is the DIAGNOSIS (why, and
what to do). Neither depends on the other, which is what a two-column layout
needs in order to be readable at all.

The widths are **asymmetric on purpose**. 32.5rem on the right keeps the full
69-character measure, because that column holds the only real prose. 22.5rem on
the left carries a title, four figures and five short steps, none of which ever
reach a full line. An even split would have given both columns 59 characters and
spent the measure on lines that were never going to use it.

The threshold is a **container query on the pane, not a media query on the
window**, because the pane's width depends on the queue beside it and the queue
changes with depth and again at two breakpoints. A viewport query would have been
wrong at three of those combinations.

**Fitting was arithmetic, not a guess.** `tools/fit-check.mjs` reports the actual
overflow of the scroll region and the height of each column, and
`tools/fit-all.mjs` does it for all eleven issues, which is the check that
mattered: after the first pass every issue fitted except one, by 14px, because
its diagnosis paragraph is longer than the rest. Trusting the first issue to be
the tall one would have shipped a layout that scrolls on the second row of the
queue. The last 60px came from folding the tags into the fact grid as a row of
their own (46px against the 80px the old footer cost) and moving the impact
footnote onto the impact figure it describes, which is where it belonged anyway:
it was a caption sitting two hundred pixels below the number it explains.

Every issue now fits at 1440x900, 1512x945 and 1680x1050. Below about 1280 wide
the pane cannot hold two columns at a readable measure and the article stacks and
scrolls; that is the honest limit of the layout rather than something papered
over.

### One primary action, and it lived inside the fix (superseded: see "The fix is the third tab")

**Create Jira task**, filled brand, and the only filled brand button in the view.
The system rations the accent hard, so the one thing wearing it is the one thing
worth doing next.

It sits **inside the suggested-fix panel**, not in the header, because it acts on
the fix: the sentence above it is what gets carried into the tracker, and a button
parked in the header is an action floating away from the thing it acts on. It is
also the last element in the right-hand column, which is where the eye finishes.

The dialog is a **draft, not a form**: summary and description arrive prefilled
from the write-up the person was just reading, so the work is reviewing rather
than composing, which is the only reason a button like this belongs on a triage
screen. Both fields stay editable, because a ticket is written for a team with its
own conventions.

Once filed, the button **stops offering to file it again** and reports the key
instead. A primary CTA that stays primary after it has been used invites the
second duplicate ticket.

The icon is the real one, geometry taken byte-for-byte from
`app/components/ui/Icons/integrations_jira.tsx` in the app this replaces. One
thing changed and only because the destination did: the shipped icon is
greyscaled for a light integrations list, and a mid-grey mark on a plum button is
muddy at 16px, so the three fills are rebound to `currentColor` at the opacities
the greyscale was expressing. The paths are untouched.

### Third structure, and the first calm one: tabs

The verdict on the two-column version was "everything is so cluttered", and it
was right for a reason worth recording as a rule.

**Fitting and breathing are opposites when the amount of content is fixed.** The
round before this one asked for the whole article to fit on one screen without
scrolling, and the way I got there was to pack it into two columns. That is
denser, not calmer. The only way to have both is to put LESS on screen at once,
which is what tabs are for.

The pane is now three parts and only the middle one changes:

| part | what is in it |
| --- | --- |
| header | the title, and one row of labelled facts. Always there. |
| tabs | **What happened** / **Why it happens**. One block each, with room. |
| fix | pinned under the scroll by `IssueContext`, always on screen. |

**The header is always there** because "which issue is this and is it worth my
time" is the question you re-ask every time your eye comes back to the pane. The
facts went back to ONE ROW: the 2x2 grid only existed because they lived in a
360px column, and with the column gone they spread across the pane and take one
band instead of five rows.

**The suggested fix is deliberately not a third tab.** It is what this product
sells, so it cannot be the thing that scrolls off and it cannot be behind a tab a
reader might not open. It sits outside the scroll region as the pane's foot,
which also decides where the leftover room goes: above the strip, not trailing
underneath it as dead space.

An earlier attempt kept it inside the article with `margin-top: auto` and a
full-height article. That does not work and the reason is worth knowing: Mantine's
ScrollArea wraps content in a table-display box, so a percentage height never
resolves and the strip sat wherever the tab panel happened to end.

**Everything stepped down one size** - title 26 to 20, prose 17 to 15, steps 15
to 14 - which is about a fifth of the vertical space on its own and is most of
why the tabs can afford to be generous rather than merely shorter.

### The journey runs across the pane now

The steps were a vertical numbered list in a 360px column: a perfectly good list,
and a waste of a 984px pane, with five short clauses stacked in a strip while two
thirds of the width sat empty. Read left to right they become what they always
were, a sequence in time, and the room was already there.

It is also the third drawing of one object. The write-up steps, the markers on
the replay timeline and the line on the collapsed bar all come out of
`splitJourney`, and this one now LOOKS like the timeline as well as agreeing with
it: numbered stops on a rule, in order. The steps share the width rather than
sitting at a fixed size, so three spread out and six tighten up instead of one of
those looking broken.

### Two measures the render corrected

Both found with `tools/measure-prose.mjs`, both invisible in the code.

The **fix sentence** was running 112 characters across a 1275px strip, which is a
wall of text wearing a tinted background. Capped at 30rem it is 73, and the button
then sits at the far end of the row rather than beside it, which is where an
action belongs on a full-width strip anyway.

The **diagnosis** was running 107. Dropping the prose from 17px to 15px pulls the
measure down with it - 70 characters is 455px at that size, not 584 - and a single
455px column in a 1275px pane is a thin ribbon with 800px of nothing beside it. So
the lead and the body sit SIDE BY SIDE, each at 65 to 68 characters, and together
they use the row. `auto-fit` was tried for that and produced one column in a 920px
container: browsers count auto-fit repetitions off the track's MAX in a `minmax`,
not its min, so a 30rem cap made a second column impossible. Two stated columns
above a stated container width is predictable, and the width that matters is the
pane's rather than the window's.

### The track came out, the banner went full bleed

Two corrections to the tabbed version, both in the same direction.

**The journey is one small paragraph again.** It had become a horizontal
numbered track with circled stops and rules between them, echoing the replay
timeline. It was handsome and it was too much furniture for a sentence: five
short clauses do not need five circles, four rules and a row of their own to be
read in order, because the sentence already reads in order. What the track was
actually doing was announcing itself in a pane whose entire brief is to stop
announcing things. It is now the journey at 13px, in reading colour, at a real
measure - the same sentence, set the same way, that rides the collapsed bar
above a running replay.

**The suggested fix is full bleed.** It was an inset card with a radius and a
border on four sides, which made it one more object floating in a pane already
full of objects. Edge to edge with a single rule above it, it stops being a card
and becomes the pane's foot: a band you cannot mistake for content, holding the
one thing you are meant to do. It also buys back its own side margins and the
28px of gap that used to sit under it.

The tab panel's `min-height` went with the track. It existed to stop the pane
resizing under the cursor when the two panels differed by 112px; with a
paragraph on one side and two prose columns on the other the difference is small,
and a floor now just prints an empty box under the shorter tab. And the check
that guards all of this got stricter: `tools/fit-all.mjs` now measures BOTH tabs
for every issue, because the taller one decides whether the pane scrolls and it
is not the one that loads first.

**Where it fits:** every issue, on both tabs, at 1440x900 and above. At 800px of
window height the "Why it happens" tab still scrolls by about 40px on the longest
issue, and that is the stated floor rather than something papered over.

### One prose treatment for both tabs

The two tabs were set differently and there was no reason for them to be. "What
happened" was one small paragraph; "Why it happens" was a medium-weight lead
sentence followed by lighter body text in two columns. Three typographic voices
in a tab whose neighbour has one, and the effect was that the two tabs read as
two different documents rather than as two answers to two questions.

Both are now the same: one paragraph, 13px, reading colour, one measure. The
lead emphasis went with it. It had been a place to stop skimming, which is a
real thing to want, and it was also the thing making the tabs look unrelated -
and consistency between two adjacent views is worth more here than a skim point
inside one of them.

**The measure had to come down, not up.** 34rem was inherited from the 17px
version and ran 92 characters at 13px: a smaller face needs a NARROWER column for
the same measure, which is the opposite of the instinct. 24rem measures 68 on the
render.

One consequence, stated rather than hidden: the diagnosis is now a single narrow
column instead of two, so it is taller. At 1440x900 and above everything still
fits; at 800px of window height the Why tab scrolls by about 90px on the longest
issue, up from 40.

### The tab block is one column, rule included

A 384px paragraph sitting under a rule that runs the full width of the pane
reads as a mistake, not as a column, and that is exactly what it looked like.
The prose is measured, so it can never fill a 1300px pane; the rule could, and
the mismatch was the error.

Capping the whole tab block to the measure fixes it: the two tabs, their
underline and their content are now visibly one object, and the rule ends where
the text ends. The header above stays full width because it IS a band - five
facts across a row, not a measure.

With the width now coming from the block rather than from the paragraph, the
prose went back up to 15px: at 13px the correct measure was 384px, which is a
ribbon. 15px in a 28rem column is 69 characters and the column has some
presence. The leading came down from 1.65 to 1.5 to pay for the height that
bought, which was 13px over the pane on the longest diagnosis.

### Full width, and one typeface

Two corrections, and I got the first one backwards before I got it right.

**The prose runs the full width of the pane.** I read "wrong width" as a
mismatch between a measured column and a full-bleed rule and fixed it by
bringing the rule in. That was the opposite of the point. The reasoning is about
the page rather than the paragraph: a line that uses the whole pane is two lines
instead of eight, and the seven lines it gives back become the whitespace that
keeps this pane off a scrollbar. Vertical room is the scarce thing here.

It costs measure - roughly 150 characters against a 65-to-75 ideal - and that is
a trade made deliberately. If the lines ever read as too long, the honest fix is
CSS columns across the same full width, not a narrow column with dead space
beside it.

**The pane is on one typeface and one scale.** The issue title was Instrument
Serif at 20px, this option's type identity: a grotesk for the interface and a
high-contrast serif for the one thing the product sells. On the issue title it
was the only serif on screen, at the top of a pane where everything else is
sans, and it read as a different document rather than as this app's heading.

It is now 17px semibold sans, which sits properly in the scale: one clear step
above the 14px body under it and two above the 15px title on the collapsed bar it
grows out of, which is the same element at a smaller size rather than a different
one. The body also came down from 15px to 14px, which is THE base size in this
system - it had been sitting one step above at a size the app otherwise uses for
control labels and row titles.

The serif survives in the empty state. Whether it earns a second placement is now
an open question rather than a settled one.

### Five things the render caught that the code did not

Recorded because each one was invisible in review and obvious on screen.

1. **The prototype panel sat on top of the transport bar** and swallowed every
   click on the speed controls and the full-width button. A floating widget over a
   bottom bar is the oldest collision in this kind of layout. Fixed by having the
   shell publish `has-bottom-bar`, which sets `--m-bottom-bar`, which the panel
   lifts itself by. The timeline was not redesigned around a piece of scaffolding.
2. **The session cards were invisible in dark mode.** Card, pane and hairline all
   landed within four Oklab points. The cards band is now the sunken surface and
   the cards sit on it: the inverted-elevation rule applied one level down.
3. **The wireframe rendered as four dashed lines in a void**, twice. Percentage
   heights inside a grid with `min-content` rows resolve to auto. Fixed with
   container query units against the letterbox, whose height is definite by
   construction because the aspect ratio gives it one.
4. **The wireframe under-filled its letterbox,** reading as a page that failed to
   load rather than as a diagram, until the block heights were tuned to sum to
   about 91cqh including gaps and padding.
5. **The measure was wrong in both directions before it was right.** 95 characters
   at first, then 58 after the fix, because the cap went on the element rather
   than the text box and 32px of padding came out of it. It is 69 now, measured
   with `tools/measure-prose.mjs` on the render. See the standing note: `ch` is
   the advance of the "0" glyph and about 1.4x an average character in this face.

## 10b. Option A: the same flow, in Graphite

Written 2026-08-26. The brief was to take option B's information architecture and
layout for the issue detail and the session replay, and translate them into
Graphite's design system - carefully, because Graphite's look and feel is the part
the product owner likes.

### The detail is a screen, not a pane

Everything else follows from this one decision. B keeps a permanent 400px queue
column and opens the write-up in the pane beside it. Graphite's list is a
paginated antd Table, and **a table is the one shape that cannot give up half its
width and stay a table** - and the table is exactly what is liked here. So the
caret navigates instead of expanding, the detail replaces the page, and the first
control in the pane header is the way back to it.

Below that line the architecture is B's, unchanged: one header across the whole
pane, the flow on the left of the body and the side panels on the right both
beginning under the same top edge, the same three depths, the same derived state
(`openSession` decides everything), the same pure layer underneath.

### What the translation changed, and only these

**Every fact is drawn by the component this system already owns for it** -
ImpactMeter, OriginBadge, RelativeTime, CountSuffix, Chip - rather than restated
as plain text. B prints impact as a word and a number because B has no meter; a
system with a meter in it should not print a number instead. The write-up's fact
row and the table row it was opened from now report the same fact the same way.

**Graphite's shape language throughout.** antd Tabs, Input and Dropdown, because
this option exists to answer what the product looks like built on the library we
already ship. 2-6px radii, hairlines, the tighter space scale, IBM Plex, near-black
primary, teal rationed to state. The replay wireframe's *geometry* is shared - a
drawing of a browser is the same drawing in both systems - but its palette and its
corner radius are Graphite's.

**The header's first control is a way out of the ISSUE, not out of a queue,** and
at the write-up depth the row carries a breadcrumb rather than B's "The issue"
eyebrow. B does not need one: its queue is still on screen saying where you are.
Graphite left a table to get here, so the row has to say what it left.

### Three things the port cost, recorded so the next one does not

1. **Porting CSS by writing it from memory does not work.** `replay-frame.css` got
   written against a selector contract the component does not use, so the
   thumbnails rendered empty. Copy the source stylesheet, swap the prefix, then
   retint: the class contract lives in the TSX and is not negotiable.
2. **Utilities do not port.** Graphite has no `.m-label`/`.m-label__count` - it
   writes a section head as sentence case with `CountSuffix` trailing it - so
   ported headings arrived as "Journey5".
3. **A frame cannot be told its height by a parent that sizes to its child.**
   `.m-shell` was `align-items: flex-start; min-height: 100vh`, which is right for
   a table that grows with its rows and fatal for a player dividing a fixed height
   between two panels. Now `stretch` and a real `height`.

### Not done

No Storybook stories for the new components. `IssueDetailPanel` and
`DETAIL_IS_WIP` are now unreferenced and should go once the new screen has been
seen. Dark mode and the peek state are unchecked on this side. Graphite's prod URL
still serves the old WIP note.

## 11. Known limits

- Sessions, Preferences and Support are labelled placeholders in both options,
  and Tests and Audits still are in option B. Deliberate: the brief was one page,
  and B is the argument for a layout rather than a second application.
- Option B has no design below 820px. Under that width the queue is hidden and the
  reading pane takes the whole window, single column, at a correct reading measure.
  That is the honest limit of a two-pane layout rather than a responsive design: a
  phone needs a real answer and does not have one yet.
- The date-range filter from the current page is not carried over. It was one of
  the controls the "licence to cut" instruction covers, and neither option has a
  place where it earns its width yet. Easy to add back if it is used.
- Onboarding is untouched, per the brief, which puts it last.


## 12. Tests and Audits, ported 2026-08-27 / 28

Graphite grew two more agent pages, taken from what production runs today rather
than designed fresh: the Tests page (`components/Client/KaiSettings` - all three
of its tabs) and the Audits list (`components/Audits/AuditsList.tsx`). The
instruction was to adapt them, and the constraint the whole September version is
under is that nothing may appear here that does not exist in production - so what
follows is a translation, and every decision below is either a token swap or a
subtraction.

**The Tests page is three sections, not one list.** The tests the agent
maintains, the runs those tests produced, and the environments they run against.
Where those tabs sit is the decision on that screen and it has its own section
below.

### The one structural claim: three pages, one page

Both pages are `PageCard` with a toolbar, an antd `Table`, and a footer. Same
44px header, same measure, same hairlines, same empty-state component, same
footer grammar. A reader who has learnt the issue queue has learnt these, and the
harness asserts it rather than trusting it: `agents-check` measures the card's
left edge, width, header height and row height on all three pages and fails if
any of them drift (188 / 1360 / 44 / 39 today).

**One row breaks that rhythm on purpose.** An audit's row is 53px because its
first cell is two lines: the name, and under it the scope. An audit called "July"
means nothing without the traffic it read - two audits with the same name over
different scopes are two different documents - so the scope is part of the
identity rather than a column. Three rows can afford the height; thirty-one
cannot, which is why Tests keeps everything on one line.

What differs is what the toolbar's left half MEANS, and that difference is the
one thing worth reading twice. On Issues the strip is a set of independent
category toggles - category is a dimension like any other, and "All" is the empty
selection. On Tests and Audits it is exclusive, because a test has exactly one
status and an audit is either running or ready: these are five views of one list,
not five constraints that compose. **Same control, different arithmetic**, which
is why `FilterStrip` draws pressed state and reports clicks and nothing else. The
alternative - a lookalike beside the real one - is how two neighbouring controls
drift by a pixel and then by four.

Three components came out of the port and back into the library: `FilterStrip`
(the strip above, now used by all three pages), `SearchField` (the header's
search box at one width, previously a `className` on Issues) and `StubDrawer`.
`ActiveFilters` and `ActiveFilterChip` became generic in their filter key, the
way `FilterMenu` and `FilterDimension` already were, and took a `noun` so the
result count can say "12 tests" instead of lying about issues.

### What the translation subtracted

- **Five status colours became three.** Production tints all five states - green
  Active, indigo Approved, blue Needs review, orange Paused, grey Draft - and on
  a list where eighteen of thirty-one rows are Active, that means most rows carry
  a coloured chip. Colour that is on everything reports nothing. Here the accent
  is spent on Needs review (the one row asking for a person), warning on Paused
  (something stopped it), success on Active, and the two idle states stay
  neutral.
- **The new-row tint went.** Production tints an unread draft's row AND puts a
  dot beside its title. The dot stayed; saying it twice on one row still only
  says it once.
- **The two filter dropdowns became one menu.** Environment and Tags were two
  antd `Select`s competing for toolbar width. They are dimensions in the
  `FilterMenu` the queue already uses, which gets them counts, cross-dimension
  search and the removable chips row for free - and leaves room for the bulk
  cluster to take the same slot.
- **Audits kept nothing it did not need.** No filter menu, no display menu, no
  pagination on three rows. Three tabs and a search is not a smaller version of
  the tests toolbar; it is the whole toolbar that page needs, and adding the rest
  to look consistent would be adding controls that filter nothing.

### What the translation kept, deliberately

**The queue order.** Unsorted, the tests list is drafts first, then anything with
a revision or a merge waiting, then the rest. A column header replaces that with
a flat sort and a third click gives it back. This is the behaviour the production
page is actually liked for and it is asserted in the harness.

**The reject grammar.** You DISMISS a suggestion the agent made; you DELETE work
a person did; a row never offers both. That ambiguity is what lost somebody's
test in the production build, so the row menu is four different menus rather than
one menu with items disabled.

**The honest progress bar.** An audit's duration is unknowable, so the bar eases
and the page never prints a percentage. A number there would be a promise the
agent cannot keep. The harness checks the status cell is empty of text.

**The share, not the pair.** "~19%" with "1,000 of 5,320 matched sessions" on
hover, because nobody should have to work out that one is a fifth of the other.

**"Add test" opens the panel rather than seeding a row.** In production the
button creates a test and opens its drawer in creation mode, discarding it if you
close without finishing. There is no drawer here yet, so creating would leave an
"Untitled test" with no steps and no way to finish it - a row that reads as a bug.
The button opens the same stub the rows do, which says what is missing.

### Where the tabs sit, and why not in a band of their own

Production stacks three rows of chrome on this page: the page header, then the
tab bar with the search in its right-hand slot, then each tab's own controls
row. Graphite puts the tabs IN THE HEADER, beside the title, with the ink bar
overlapping the header's own hairline - two bands instead of three, and the
saving is not the reason.

The reason is that **a section is not a filter**. The toolbar under the header
means "what is shown of the body below it", and it is a strip of pill toggles. A
second strip directly above it, in the same shape, would read as one more filter
over the same list - and the thing it actually does is replace the list. Text
tabs with an underline in the header, against pills on a sunken track in the
toolbar, are two visibly different controls doing two different jobs. They are
antd `Tabs`, the same control the issue write-up uses one level down, so the app
has one tab treatment rather than two lookalikes.

Three consequences follow, and all three are in the harness:

- **Each section owns its toolbar** and renders it as the first thing in its
  body (`PageToolbar`, exported from `PageCard`). A shell that assembled three
  sections' filters in one place would be a shell that knows what a run is.
- **The header's actions follow the section.** Search targets what you are
  looking at, "Add test" exists only where tests are, and Environments carries
  no page-level action at all, because adding one belongs to the section that
  lists them.
- **The count left the header.** A count beside the title would have to read 31
  on Tests and 81 on Runs while the title still said "Tests". Each section's
  footer carries its own instead.

Environments has **no toolbar, no filters and no pagination** - four rows and a
three-field form - and that absence is deliberate. A page whose sections all wear
the same chrome regardless of what they hold has stopped reading what is in them.

### Runs is a log, and a log is not a queue

Nothing in the runs list is waiting on a person: a run is over, or it is still
going and cannot be stopped (pausing belongs to the TEST, where it stops further
executions). So this is the one list in the app that arrives SORTED - newest
first - rather than ordered by what needs attention. There is no selection and no
bulk anything, because you cannot act on eighty finished runs, and the only
per-row action is rerunning one that failed. An icon on every row would be noise
on seventy of them.

Three translations worth naming:

- **The period is a filter, and it is visible.** Production defaults the list to
  the last seven days and says so only inside a dropdown. Here the default
  arrives as a removable chip in the filter bar beside everything else, because
  a list silently showing a fraction of itself is a list that lies about how much
  there is. "Clear all" clears it too, which is the point of it being a chip.
- **Five dropdowns became one menu.** Environment, tags, viewport, region and
  period were five antd `Select`s across the toolbar. They are dimensions in the
  `FilterMenu` the queue already uses; period is the single-select one.
- **Environment, viewport and region are one cell**, not three columns. They are
  one fact - the machine this run happened on - and three columns of two words
  each is how a table stops fitting.

And one addition: **the failure message is in the row**, quiet, after the test
name. Scrolling a log for red and then opening each one to find out why is the
whole cost of not saying it there.

### Deleting an environment is the piece that was worth building

It is the only real work in that tab, and it is not a list operation: an
environment is where tests RUN, so removing it stops some of them. The dialog
splits them the way the domain does - tests whose ONLY environment this was are
named one by one, because they stop and cannot start again until somebody gives
them another; tests that run somewhere else too are counted in a second sentence,
because they lose this one and carry on. `envImpact` and `dropEnvironment` in
`shared/tests-logic.ts` compute both, so the dialog and the mutation cannot
disagree about what is about to happen.

### Two additions, both flagged

1. **Cancel merge moved onto the row menu.** In production a pending merge is
   resolved in the test drawer, which does not exist here yet, so a merge started
   from this list would otherwise be a state with no way out. It is production's
   action in a new place, not a new action.
2. **The rail badges count their own pages.** Tests carries what is waiting on a
   person (drafts, revisions, merges) and Audits carries the jobs still reading,
   both derived from the data. A badge that disagrees with the page it opens is
   worse than no badge.

### Not done

Three panels, all of them detail rather than list: the test panel (steps, run
settings, schedule, versions, and the review of a proposed change), the run panel
(every step with its screenshots, the console, and the network capture as a HAR
viewer) and the audit report (a document with a cover). Plus the environment
form. Each is a screen in its own right and each is the obvious next piece. Until
then a row opens a `StubDrawer` that names the row, prints the facts the table
already knows, and says plainly what is coming. A row that does nothing reads as
broken rather than unfinished.

### Two bugs this port produced, worth remembering

`FilterStrip` first shipped its CSS under `.m-strip`, which the replay's session
strip already owns. The later stylesheet won, the strip's track took the card's
own background, and **the selected tab was invisible in dark mode** while looking
perfect in light. Nothing in the component was wrong. The lesson is that a
component prefix is a namespace and this repo has no linter for it: grep the
prefix before naming a new one, and check the new page in dark mode, where a
collision between two surface tokens is the difference between a track and no
track.

And the same failure in antd's clothing: `.m-page__tabs .ant-tabs-ink-bar` is two
classes and **loses to antd's own three-class rule behind a `:where()`**, so the
ink bar kept antd's height and never moved onto the header's hairline - the
declaration was in the stylesheet, applying to nothing. Overriding antd needs
`.m-page__tabs.ant-tabs-top > .ant-tabs-nav .ant-tabs-ink-bar`, and the way to
find out is to read the computed value rather than the stylesheet.


## 13. One ground, one plane, and a menu with rooms in it (2026-08-28)

Two changes, both to the shell, both from a reference Gabriel brought in.

### The wrap

The window is painted in ONE colour - `--m-surface-canvas` - from edge to edge.
The menu sits on it with **no background and no border of its own**, and the
content is a single card floating on that same ground with an **equal margin on
all four sides**. The ground therefore appears to wrap around the content, which
it does: there is no seam to place because there is no second surface. A nav with
its own background and a `border-right` is two columns meeting at a line, and
that line is what makes an app look like a frame around a document rather than
one object.

Three things had to change to make that true, and each is a check in
`proto-check` rather than a claim:

1. **The plane is a fixed height and scrolls inside itself.** A card that grows
   with its rows pushes its own bottom margin off the screen, and the wrap would
   only be true at the top of the page. The list's range and pager are pinned to
   the plane's bottom edge for the same reason.
2. **The 85rem cap went.** The plane is the window minus the menu and the margin;
   a cap inside it would put a second, invisible edge next to a visible one.
3. **The menu's own padding IS the fourth margin.** It is the same 12px the other
   three sides get, so the gap between the last nav row and the card reads as a
   margin rather than as a gutter.

### The header, with less in it

Room to breathe and no rule under it. The old header was a hard 44px row with the
title at 18px and the page's explanation behind an info icon, and it was right
when the card was one of several possible cards on a grey canvas: the fixed
height is what kept a title-only page and a page full of controls from putting
their titles at different heights.

The card is the whole plane now, so the title is the first thing in the page
rather than a label on a box. It gets real top padding, 22px, and **the sentence
that was behind the info icon is now printed under it**. A page's own description
is not a footnote, and there is room for it. The hairline under the header went
with it: the whitespace does that job, and the content below is not a second
thing - it is what the title is about.

### The menu has rooms in it now

The icon rail is retired (`git show` has it if the argument reopens). It answered
"how does this scale to eleven agents" well and could not answer the question
that came next: **one agent contains three screens**, and a nested icon under an
icon is not a hierarchy anybody can read.

What is in the menu, top to bottom: the project switcher and a New control;
Home and Sessions; **Products**, which is the agents, each with its open count,
one of them expanding into its sections; and pinned at the foot, four tools on a
single row - settings, notifications, help, theme - with the account beside them
and the **credits meter** under it.

Four notes on that:

- **Only the products list scrolls.** Home and Sessions above it and the tools,
  credits and account below it are pinned, so growth never pushes any of them
  off-screen. That rule survived from the rail.
- **The sections are data** (`AgentEntry.sections`), not a special case for
  Tests. The question the menu has to survive is not "what does Tests do" but
  "what happens when the fourth agent grows a second screen".
- **The caret is its own control.** The row goes to the agent; the caret opens
  its sections without going anywhere. A disclosure that also navigates makes it
  impossible to look at what is inside something without leaving where you are.
- **The foot is a row, not a list.** Four things you touch rarely and never
  search for do not deserve four labelled rows competing with the agents.

**The credits meter is the one addition that is not in the reference's place.**
Agents spend money while nobody is watching - that is the whole proposition - so
how much they have spent is permanently on screen rather than inside a billing
page. It is a measure, not an alert: one line, no colour until it matters, exact
figures on hover.

### What this cost, and what it replaced

**The page tabs lasted one day.** Tests' three sections were tabs in the page
header on 08-27; they are menu rows now, and the tab strip is gone. Two
navigations to the same three destinations, ten pixels apart, is one too many,
and the menu wins because it is where you already are when you decide to go
somewhere - and because it says what is inside Tests without opening Tests. The
rule from that day survives unchanged: each section owns its toolbar, and the
header follows the section.

**One thing to flag rather than defend:** Mehdi picked the icon rail on 08-26.
This replaces it, on Gabriel's reference and for the reason above. The labelled
menu costs 256px of width that the rail did not - which is what the wrap gives
back visually, and what the sections need.


## 14. The batch after the shell (2026-08-28, same day)

Five things, all of them consequences of section 13 rather than new directions.

### One left inset, and the queue lost its caret

The queue's rows had a 30px expand column in front of them whose only job was to
say "this opens" - which a row says by being a row and by moving under the
cursor. It is gone, the row itself navigates, and the first thing on a row now
starts **exactly where the page title above it starts** on all four lists: a
checkbox on Tests, an impact meter on Issues, a result chip on Runs, a name on
Audits. One number, asserted in `agents-check`.

Two things fell out of doing it. Overriding antd's cell padding needs
`.m-page__body .ant-table-wrapper .ant-table ...` - two classes TIE with antd's
own `:where()` rule and lose on order, silently, which is the second time in two
days that a declaration has landed in the stylesheet and applied to nothing. And
row height is now **one token** (`--m-row-height`) as a minimum on every list:
left to their content the three lists came out at 39, 34 and 59px, so moving
between them changed the rhythm for no reason anybody could name. The audits row
is still allowed to be taller, because it carries two lines.

### The audits table was badly spaced, and it was the widths

Seven columns and three rows on a 1450px plane leaves ~800px of slack, and antd
gives all of it to the one column without a width - so the name sat alone at the
far left, four numbers crowded the right edge, and a corridor of white ran
between them. The columns are **percentages** on that table, so the slack is
shared and the proportions hold at every plane width. The row also got real
vertical padding and its two lines got a gap they can breathe in, and "You · Jul
9" got a separator instead of a gap that read as a lost column divider.

### An unbuilt page is still a page

Home, Sessions, Preferences and Notifications used to render a bare note on the
shell's ground - which meant the one thing an unbuilt page still has to show,
THE SHELL, was the thing it did not show. `Placeholder` is a real `PageCard`
now: the destination's own name in the header, its own glyph on a plate in the
middle of the plane, and one sentence. An empty page is still a page.

### Type: five systems, and what they actually move

Two attempts failed before this one, and both failures are worth keeping:

1. **Costume.** A display serif on the page title, JetBrains Mono on the tags,
   Space Grotesk over Geist. Gabriel: "a little bad taste." The contrast was
   decorative - it announced a choice instead of doing one, on a screen whose
   job is a table.
2. **Too quiet, and shouting in the wrong place.** The replacements were built
   from real systems but the only thing that really moved was the sans, and at
   13px one grotesque looks much like another. Meanwhile every alternative set
   EVERY chip in small caps, statuses included: "unbalanced, it feels too big."

What survived is that **contrast has to be functional** - a face changes when
the KIND of thing changes - plus two rules that came out of the second failure:

**Small caps belong on tags, never on statuses.** A tag is a label you scan
("Payment", "Checkout"); a status is a word you read ("Needs review", "Ignores
SSL errors"), and small caps on a sentence is shouting. `Chip` now takes a
`kind`, and the tag treatment - face, size, weight, case and tracking together -
applies only to tags. Uppercase also **comes down a size** (12px → 10px), because
cap height where an x-height used to be reads a size bigger; that is what "too
big" was.

**A system has to move more than its family.** Each of these moves four things,
so they tell apart at a glance:

| | family | page title | tags | figures | base |
| --- | --- | --- | --- | --- | --- |
| **Graphite** *(shipped)* | Plex Sans | sans, −0.011em | sentence case | sans | 13px |
| **Swiss** *(Linear)* | Inter | sans, −0.028em, 21px | UPPERCASE 10px +0.075em | sans | 13px |
| **Console** *(Vercel)* | Geist | sans, −0.032em, 21px | UPPERCASE mono 10px | **Geist Mono** | 13px |
| **Editorial** *(Notion)* | Source Sans 3 | **Source Serif 4, 26px** | sentence case | sans | 14px |
| **System** *(GitHub)* | the OS's face | sans, 23px | sentence case | SF Mono | 14px |

Three notes:

- **Console's figures are the sleeper.** Putting every count, duration,
  timestamp and page range in the mono changes the texture of a whole table
  without touching a single word, and it costs no layout. It is also the most
  honest thing a mono can say here: those numbers are what the machine measured.
- **Editorial's serif marks the two places you READ** - the page title and the
  write-up - and stops. Rows stay sans, on Gabriel's note: a serif down a column
  of names is decoration again.
- **System is a real answer.** The OS's own face is what GitHub, Slack and
  Notion's chrome use, it never looks foreign on the machine it runs on, and it
  loads nothing. It runs a size up, which is the other half of how it differs.

The control is a **dropdown**: five whole systems are picked by name, not
scrubbed along like a grey ramp.
