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

The toolbar's left half is the same control on all three pages and it now means
the same thing on all three: **the strip is exclusive**. Five views of one list,
not five constraints that compose. A test has exactly one status, an audit is
either running or ready, and - since 08-28 - an issue is read in one category at
a time.

*Issues was the exception until 08-28*, on the argument that category is a
dimension like impact or tags and should compose with them. Gabriel: make it
tabs, not filters you can aggregate. He is right, and the line is worth keeping:
**the other dimensions narrow one list; category chooses which list you are
reading.** "Errors or Slowness" is not a question anybody asks standing in front
of a queue. The filter menu draws Category as radios to match (`single: true`),
so the menu and the strip cannot end up in states each other cannot show, and
`toggleFilterValue` owns the replace-rather-than-accumulate rule so no component
has to know it. `cats` stays a LIST in `Filters` - empty means All - so the chips
row, the counts and `activeFilterCount` need no special case.

`FilterStrip` still draws pressed state and reports clicks and nothing else,
because the arithmetic is the page's. The alternative - a lookalike beside the
real one - is how two neighbouring controls drift by a pixel and then by four.

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
  cluster to take the same slot. *(Two became six on 08-28: see below.)*
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

*(Written 08-27, when the tabs sat beside the title. They spent a day in the
menu instead and came back on 08-28 as their own band under the title - see
section 14. Everything below about WHY they are tabs and not pills survived both
moves unchanged.)*

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

### Six dimensions on Tests, four of them borrowed from Runs (08-28)

Gabriel: "you added nice filters to Runs but not the Tests list." He is right,
and the imbalance was backwards. **A run is one cell of the matrix a TEST
describes**, so every question you can ask of a run you can ask of the test that
produced it - and the test list had two dimensions to the run log's five.

Four are now the same word in both places: **Environment, Tags, Viewport,
Region**, same glyphs, same menu. Two exist only on a test, because a run
happened once and a test has a rhythm and a history:

- **Schedule** - Daily, Weekdays, Weekly, Monthly, Custom days, Not scheduled.
  Derived through `scheduleFreq`, which already decides what "weekly" means for
  the column and the tooltip, so a fourth definition was not invented for the
  filter.
- **Last result** - Failed, Passed, Never run. Failed is first because it is
  what you came for, and **"Never run" is an answer rather than an empty cell**:
  seven of thirty-one have never run, which is the most useful thing this list
  can say about them.

**Every dimension can find the rows with nothing in it.** Environment gains
"Not set" (5), Tags gains "Untagged" (5), Viewport and Region gain "Not set",
Schedule's "Not scheduled" is 11. A blank cell is a state somebody has to fix -
those five tests can never run at all - and a menu that only finds the rows that
ARE configured is a menu that hides its own worst rows. The UNSET value and one
`matchesList` rule are shared by all four list dimensions, so "no environment"
and "no tags" cannot drift into meaning two different things.

**What is still missing, and it is the honest gap: the table has no Last run
column.** Filtering on data no row shows is how a list starts lying - you narrow
to six and nothing on screen says why those six. The filter is worth having
before the column exists because the status chip at least explains half of it,
but the column is the other half of this change and it is not done. Viewport and
Region have the same shape and it is deliberate there: Runs filters on both
without columns too, on the 07-13 decision to keep them out of the table.

**Seeded, not invented.** Viewport and region were on 5 of 31 tests, so both
dimensions would have read "Not set: 26". 21 more tests carry a plausible matrix
now, drafts still carry nothing (a draft carries nothing anybody has set yet,
which is how a draft reads in the table) and two configured tests still have no
region, so "Not set" stays visible.

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
header on 08-27; they became menu rows here, and the tab strip went. Two
navigations to the same three destinations, ten pixels apart, looked like one
too many.

> **Superseded the same day - see section 14.** The strip came back, and the
> page title stopped renaming itself. What this paragraph got wrong is that the
> menu and the strip are not two answers to one question: the menu says what is
> inside Tests before you open it, the strip says you are still inside Tests
> once you are reading the page, and only the second one is on screen while you
> work. The menu KEEPS its nested rows. The rest of the paragraph stands: each
> section owns its toolbar, and the header's actions follow the section.

**One thing to flag rather than defend:** Mehdi picked the icon rail on 08-26.
This replaces it, on Gabriel's reference and for the reason above. The labelled
menu costs 256px of width that the rail did not - which is what the wrap gives
back visually, and what the sections need.


## 14. The batch after the shell (2026-08-28, same day)

Eight things, all of them consequences of section 13 rather than new directions -
including the one that reverses part of it.

### The title is "Tests", always, and the sections are a strip under it

Section 13 moved Tests' three sections into the menu and let the page header
rename itself to match: "Runs" where "Tests" had been. Gabriel, looking at it:
the three read as three separate screens, when they are three tabs inside Tests.

He is right, and the reason is worth stating precisely, because the menu was not
wrong. **The menu can only say "Runs is inside Tests" while you are looking at
the menu.** The moment you are reading the page - which is where you spend the
other 99% of the time - a heading that says "Runs" over a body full of runs is a
destination of its own, and nothing on screen still claims it belongs to Tests.
A nested row can be highlighted in a column you are not looking at; a heading is
the thing you actually read to find out where you are.

So the heading is fixed at **Tests** in all three sections, and `PageCard` grew
a `tabs` slot: text tabs with an ink bar, inset to the title's own left edge, on
a hairline that is also the toolbar's top edge. Three things about it:

- **The header above it is unchanged** - same padding, same 83px, same place for
  the title as a page with no sections at all. A tabbed page and a plain one are
  the same shell wearing one more band, and `agents-check` measures that.
- **The strip is not the shape of the toolbar under it.** Text and an ink bar
  against pills on a sunken track: a section REPLACES the body, a filter only
  narrows it, and two strips of pills ten pixels apart would read as one filter
  said twice. They are antd `Tabs`, the same control the write-up uses a level
  down, so the app has one tab treatment rather than two lookalikes.
- **The sentence still follows the section** and so do the header's actions.
  The title says where you are; the line under it says what you are looking at.

**The menu keeps its nested rows.** That is the duplication section 13 removed,
and taking it back is deliberate: the two do different jobs. The menu is how you
jump into Runs from inside Issues and how you learn Tests has three bodies
without opening it. The strip is how you know, while reading, that you never
left. `active` is still one string on the shell and both controls write to it,
so there is no second copy of "where am I" to drift - the harness clicks the
strip and asserts the menu row follows.

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

### Two small things in the same batch

**The menu's counts are a column.** They trailed their labels, so Tests' 7 sat a
caret's width left of Issues' 11 and the three numbers made a zigzag down the
menu. The count now has a fixed width and is right-aligned in tabular figures,
and **the caret's slot is reserved on every row** whether or not the agent has
sections. Numbers that do not share an edge cannot be compared at a glance, and
comparing them is the only reason to put counts in a menu at all.

**The sort arrows are lucide's, not antd's.** antd stacks two small filled
triangles in a column header: solid shapes with sharp corners, in an app drawn
entirely in 1.75px rounded strokes, and at 11px the pair reads as a smudge. They
are now the same chevron the project switcher uses - the double chevron while
nothing is sorted, because both directions are on offer, and the ONE direction a
sorted column is in. A column spreads `sortable` from `SortIcon.tsx` instead of
writing `sorter: true`, so a table cannot go back to the triangles by forgetting
the icon, and the CSS that used to tone antd's arrows down is gone rather than
left behind as dead overrides.

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


## 15. Corners, tokenized by role (2026-08-31)

Mehdi, on a screen share, without opening a devtool:

> "The corners here are rounded, but if you look at the search bar, the corners
> are not rounded. **Is that done on purpose?**"

It was not. He was looking at the Issues toolbar, where the icon buttons sat at
4px and the search field beside them at 2px, ten pixels apart.

### The cause was the scale itself

The radius was **a size scale** — `xs / sm / md / lg` — so every component
picked from it by eye, and there was nothing to be wrong against. antd made it
worse in a way that looks deliberate until you read it: its `borderRadiusSM` was
the chip value, and **antd hands SM to every `size="small"` control**. So a small
button, a small input and a checkbox came out at 2px while our own `IconButton`
and nav rows, which never asked antd anything, sat at 4px. Two shapes for one
kind of object, produced by two systems that each looked internally consistent.

Measured before the change, on one screen: **2px** on antd's buttons, the search
input, the checkboxes and our chips; **4px** on our icon buttons, the nav rows,
the pagination and the filter track; **6px** on popovers; **8px** on the plane.
Four values, no rule.

### A radius is a property of what a thing IS

The scale is now four role tokens and nothing else:

| token | what takes it | Sharp | Soft (shipped) | Round |
| --- | --- | --- | --- | --- |
| `--m-radius-chip` | marks inside a row — chips, tags, counts, badges | 0 | 2 | 999 |
| `--m-radius-control` | anything you click or type in, **at any size** — including a toggle inside a strip | 2 | 4 | 10 |
| `--m-radius-track` | a track that wraps controls | *control + 2* | *control + 2* | *control + 2* |
| `--m-radius-surface` | anything that contains or floats — the plane, cards, popovers, drawers, the replay frame | 4 | 8 | 16 |
| `--m-radius-check` | the checkbox, and the one value that stops climbing | 0 | 2 | 4 |
| `--m-radius-full` | circles and pills — the avatar, the presence dot, progress bars | — | — | — |

**A control is a control at every size**, so `borderRadiusSM` is no longer
smaller than `borderRadius`; both are the control token, and `borderRadiusLG`
became the surface token because that is what antd actually draws popovers,
dropdowns, drawers and modals with — not because anything in this app is large.

### Nesting is arithmetic, not a smaller role

The first pass gave a control nested in another control the CHIP radius, on the
reasoning that an inner corner should be tighter. That is the right instinct and
the wrong number, and both ways it was wrong were visible immediately:

- **Soft read as sharp.** A toggle at 2px sitting on a toolbar of 4px controls
  is the same defect this section is about, one level down. Gabriel: "the tabs in
  the soft version are really sharp and kind of in disaccordance with the rest."
- **Round read as miscalculated.** A fully round item inside a 10px track is a
  pill dropped into the wrong hole — the corners are not concentric, and the eye
  reads it as a mistake before it can name it.

**Two rounded rectangles look nested when the outer radius is the inner one PLUS
the gap between them, and wrong at every other value.** So a toggle IS a control
and takes the control radius, and its track takes `--m-radius-track`, which is
`calc(var(--m-radius-control) + 2px)` — the 2px both tracks in this app pad their
items by. It is the only radius in the system that is arithmetic rather than a
choice, and it follows the control wherever the control goes.

antd needed all three of its Segmented tokens spelled out to obey it: at
`size="small"` it reads the TRACK from `borderRadiusSM` and the thumb from
`borderRadiusXS`, which is how the prototype panel's own toggles ended up a
different shape from the identical-looking strip on the toolbar.

### One value has to stop climbing

**A checkbox may never become a circle.** CSS clamps a radius to half the box, so
any "round" value turns a 14px square into a circle — and a circle means *one of
these*, not *any of these*. Gabriel, on seeing it: "checkboxes can't be circles,
that's an insane decision." He is right, and it is not a rounding-off detail: it
is a control changing what it claims to do because a theme moved.

`--m-radius-check` is capped at 0 / 2 / 4 across the three shapes and the harness
asserts both the value and the cap.

59 call sites were converted, one at a time, by asking what the object is.

### Three shapes in the prototype panel

`Corners: Sharp / Soft / Round`, and the three are **not one value scaled** — the
ratio between the roles changes too, because that is what separates the looks.
Sharp keeps the surface only twice the control, so the app reads as drawn with a
ruler. Soft doubles at each step. Round pushes chips to a full pill while keeping
controls at 10px: go round on everything equally and a 14px checkbox becomes a
circle nobody can tell from a radio button.

Chips go to a full pill in Round and that is the point of it; the checkbox does
not follow them, for the reason above.

**The three numbers go to antd as numbers**, through `ThemeOverrides.radii`, for
the same reason the colours and the fonts do: antd computes with the radius and
cannot read a custom property. Switch only the CSS and every button, input,
checkbox, popover and pager keeps the old shape while everything we drew
ourselves changes — which is the exact inconsistency the control exists to end.

### The check is "one shape per kind", not "the value changed"

`proto-check` walks all three shapes and asserts five things each: the tokens
hold the expected values; **antd's input, antd's button, our icon button, our nav
row and both strips' items are all the control value**; **both tracks are exactly
item + 2**, so the corners are concentric rather than merely both rounded; **the
checkbox is still a square**; and **no element on screen carries a radius outside
the scale** — a stray literal shows up as an extra bucket rather than hiding
behind a spot check. Fifteen assertions, and the second is the one that would
have caught the original defect.

⚠ One selector trap, found while writing them: **antd v6 draws the checkbox on
`.ant-checkbox` itself — there is no `.ant-checkbox-inner` any more**, and a
check written against the old markup measures nothing and reports `null`.


## 16. The drawers, brought over from production (2026-08-31)

Mehdi, 08-28, after checking the pages were complete: *"You have to bring those
in… bring in whatever slide-outs are missing there."* The list, the runs log and
the environments had been real for three days and the three things they open
were a stub that said so.

This is the port of the production Kai drawers - `TestDrawer`, `RunDrawer` and
the steps editor under them, about 3,900 lines - onto Graphite's design system.
Not a copy: the lifecycle and the arguments come over intact, the components
and the tokens are this app's.

### The data had to become real first

The list only ever needed `stepCount: number`. A drawer needs the steps, so:

- **`steps: string[]` on every test**, written out as real sentences for all 31.
  Placeholders would have proved nothing about row height, wrapping or the
  inline editor. The fifty-step sweep is still generated - what that one is FOR
  is the scroll.
- **`stepCount` is derived** (`steps.length`) rather than stored. A count beside
  a list is a second copy of the list's length, and they drift the first time
  somebody edits one.
- **A revision is a real diff.** `PendingRevision.changes` was a number; it is
  now `StepChange[]`, authored against the current indices, with no "changed"
  kind - a reworded step is a removal and an addition, the way a diff says it.
- **`history: TestVersion[]`**, so the version switcher and the per-step history
  popover have something to switch to.
- **A merge holds GROUPS**, one per participant, not a flattened list. A merge is
  a proposal about order; flattening first throws away the only decision in it.
- **A run's detail is derived, not stored.** `runSteps` reads the test's own
  steps and colours them from `failedStep`; the console and the network come
  from a hash of the run's key. Eighty runs each carrying their own copy of four
  steps is eighty chances to contradict the test they came from.

`steps-logic.ts` is the pure layer under all of it - `buildReviewItems`,
`resolveItems`, `isStruck`, `applyRevision`, `saveSteps`, `stepHistory`,
`flattenMerge` - ported nearly verbatim, because it is the part of that feature
nobody has ever complained about.

### One shell, three objects

`EntityDrawer` is the only way to open something in this app. Its rules:

- **The eyebrow says what and in what state**: "Test · Needs review", "Run ·
  Failed". Production distinguished the three types with a coloured icon tile,
  which is decoration; a word survives being read aloud.
- **The footer owns the commit, the header owns immediate state.** Save is
  bottom right; Pause is top right. A primary button in the header would put two
  accents on one surface.
- **The body is `Section`s**, hairline-separated, and that is the only way to add
  one - a drawer cannot grow a heading of its own size.

### Edits buffer, and Save commits

Nothing typed in the drawer reaches the list behind it until Save: closing
changes nothing, which is what makes it safe to open a test just to read it. The
footer says what THIS drawer commits - "Create test", "Combine 9 steps", "Save
v3", "Approve steps", "Save" - and the destructive action is on the left in all
five, so it is never where the primary was a moment ago.

**A draft is a proposal, so its footer is about accepting it**, and approving is
not scheduling: "I accept these steps" and "run this every morning" are two
sentences. Production made that a three-step wizard inside the drawer; here the
drawer's own sections already run Steps → Run settings → Tags, so the primary
says "Approve steps" and the schedule field is right there. **The reject grammar
survives**: you DISMISS a suggestion the agent made and you DELETE work a person
did, and a footer never offers both.

### A review is the ordinary list

The single most important thing carried over. A proposed revision is not a
read-only diff screen: it is the same editable list with the proposal's rows
tinted, marked `+`/`−`, and carrying one accept/reject pair. Everything else
still edits, drags and deletes, so you are never made to accept a wording you
can see is wrong just because the agent wrote it.

Two colours on one surface, which this app otherwise never does, and the
exception is earned: an addition and a removal are opposites, and a diff that
distinguishes them by position alone is not a diff. Both also carry a glyph.

### Three defects the harness found, none of which a screenshot could

1. **The chained insert ate the text.** Enter on a fresh step committed the text
   and then inserted the next row - two updates reading the same `items`, so the
   second overwrote the first and you got an empty step instead of the one you
   had just typed. It is one update now. Every frame of the render was correct;
   only the typing was wrong.
2. **Escape closed the whole drawer.** The step editor and the rename field both
   listen for Escape to abandon a line, and antd's Drawer listens for it to
   close - so abandoning a misclick threw away every buffered edit on the panel.
   The inner handler has to say it handled it.
3. **A hook ran after an early return.** `if (!test) return null` sat above a
   `useMemo`, so the render where the drawer closes ran a different number of
   hooks. React says "rendered more hooks than during the previous render" and
   the drawer never opens at all.

`agents-check` is 66 checks now. The four new ones about the steps drive the
keyboard and the mouse rather than reading the DOM: type into a step, chain the
next one, press Escape, drag a row, then close without saving and assert the row
behind is untouched.

### What a run drawer says that the log cannot

**Where it stopped.** Every step carries its own result, the failing one carries
the error inline, and everything after it reads *skipped* - a run does not fail
eleven times, it fails once and stops. **A run in flight reports progress and
nothing more**: its steps are known because the test knows them, its results are
not, and `unknown` is drawn as its own mark rather than as pending. There are no
controls on it either, because a run cannot be paused or stopped once it has
started - pausing belongs to the test, where it stops the next one.

**Activity is the three things you would check on a session** - screenshots,
network, console - and a passed run captured none of the last two, so those tabs
are DISABLED with the reason on hover rather than hidden. A panel that appears
and disappears between runs is a panel nobody trusts. The screenshots are
labelled placeholders: a stock image would be a lie about what this build
captures.

### Not done

The **audit report screen**, which is the third of the three slide-outs Mehdi
asked for. The Tests half is finished.


## 17. The batch off the drawers (2026-08-31)

Everything here came from Gabriel driving the build, which is why most of it is
a detail that only shows up under a cursor.

**The tag's X was a sibling pulled over the chip's edge by a negative margin, so
at a pill radius it sat on the border and read as broken.** `Chip` takes an
`onRemove` now and draws the control INSIDE its own outline: a chip and the X
that takes it away are one object.

**The rename target ran the full width of the header.** It fits the name now -
a hover tint across an empty row says the whole row is editable, and most of
that row is nothing.

**A decision is the only colour on a step row.** Undecided, accept and reject
are the same muted glyph; hovering colours the side you are about to take;
taking it lifts that side onto the page's own surface, green or red. The grey
pressed chip that was there first said "pressed" and nothing about which way.

**Tooltips had 4px of spare height under the text.** antd floors the box at
`controlHeight`, 30px over 26px of content, and the block puts the slack at the
bottom. ⚠ The fix needs TWO classes - antd's own rule is
`.ant-tooltip .ant-tooltip-container`, and a single class ties and loses on
order. The first attempt changed nothing and the computed value was still 30px.

**Three filter-pill treatments, in the panel.** Mehdi's note was two notes: the
pill's colours, and "the background of this section shouldn't be gray, it gives
a muted vibe". The grey band went in all three. What is left is an argument
about what an applied filter IS - `outline` a control you can take off, `tinted`
a state the list is in, `text` a sentence with no chip at all. One set of markup;
a treatment that needed its own JSX would be a fourth component pretending to be
a variant.

**Home left the menu** (it was going to carry the digest, which is backend work)
and **the `+` became a search button** - the create-your-own-agent affordance sat
against the product's own argument, and what you actually reach for from
anywhere is finding something.

**One chevron in the app.** antd draws its own on every Select; it is lucide's
now, set on `ConfigProvider` rather than on seven call sites, so a new Select
cannot arrive wearing the other one.

**The screenshots expand.** Same three tabs, same components, one FIXED stage
height so switching tabs - or landing on an empty console - never resizes the
window under the cursor. The frame itself is the expand control: the thing you
want bigger is the picture.

**Thirteen accents, as a palette rather than a segmented control.** Thirteen
hues in thirteen labelled cells is thirteen words nobody reads. They are
generated from a hue and nothing else, so every one lands with the same contrast
against the same surfaces. ⚠ The red half of the wheel is still a real
constraint - an accent too near danger makes a selected row read as an alarm -
so the generator computes the distance to the nearest alarm colour and each
swatch carries it in its tooltip. The trade is visible when it is picked.

**And the prose left the prototype panel.** Every control had a paragraph under
it explaining itself. Nine paragraphs in a 264px column is a document, and the
panel is a set of switches.

Smaller, all measured: the count sits tighter to its label (at the strip's own
spacing the number floats between two labels and belongs to neither); the
ordering row's button and field are one control the width of the other two, with
the field flexing rather than carrying a second hardcoded width; the filter
menu's search is rounded on four corners like any text field; the insert `+` had
been drawn into a box smaller than itself and came out clipped; an empty steps
list offers a real "Write the first step" button, because a hairline that only
appears on hover is invisible when there is nothing to hover; and an empty step
editor has a placeholder, because a bare caret in white space reads as a
rendering glitch rather than as a field waiting for you.


## 18. Motion, and the tests list's own Display (2026-08-31)

**The strip's selected surface MOVES.** One element that slides between tabs
rather than a background that appears on one item and disappears from another.
Two reasons, neither decorative: it says the tabs are views of one list, and it
carries the eye to where the change happened. It is measured in JS - the items
are as wide as their labels and the strip wraps, so there is no ratio to compute
it from - and three states decide whether it reads as a nice touch or a glitch:
it does not animate on first paint, it does not animate when the strip reflows
under it, and it does not exist at all when the selection is multiple or empty,
where one sliding surface would be a lie about what is on. 180ms on transform
and width, off under `prefers-reduced-motion`.

⚠ **And the modal's tabs stopped jumping.** antd takes `-selected` off the item
for the length of its own thumb motion, so a border that exists only on the
selected item vanished for those frames and the control lost 2px of height -
which in a centred modal is a 2px jump and a 1px slide on every tab change.
Measured per frame: 28 → 26 → 28. The border is on every item now, transparent
until selected, and on the thumb as well.

**The tests list has a Display menu**, and `DisplayMenu` became `DisplayShell`
to give it one: the chrome (trigger, badge, popover, row rhythm, column pills,
reset) belongs to the shell, the vocabulary to the caller. The issue queue groups
by impact and hides issues; the tests list groups by **status, environment, tag,
schedule or last result**, orders by the same keys its column headers write, and
toggles seven columns. Two menus that looked identical and shared nothing would
be the lookalike this system keeps deleting.

Two rules make the grouping useful rather than decorative: a test appears in
**every** group it belongs to when the axis is multi-valued (a test on Production
and Staging is under both, because "what runs on Staging" has to be answerable by
reading one block), and every axis has a group for the rows with nothing on it,
named for what is missing, because those are usually the ones you are looking
for. ⚠ Which forces a **group-scoped row key**: two rows carrying one test's key
is a duplicate-key warning and a table that silently drops one of them.
Selection maps back to the test underneath, so both rows tick together.

**The mark follows the accent.** It was on its own `brand-*` ramp, which was
right while the brand was fixed and wrong the moment the accent became a choice:
a logo in one colour beside a UI in another reads as two products.

Also: the group header is a label, not a row - it had inherited the table's row
height and sat at the top of a 39px band, which read as an empty row between the
heading and the first item.

---

## 19. The menu, narrow (2026-08-31)

The one thing section 18 left open. The note there said a collapsed sidebar
"wants more than a width transition — what a collapsed nav does with the agent
counts, the sections, the credits meter and the project switcher is the whole
design of it," and that turned out to be exactly right: the width was an hour
and the four questions were the day.

### One rule, and everything follows from it

**The collapse takes the words. Everything else is a reduction of itself rather
than a substitute for itself.** No row moves to a different part of the menu, no
control disappears behind a "more", nothing is replaced by a different component
that happens to fit. Applied four times:

| open | narrow |
| --- | --- |
| project name + switcher + search on one row | the mark, with search folded under it |
| glyph, label, count column | the glyph, with a dot where the count was |
| "AGENTS" | a hairline the width of the glyph column |
| five tool glyphs across | the same five, folded into one column |
| Credits · bar · 12.4k / 50k | the bar, turned a quarter turn |

52px: one 28px glyph with an equal 12px gutter either side. The left gutter
drops from 16 to 12 to get that, which has a pleasant side effect — collapsed,
the window's left margin finally matches the plane's other three, so the whole
app is wrapped in one even 12.

### The counts: three attempts, and the third is the design

This is the question the open item named first, and the two wrong answers are
worth keeping because they were both defensible when written.

1. **A count COLUMN beside the glyphs** (76px: 16 + 28 glyph + 20 figure + 12).
   The argument was that "the nav is the queue" is the menu's whole claim and a
   collapse that drops the counts drops the claim. It read well and it was
   wrong for a reason that has nothing to do with counts: *a second column puts
   every glyph off the middle of the strip*, so a rail that was 76px wide looked
   like a 56px rail shoved left. Gabriel, twice: "the numbers make all the icons
   seem disaligned, when they should be aligned center."
2. **A chip on the glyph's shoulder.** Centres the glyph and keeps the figure.
   Also wrong, and the objection is the one that generalises: *the chip has to
   grow with the number.* "What if I have 3 digits — I can barely see the icon."
   A 28px tile has room for one thing, and that thing is the glyph.
3. **A dot, and the figure in the tooltip.** What ships. The dot is the
   notification bell's dot, in the bell's colour, meaning the bell's thing:
   there is something here for you. The menu is still a queue, just one you read
   in two steps instead of one — which agent has work at a glance, how much on
   hover.

⚠ **The dot is not red.** Red is the alarm colour and it is spoken for: a
critical issue, a failed run, a destructive confirm. Work arriving is the normal
state of a product whose whole proposition is that it works while nobody is
watching, and marking that in the alarm colour tells you the product is broken
every time it does its job. The bell was recoloured to match.

**Only one of the two forms is ever on screen.** The figure is in the DOM at
both widths and the dot is too; CSS shows the one the width has room for. There
is no second row component and nothing to keep in agreement.

### The sections: a flyout, and only where there is something inside

Two shapes, decided by whether the row has anything in it.

- **No sections → a plain tooltip with the name and the count in words**
  ("Issues · 11 open"). Nothing else was taken from the row, so nothing else has
  to be given back.
- **Sections → a card**, because a nested list genuinely has nowhere to go at
  52px. Its head is the row — same label, same figures — and under it the same
  section rows the open menu draws, from the same `AgentEntry.sections`. An
  agent that grows a fourth section grows it in both places or neither.

This was one card for every row for about an hour. Gabriel: "the tooltip can be
only the name, it doesn't need to have a number if it's well shown in the icon."
The general rule that fell out: **a popup owes you what the width took, not a
copy of what is in front of you.**

The foot's tools keep their plain tooltips. The collapse took nothing from them
— they were glyphs before it and glyphs after — so there is nothing for a card
to give back.

### The choreography is asymmetric, and that is the whole craft of it

- **Collapsing:** the words leave first (80ms fade, no delay), the box closes
  after them (180ms).
- **Expanding:** the box opens first (180ms), the words arrive last (130ms fade,
  delayed 130ms).

Text is therefore never re-wrapping inside a box that is still moving, which is
the single thing that makes a width transition look cheap. Both directions are
declared once, on the elements that move, and the direction is chosen by which
rule the browser is transitioning *to*.

**The layout FOLDS rather than switching.** The brand pair is a `flex-wrap` with
a minimum width on the switcher, so search drops underneath it on its own
somewhere around 160px; the tool bar is a **grid of 28px tracks with
`auto-fill`**, so it goes five across, then three, then one, on the same frames
the width is already animating. A row flipped to a column by a class would
arrive at the column while the menu was still 256px wide, which is the most
obvious way to make a collapse look broken.

**The glyphs drift; they do not travel.** Six pixels across the whole
transition, all of it the gutter closing and the row losing its padding. The
collapse reads as the labels leaving rather than as two different navs.

### The credits meter turns instead of shrinking

Laid flat in a 28px column the bar was 28×4 with a 7px fill in it: present in
the DOM and invisible on screen, which is the worst of both. Gabriel: "you can't
see anything, it's not well adapted." The narrow menu has no width and plenty of
height, so the measure takes the axis that is free — the same track, the same
fill, rotated a quarter turn and filling from the bottom. 6×40 instead of 4×28,
and the rotation runs on the same 180ms as the width, so it reads as the object
turning to fit rather than as a different component appearing.

### Who decides, and the shortcut

`matchMedia` on 1080px, and the rule is one sentence: **the window sets it when
it CROSSES, and you override it until the next crossing.** That is what the
`change` event already means — it fires on the crossing and never in between —
so there is no resize handler fighting the person using it and no stored
preference to go stale. `⌘\` / `Ctrl+\` toggles it, and the toggle sits in the
foot's tool row with the other preferences about the chrome, in the same place
at both widths.

A CSS media query cannot do this: it would re-decide on every frame of a drag
and could never be overridden.

### Two defects the collapse exposed

⚠ **Every nav row had an invisible hover in light mode.** `--m-surface-hover` is
`#f0f3f4`, which is the exact colour of the ground the menu has been sitting on
since the 08-28 wrap — the token was only ever measured against a white card.
Nobody noticed while the labels were there to read; at 52px the hover is the
only thing that says a tile is a control. Rows now take their two steps from
`--m-nav-row-hover` / `--m-nav-row-on`, and **the same row inside a flyout takes
a different pair**, because in there it is standing on a card and has to step
the other way. One component, two grounds, two steps. The selected row is now
the plane's own colour, so the row you are standing on and the card it opens are
the same surface lifted off the same ground.

⚠ **`.ant-popover-inner` does not exist in antd v6.** The chain is
popover → container → content, and `antd-overrides.css` had been giving every
popover in the app a hairline against a class that has not existed since the v6
upgrade — so they have all been a shadow with no edge. A selector against a
missing class is not an error; it is a rule that quietly stops applying. Third
time in two weeks that antd's markup has moved under a rule (`:where()` ties,
`.ant-checkbox-inner`, now this): **measure the chain before writing a selector
against this library.**

### The collapsed width is arithmetic, not a number

`calc(var(--m-space-5) * 2 + 1.75rem)`. Frozen at a round value it was 4px short
in the prototype's Spaced density and the row was silently clipped. Any measure
built out of gutters has to be built out of the gutter *tokens*.

---

## 20. The batch alongside it (2026-08-31)

Five things Gabriel caught while the menu was being built. They are here rather
than in their own sections because each one is a paragraph.

### A run in flight says nothing about individual steps, and that is the design

The complaint was flat: "there was no way to know in a running test which step is
being tested." **Three versions, and the third one is the only honest one.**

1. **A turning arc on the step the runner was on.** Gabriel: "you even created a
   different loader, it makes no sense." Right twice — a second loading
   vocabulary in a build that already has one, and a single spinner answers "is
   something happening" rather than "what is happening now".
2. **The whole tail shimmering, loudest on the current step.** Better, still
   wrong, and wrong at the root: "the runs with status running can't have check
   or loading indicators in the steps, **because we don't know which step we're
   at**."

That last sentence is the whole section. `runSteps` had been *inferring* a
position from elapsed time — so many seconds a step — and handing back "passed,
passed, running, unknown". Every part of that was invented: the ticks were a
guess dressed as a result, and the one "running" step was a guess about the only
thing anybody wanted to know. **So while a run is running, every step is
running.** They are all the same to us, so the drawer draws them all the same:
same empty ring, same colour, same weight.

What is left is the truth: **this is happening now**, said by the app's own
loading language rather than a glyph of its own.

- **The text sweeps horizontally, every row in phase.** The band is sized in
  pixels rather than as a percentage of each line, so a two-word step and a
  nine-word step are not sweeping at different speeds; every row starts on the
  same left edge, so it reads as one wave crossing the panel.
- **One pulse walks down the wires, one step at a time.** The band crosses a row
  in the first eighth of the cycle and the wire rests for the other seven, with
  each row starting 0.3s after the one above — so at any moment exactly one
  connector is lit and the lit one is moving down. That is the one claim the
  drawer can honestly make about a running test: it is going that way.

⚠ **One wire per GAP — circle to circle — and it overflows its own row.** Two
versions cut the gap in half before this one: first two segments meeting at a
node, then one segment per *row*, which is the same mistake wearing a different
name, because a row's box is centred on its node rather than spanning between
two. Either way the pulse crossed half the gap, stopped, and the other half
started later. The wire starts at this row's node and ends 18px into the next
one — `top: 18px; bottom: -18px` — so it is one element over one gap. It works
because a row is not a stacking context and every node carries `z-index: 1`, so
the next circle paints over the far end of the wire exactly as its own does over
the near end.

### One mark for five outcomes

It used to be a Check, an X, a SkipForward, a spinning Loader and a Circle: five
shapes at three sizes, so the column had no rhythm. Now every step wears the same
14px ring and the outcome is drawn inside it; running has no glyph at all.
Colour marks the exception and nothing else — the chip in the section header
already says the run passed, and eight green ticks say it eight more times.

⚠ **The node sits on top of the wire.** "The line is on top of the red circle and
it's ugly." The ring is filled with the panel's own surface and lifted one
layer. The row rules went at the same time — a vertical rail crossing a
horizontal rule at every step is two grids fighting, and the rail already
separates.

### The drawer's close button

antd v6 renders its close as the first thing inside the header title, so the X
landed on the eyebrow's line and pushed the whole lead block 30px right: a
header whose left edge did not agree with the body's, and a dismiss control
sitting in the middle of the writing. `closable` is off and the close is ours —
an IconButton like every other icon-only control — as the last item in the
header's own group, after a hairline. **The hairline is the whole point:** Rerun
and Pause act on the thing, the X dismisses the surface it is in, and a dismiss
that looks like a sibling of "Pause" is a dismiss you press by accident.

### Synthetics, and its first section is Tests

The agent is called **Synthetics** now, which is what this category is called
everywhere else, and that frees the word "Tests" for the section that is a list
of tests. It had to be "List" only for as long as the agent was also called
Tests, because a child repeating its parent reads as a mistake.

The menu's group label is **Agents**, not Products — they were products while
the question was how the company sells them; the menu's question is what is
working for you. **"Add agent" is hidden**, not redesigned: it answered "where
does the next agent go", and nothing in this build creates one. Its two lines of
CSS sit on top of `.m-nav-item`, so it comes back as a row rather than as a
shape of its own.

### The pager's current page was the only near-black outline in the build

antd draws the active item's border from `colorPrimary`, and this app sets that
token to near-black so the figure inside it is near-black — so page one came out
as a 26px box ringed in `#161c1e`, which at the Round radius reads as a sticker
dropped on the footer rather than as "you are here". Selection in this system is
a **fill plus a weight change** — the nav's current row, the segmented thumb, the
selected table row — and the pager is not an exception. The ring is gone and the
fill stays.

⚠ Scoped to `.ant-pagination .ant-pagination-item-active` rather than the class
alone: two classes tie with antd's `:where()` rule and lose on import order,
which is now the fourth time that has caught something in this build.

**And the arrows were not in the middle of their own boxes.** antd's prev/next
are `display: block` with a line-height, which is the right shape for the icon
*font* it ships and the wrong one for the SVG we swapped in: an inline svg sits
on the baseline and starts at the content box's left edge, so the chevrons came
out 6px high and 6px left while the digits beside them were centred. Centring
the box is the fix rather than nudging the glyph — a margin tuned to one icon
size is a margin that breaks at the next one. **Any icon-font swap inherits the
font's alignment assumptions**; this is the same shape of defect as the sort
arrows and the pager arrows themselves.

### The pager's arrows are lucide

Same complaint and same answer as `SortIcon`: antd draws prev/next with its own
filled, sharp-cornered icon set, and next to a page of 1.75px rounded strokes
they were the two hardest shapes on screen — which is backwards, because
"previous page" is the quietest control in the footer. `pagerItem` is spread as
`itemRender` at all three pagers, so a fourth list cannot get antd's arrows back
by forgetting.

### The dot, in both widths and one level down

Three follow-ons, all the same mark.

**It rides the figure, not the row.** Given its own auto margin in the open
menu it floated at the count column's left edge, a dozen pixels off a single
digit — "the dot is in the middle of nowhere". It lives *inside* the count now,
hard against the number, and the pair is what gets right-aligned. Narrow, the
number is hidden and what is left climbs onto the glyph's shoulder: one element,
two placements, no second mark to keep in agreement. **The figure caps at 99+**,
because three digits is a different column width for one agent.

**It is on both lists**, meaning the same thing one level down: the menu says an
agent has found something, a list says which of the things it found you have not
read. In Issues that is "not opened yet" — seeded from the three most recently
seen and cleared the moment you open one, because opening *is* reading it and a
"mark as read" control is one nobody uses. In Synthetics it is a draft, a
revision or a merge waiting on you, which is why that one carries a tooltip and
the issues one does not.

The tests list had its own 6px dot trailing the row; it draws the app's 5px one
leading it now. **`.m-dot` lives in `base.css`**, with the nav, the two lists
and the notification bell all reading it — three call sites is where a local
class becomes a system mark.

⚠ **The slot is on every row, empty on most of them.** Rendered only where it
applies, it pushed those three titles five pixels right of the other seven — and
a column of titles that does not line up is the exact complaint the dot came out
of in the menu.

### The critical flag stops climbing with the chip radius

It is a 20px **square** on `--m-radius-chip`, so the Round preset's 999 clamped
to half the box and turned it into a circle — and a circle in a table row is an
avatar or a one-of-these, never a mark on that row. It reads `--m-radius-check`
now, which was capped at 0/2/4 for the checkbox. ⚠ **The token's role is wider
than its name:** it is every small square mark that must not become a circle, and
the checkbox was only the first thing to need it.

### Not done

**The search button is the loudest thing in the collapsed rail.** It kept the
accent fill it earned as a `+` — "the one control that MAKES something rather
than going somewhere" — and search makes nothing. At 256px it is a small square
at the end of a row; at 52px it is a black tile under the mark and the first
thing your eye lands on. Flagged, not changed: the fill is a deliberate decision
from a previous round and reversing it is Gabriel's call.

**No Storybook story for the flyout**, and the collapsed nav's stories cover the
two states but not the transition.


## 21. The top of the menu, and the word that became a rule (2026-09-02)

Mehdi asked for a redesign of the sidebar, "always aligning with the collapsed
version". Five changes, and they are one change: **the column now says what the
product is, then whose account you are in, then where you can go** — three
things in that order, with air between them, instead of one crowded row that was
doing the first two at once and a heading doing none of them.

Everything below is a REDUCTION of itself at 52px, which is the rule the narrow
menu has had since 08-31 and the reason this did not need a second nav: the logo
keeps its mark, the account keeps its badge, the rule keeps its rule.

### The logo is its own row, and the product finally has its name on screen

The mark used to sit inside the project switcher, standing in for the logo. Two
things were wrong with that. The product was **unnamed on its own first screen**
— the only word at the top of the app was a customer's domain — and the one
permanent thing in the column was drawn as part of a control you change all day,
which made the mark read as a project's favicon.

So: the mark and the word, on a row of their own, and **it is not a control**
(`data-mark-host` on a plain div, which is what `brand-mark.css` was already
written to support). It still turns on hover and once on mount.

**It sits in the glyph column.** Same 15px glyph and same 8px inset as every row,
so the mark, Search's glyph and every agent's share one centre — measured at 32
in both, with the wordmark's left edge and the row labels' at 47 — and at 52px
all six glyphs sit on the rail's own centre. That is asserted in `proto-check`
rather than looked at: the collapsed-rail centre check went from four objects to
six, and it caught the first version, where the pair's 8px gap survived the
collapse and pulled the mark 4px left of the rail.

**15px in both widths.** The collapse takes words. A logo that also changed size
would be the collapse taking the brand with them.

### The account is a control with an edge, and two lines

It was one line: mark, `frontend.acme.com`, chevron. You had to infer the
organisation from the domain. It is now a badge, the project, the organisation
under it, and the chevron — because those are two different facts. The
organisation is who is paying and almost never changes; the project is which of
its sites you are looking at and changes all day.

**A hairline at rest, the row's own fill on hover.** It is the only thing in this
column drawn as a control, and deliberately: every row under it *goes* somewhere,
this changes what all of them are *about*. A switcher with no edge is a switcher
somebody has to be told about.

**The badge is a square, and the person at the foot of the menu is a circle.**
Two sets of initials in one column mean two different kinds of thing, and after
the labels are gone the shape is all that is left to say which. An organisation
is not somebody.

Narrow, it loses its box and keeps the badge — the same move the credits meter
makes when it loses its box and keeps the measure — and it keeps its hover,
because it is still a control that simply has no edge to draw at that width.

### Search is a row

Section 20 flagged this and left it: *"the search button is the loudest thing in
the collapsed rail… flagged, not changed: the fill is a deliberate decision from
a previous round and reversing it is Gabriel's call."* It has been called. Mehdi:
"the search item should also be an item of the menu, instead of a button, and it
shouldn't be as highlighted as it is right now."

It was an accent-filled tile, which is a shape that says *this is the thing to do
next* about something you reach for when you already know what you are looking
for. It is a destination, like Sessions, so it is drawn like Sessions — and
because it is now a `NavItem` it collapses, flies out and highlights with the
same code as every other row, instead of being a shape of its own to keep in
agreement with them.

### "AGENTS" is a rule

It was the only uppercase type in the column, and it was labelling the obvious:
eleven rows carrying agent glyphs and open counts do not need to be told what
they are. What a group needs is a START, and a start is a line — **one pixel of
ink instead of six letters**, with the air around it reading as room rather than
as a heading nobody reads.

Three consequences worth stating:

- **It is one object at both widths now.** The label had to *become* a rule when
  the menu narrowed — animating height, padding, colour and background to fake
  it. Now only its length changes: full bleed to 28px.
- **It sits above the scroller, not inside it.** So it stays put and the list
  scrolls under it, which is what a boundary should do.
- **The group keeps its name for anyone who cannot see a hairline.** `role="group"`
  and `aria-label="Agents"` on the list. A rule is a visual affordance and it
  should not cost a screen reader the heading.

### The vertical distribution, in five numbers

"Increase a little bit" — so the gaps that already existed were opened, and no
element was added to hold air:

| between | was | is |
| --- | --- | --- |
| logo → account | — (one row) | 20 |
| account → Search | 16 | 20 |
| Sessions → the rule | 16, then a 24px label | 16, then 1px, then 16 |
| row height | 30 | 32 |
| row to row | 1 | 2 |

The two pixels on the row are bought where a menu should buy air: **inside the
thing you are aiming at**, so the hit target grows with the breathing room. And
the three margins are declared in exactly three places — the logo, the account
and the separator — so the rhythm has one definition to change.

### The type hierarchy is three sizes and two weights

Mehdi: "the text hierarchy is not good enough, but the changes should be simple,
for example change a little bit the weight, but keeping consistent and well
tokenized." So nothing was added to the type scale and no size was invented:

| | | |
| --- | --- | --- |
| the product | 16 medium, primary | `--m-text-lg` |
| the project, and the row you are on | 13 medium, primary | `--m-text-sm` |
| every other row | 13 regular, secondary | `--m-text-sm` |
| the organisation, a section row | 11 / 13 regular, muted | `--m-text-2xs` |

**The one size step in the column belongs to the logo.** Below it, hierarchy is
weight and colour — which is why the project name came DOWN from 14 to 13, to
sit on the rows' own size rather than between them and the logo. Four levels,
three sizes, two weights, no uppercase and no tracking anywhere in the menu.

### What this cost

**Two class names went** — `.m-nav__project*` and `.m-nav__new` — and
`.m-nav__label` with them. `git show` has all three if any of this reopens; the
switcher is the closest thing to a decision that could be argued back, since a
bordered control is one more edge in a shell whose whole argument is that it has
almost none.

**Nothing else in the app was touched.** The change is two files and their
comments (`SideNav.tsx`, `side-nav.css`), three lines of `nav-item.css` for the
row's height and the words that fold, and `proto-check`'s inventory of what is
at the top of the menu.

### The batch off it, same day

Three things Mehdi caught looking at the result.

**An agent and its own sections were the same type.** "The type weight of the
font and the subitem should be different." They were both 13px regular, told
apart by an indent, a hairline and a colour — not by the type, which is the
thing you actually read. **A top-level row is now medium and a section row is
regular**, one step apart, and the parent stops looking like a sibling that
happens to be higher up.

The consequence is deliberate and it is the more useful arrangement: **the weight
step moved off the current row and onto the hierarchy**, where it separates
eleven rows from their sections instead of one row from the other ten. The
current row was never leaning on it — it is a filled surface in the plane's own
colour with primary ink, the same selection grammar as the pager and the
segmented thumb.

**It also exposed a latent defect.** `.is-nested` is declared after `.is-active`
and both were two classes, so the later one won: a section you were standing on
took the fill and kept the **muted ink of the ones you were not**. Invisible for
as long as `.is-active` also carried a weight change to lean on. Fixed with the
one three-class selector this stylesheet has, and asserted.

**The account tile was "weird, very compact… it should be compact in the compact
density and spaced in the spaced."** It was 40px flat: 2px of border and 12px of
padding left a **26px content box holding 30px of type**, so the two lines were
crammed against the border — and no roomier at Spaced, because 40 is 40 whatever
the density control says.

So the box is what is IN it, as arithmetic rather than a number:

```
height = the two lines + padding·2 + border·2
```

Every term is a token, so the tile answers the density control — **44 compact, 48
Spaced** — and the type control with it: two of the five type systems set
`--m-text-sm` a pixel larger, and the tile grows for them instead of clipping.
It has to be *definite* rather than `auto` for two reasons, both noted in the
stylesheet: `auto` is the one value a height transition cannot start from, and
the collapse cannot be measured off the content, since a line folded to zero
*width* still occupies its line box.

**And the menu's rows came along**, which is why the height became a real token
(`--m-nav-row-height`, 32 compact / 38 Spaced) rather than a number in
`side-nav.css`. The density note in `gen-proto-themes` already said why: *"a row
that keeps its height while the gaps around it grow reads as a spacing bug
rather than as a roomier product."* It is not `control-height-md`, because a nav
row is not a control — it went to 32 for the air Mehdi asked for while every
input and button stayed at 30.

### The switcher opens something

"Nothing happens when clicking, think about that, it should be as simple as
possible, but all the account feature should work with mock data."

`account.ts` holds the organisation, its plan and its four projects.
**Switching is real** — the menu holds which one is current and the tile
redraws — and it is the whole feature, because a switcher's only job is to
switch.

**The card is the tile, continued.** Its head is the same badge and the same two
lines as the control you clicked, using literally the same three classes, so
there is one definition of how an account is set. What changes is which fact
leads: out on the tile the project does, because that is what you are looking
at; in the card the organisation does, because that is what the list belongs to.
The two overlays in this menu are also one card — measured, not assumed: same
1px `border-default`, same 8px radius, same 4px inset as the row flyout.

Three things are deliberately not in it:

- **No tick on the current project.** Selection in this build is a filled
  surface plus primary ink — the nav's current row, the pager's current page,
  the segmented thumb — so a checkmark would be a fourth way of saying what
  three things already say. The rows are the same `NavItem` the menu draws its
  own sections with.
- **No "PROJECTS" heading.** A hairline says where a group starts, which is the
  call the menu itself just made when AGENTS became a rule.
- **No invite, no billing, no second organisation.** None of them exist anywhere
  in this build. A row that opens nothing is worse than a control that did
  nothing — it promises twice.

The one non-project row is **Preferences**, going to the page the menu's foot
already goes to. It is here because it is what you come to an account menu
looking for and it exists.

**It is the only overlay on this control**, at both widths — no hover tooltip
underneath it, unlike the rows. The card names the organisation and every
project in full, so there is nothing left for a tooltip to give back, and two
overlays on one control means the hover and the click disagree about what it
does.

Behaviour, all asserted: it opens on click and on Enter, closes on select, on
outside click and on Escape, the trigger stays lit while its card is up, and the
fill moves with the switch so the card never disagrees with the tile.

### Not done

**The pages do not read the project.** Every list in the prototype is the same
fixture whichever project is current. `account.ts` says so at the top: the
switcher works, the data behind it is one set, and that is where the project
moves to the shell on the day a page takes one.

**The person at the foot of the menu still does nothing when clicked.** It is a
different control from the switcher — the account at the top is an organisation,
the avatar is somebody — and giving it the switcher's card would make an
avatar open an organisation menu. Flagged rather than guessed: it is either its
own small menu or it is the switcher's second trigger, and that is a call, not
a detail.


## 22. Sessions, rebuilt from the production page (2026-09-02)

Gabriel: bring the sessions page over from the OpenReplay codebase, list
everything it does, and redesign it **without changing anything on the backend**
— and remember Mehdi's rule, that a frontend change has to be extremely easy to
implement or not worth making. The core ask: **the event and filter buttons
become one button, and the core functioning stays exactly the same.**

The full inventory came first and it is its own document:
`context/sessions-feature-inventory-2026-09-02.md` — 41 features across the
shell, the search card, the list header, the session card and the list, with
each one marked free, cheap or expensive to change. Everything below is
downstream of that.

### The constraint, stated once

**Nothing here may need a field the list payload does not already carry.** That
one line killed the two things a session list is always redesigned into: a
per-session **journey strip** and a **thumbnail**. Neither is in the payload;
both need an endpoint. They were considered and dropped, and they are dropped in
writing so nobody re-derives them.

What it did NOT kill is more interesting: `errorsCount`, `pagesCount`,
`issueTypes` and `platform` are all in the payload today and **drawn nowhere**.
Two of them are columns now. That is the cheapest win in the exercise.

### One button, and why it is a small change

Production has two `+ Add` buttons under two headings, Events and Filters. They
open **the same** `FilterModal` with the same props, differing only in which
half of the catalogue they were handed. And the store never split them:

```
searchStore.instance.filters   // ONE array, every item carrying `isEvent`
searchStore.instance.eventsOrder  // ONE value: 'then' | 'and' | 'or'
```

So the unified search is **the existing control opened once with the filter on
its input removed**. The picker still calls `addFilter` with one catalogue entry
and the entry's own `isEvent` decides where the row lands. Nothing downstream
changes — which is the whole reason this qualifies under Mehdi's rule.

**What the two sections cost was concrete.** You had to know whether the thing
you wanted was an event or a property *before you could start looking for it*.
"Is duration an event?" is not a question anybody should have to answer to
search their own sessions.

**Everything load-bearing is kept**, and each of these is a fact about the data
rather than a preference:

- Events are an **ordered, numbered, draggable** sequence. Properties are an
  unordered set.
- `eventsOrder` is **one** THEN / AND / OR for the whole search. Not one per
  gap — the backend takes one value.
- An event carries its own properties under **"where … and/or"**, one
  `propertyOrder` per event, changed by clicking the word.
- A property already in the search **cannot be added twice**; an event can. Two
  Clicks in a sequence is the normal case; two Country filters is a
  contradiction.
- An event row draws **no operator**, because production gates the operator
  block on `!isEvent` and "Click" is not a comparison.

**The two kinds are still obvious, and from the ROWS rather than a heading over
them.** An event has a number, a handle and a property affordance; a property
has an operator and a value. The one kept hairline separates the sequence from
the constraints and is drawn only with something on both sides of it.

> **The position slot is on every row** and filled only on events, which is the
> trick that makes one list hold two grammars. Rendered only where it applies, a
> property's subject would sit 28px left of the events' and the list would read
> as two lists that failed to line up. Asserted: `1 edges at 295`.

### A row is a clause, not three fields

`Geography · Country  is  France` reads left to right in one line of type at one
size. The **operator is drawn as the word it is** — a real Select, focusable and
keyboard-operable, borderless until you hover or focus it, which is this app's
existing rule for a control that lives inside prose. Production draws three
bordered controls of three different widths and the sentence is something you
assemble in your head.

The order control got the same treatment: **"matching then"** instead of
**"Events Order: THEN"**. The first is English; the second is the column name
beside a wire value in caps. The three words carry their meaning in the dropdown
and not on the closed control, because *then / and / or* is exactly the kind of
vocabulary people get wrong once and then avoid.

It appears at **two** events, not one. With a single event there is no gap for an
operator to sit in, and a control that cannot change the result teaches you to
ignore controls. Production shows it from the first event and only refetches
above one.

### The same field takes a sentence

`aiFiltersStore` has existed in production for as long as the string
*"Translating your query into search steps…"* has, and **nothing on the sessions
bar ever opened it**. Gabriel's call: same single button.

Type two or more words and the picker offers to read them. The offer **shows its
work** — the steps it understood, numbered, in the same words the rows will use,
and the words it could not use printed rather than dropped. It sits *above* the
matches and never instead of them, because what you typed might be both a filter
name and half a sentence and the picker does not get to decide which you meant.

**What comes back is ordinary rows.** That is the point: you can see what it
understood, correct the one clause it got wrong, and keep the rest. A translator
whose output you cannot edit is a search box you cannot trust.

`translate()` in `shared/sessions-logic.ts` is a deliberately dumb phrase
matcher. Swapping it for the real endpoint is the whole integration.

**And the empty search offers three examples**, which was asked for on the Issues
search back on 06-29 and applies here for the same reason: a field that accepts
prose has to show the shape of prose it accepts. All three actually translate —
an example that came back empty would be worse than no examples, and
`sessions-check` clicks all three.

### The list is a table

Production draws each session as an ~84px four-zone card. Every zone is a
percentage width with its own two-line stack, so **no two rows put a figure in
the same place** — "47 events" on one row sits a few pixels above "12 events" on
the next, and you cannot scan a column that is not a column.

| | production card | this table |
| --- | --- | --- |
| Figures | three zones, no shared edge | one face, right-aligned, tabular |
| Sorting | a dropdown with four options | any column it shows |
| `errorsCount` | in the payload, drawn nowhere | a column |
| `pagesCount` | in the payload, drawn nowhere | a column, opt-in |
| Rows per screen | ~7 | ~12 |

Four smaller calls inside it:

- **A zero error count is a dash.** A column of "0" is a column of noise; the
  only question the column answers is *which of these went wrong*, which a
  sparse column answers at a glance.
- **No country flag.** 134 raster sprites in a monochrome interface, and "GB"
  cannot be mistaken for "IE" at 16px the way the flags can.
- **An anonymous session reads as one** — muted, in the figure face, because it
  is an ID. Production colours *identified* users teal, which puts the accent on
  the ordinary case.
- **The metadata chips are clickable**, which is the best affordance on
  production's card and the one thing from it that had to survive: it is the
  shortest path from "this session is interesting" to "show me the others like
  it", and the only place in the app where a list writes to a search.

**Bookmarked is a tab, not a filter.** It is a different list of the same thing
with its own route in production. A section replaces the body; a filter narrows
it. The search, the columns and the date range all keep working inside it, which
is what makes it a tab and not a second page.

### The search stays at the top

Mehdi, on seeing it: *"this should be stick to the top when scrolling."* Right,
and for a reason worth writing down — it is the one control on this page you
reach for **while** reading the list, and a control you have to scroll back up to
is a control you use once.

Three things make it work, and it is a **wrapper** rather than the card itself
for the first of them:

1. The sticky box has to be **opaque, in the plane's colour**, so rows disappear
   into it. Put that on `.m-sc` and `.m-page__body > .m-sc` out-specifies
   `.m-sc` — **the well loses its own fill and the whole card goes white**,
   which is what happened for one build.
2. **The gap belongs to the sticky box.** `padding-bottom` on the wrapper, never
   a margin on the card: a margin sits outside the sticky box and rows slide up
   through it.
3. `z-index` above the table.

### Three defects worth recording, because none of them errored

1. **`.m-search` was already taken.** It is the page header's `SearchField`, and
   it is a *width* — `13rem`. The new section borrowed it and came out **208px
   wide inside a 1410px plane**, with the empty state stacked into a column.
   Nothing in the stylesheet looked wrong. Renamed to `.m-sc`.
2. **antd v6 renders `select > content > input` with the caret in
   `.ant-select-suffix`.** There is no `.ant-select-selector`, no
   `.ant-select-selection-item` and no `.ant-select-arrow` anywhere in the tree,
   so every rule aimed at the operator matched nothing and failed silently — the
   same trap `.ant-popover-inner` set on the hairline. Third time this library
   has cost a silent stylesheet; it is now measured in `sessions-check` rather
   than eyeballed.
3. **`surface-sunken` is invisible on this plane.** #f6f9fa against #ffffff is a
   1.5% step, so the search had no container on screen and three clauses read as
   loose lines floating over the table. It is `surface-canvas` now — the ground
   the whole app sits on, which is the honest colour for a hole in the plane, and
   it steps properly in both themes.

### What is mocked, and said out loud

**`sessionEvents` is a stand-in.** The list payload carries no event stream —
that is the boundary this whole redesign is drawn inside — but the SEARCH is
evaluated by the backend, which does have the events. So the fixture models what
the backend knows: a deterministic ordered event list per session, derived from
the numbers the session already has.

It has to satisfy two things that pull against each other. The order must
*usually* be the catalogue's order, because that order is the shape of a normal
journey (search, then cart, then checkout) and a THEN sequence anybody would
actually type has to match something. And it must *sometimes* not be, or THEN
and AND are the same question and the header control is decoration. So: the
subset is chosen by hash and kept in catalogue order, and **a third of sessions
did it backwards**. Asserted — `{then: 17, and: 22, or: 87}`.

**An event's properties narrow nothing in the prototype.** The stand-in models
which events a session contains, not what each one carried. That is the one
place this knowingly under-filters, and it is under rather than over on purpose.

### Where it lives

```
shared/sessions-data.ts     134 sessions + the catalogue, as the API shapes it
shared/sessions-logic.ts    operators, the search model, evaluation, translate()
option-a/src/state/useSessions.ts
option-a/src/sessions/      SessionsPage · SearchCard · SearchRow · FilterPicker
tools/sessions-check.mjs    37 assertions
```

18 Storybook stories across three files, every state reached through the real
controller verbs so a story cannot show a state the app cannot produce.

### Not done

- **The replay is not wired.** A session row's cursor says it opens and it will;
  it navigates nowhere today. Replay goes last, by the 08-27 decision.
- **Notes** and the **live / Assist** variant are out of scope by Gabriel's call.
- **No sticky table header.** Sensible under a sticky search, but the offset has
  to equal the card's current height, which changes as rows are added — a
  measured offset, not a constant. Flagged rather than half-built.
- **Session settings** (timezone) and **Share this search** are menu rows that
  open nothing yet.

### The batch off it, same day (2026-09-02)

Four things Mehdi caught looking at the result, and one of them replaced a
control rather than adjusting it.

**"Keep only the all sessions and bookmarks, remove the other tabs."** The
issue-type strip went, and its whole toolbar row went with it.

It lost almost nothing, because `issueType` is already a property in the
catalogue — an array with the same five values and the same backend key. So all
five are still reachable through the one button, and the property version is
strictly better: it composes with *contains / has any / is empty*, and the value
picker shows each type's **share of traffic** where the strip could only show a
count. **The state went too** — `issueTypes` on the search was a second path to
a filter the catalogue already offered, and two paths to one filter is the
duplication this whole exercise is about deleting.

What it did cost: the counts were visible without opening anything. Noted rather
than pretended away.

**The tabs were the wrong component.** They were a `FilterStrip` — the pill
strip — in a slot PageCard describes in as many words: *"text tabs with an ink
bar, deliberately a different shape from the pill toolbar below, because a
section replaces the body and a filter only narrows it."* Pills in there made
the two sections read as two filters, which is the confusion those two shapes
exist to prevent. It is antd `Tabs` now, the same as the Tests page's three
sections.

**And the date range and the display menu moved onto the search's own bar**
rather than staying on a row with nothing else in it. They belong there for a
better reason than tidiness: **that bar is what sticks**, and a window you
cannot change without scrolling back up is the same complaint the sticky came
out of.

### The field, and the ring

> *"The filter section is really simple, it should be something cool, with a
> cool hover animation, like it should be a nice button, a complex button, maybe
> with a subtle ring — like something that will be an AI agent for search
> later."*

**`+ Add filter` became a field.** Ninety pixels of button gave no sign it
accepted a sentence, so the half of this search nobody expects was invisible
until you opened it. Something the width of the plane says *type here* without a
word, and the note on its right says what typing gets you: **"reads plain
English"**. Four words, not a bare sparkle — the sparkle is the templated
version of this and it says nothing; the words say the whole feature.

It is still a `<button>`, because it opens a menu and holds no text. It is
*drawn* as a field.

**The ring** is the one piece of expression on the page, and it is here rather
than anywhere else because this field is where the search agent will live — a
control that is about to start answering questions should look like it is
listening.

Built with the deliberately boring technique: a clipped box over the field's
border box, a conic gradient at twice its size spinning inside it, and a second
layer inset by 1px in the field's own colour, leaving a one-pixel rim. No
`mask`, no `@property`, no registered custom property — so it behaves the same
everywhere and degrades to a static rim rather than to nothing.

Three rules, and each is the difference between this and the AI-slop version:

1. **Not on at rest**, and the animation is `paused` rather than merely
   invisible, so it costs nothing while nobody is pointing at it.
2. **Mostly grey.** The sweep is the border's own two greys with a single accent
   arc passing through — one accent per view, and the base is the *resting*
   border colour so the rim never reads lighter than what it replaced. Built on
   `border-subtle` first, three quarters of the rim came out fainter than the
   border and pointing at the field read as the border going away.
3. **It stops being a sweep when it is a focus ring.** On `:focus-visible` the
   rim holds still in the focus colour: an indicator that moves cannot be
   located. `prefers-reduced-motion` gets the same static rim.

All three are asserted, because "is it animating" is exactly the kind of claim a
screenshot cannot settle.

### The proportion bars

> *"There are some filters where you see the proportions of the results with a
> bar — make sure you have mock data to show everything."*

This is the best control in the production app and the easiest one to lose in a
redesign, because it looks like an ordinary multi-select until you notice the
bar. What the bar does: **it tells you whether a filter is worth applying before
you apply it.** "France 12" turns picking a value from a guess into a decision,
and a sliver of a bar tells you the filter will empty the list before you watch
it happen.

The whole value control was a plain antd multi-select. It is `ValuePicker` now,
and four decisions:

- **The counts are counted, and live.** `userCountry`, `userBrowser`, `plan` and
  the rest read the 134 sessions against whatever the date range and the *other*
  filters already left — so they answer "how many would this leave me" rather
  than "how many exist somewhere", and the menu and the table can never
  disagree. Asserted: the figures sum to the session count.
- **Where there is nothing on a session to count** — a URL, a selector, an error
  string, an event's own properties — the candidates come from `VALUE_FIXTURES`
  with weights. Same control either way; a value field with no shares is this
  control with its best feature removed.
- **The bar is relative to the widest candidate, not to the total.** Sessions
  spread over nine countries put every share under 20%, and nine slivers compare
  to nothing. A full bar beside a three-quarter one is readable.
- **It is `CheckRow`** — the same option row the filter tree, the display menu
  and the capture popover use — with the bar riding its `meta` slot rather than
  being a fifth kind of option row.

Production draws its bar as a blue underline hard against the row's left edge,
beneath the label: a coloured line under text you are trying to read, clipped at
whatever width the label happened to be. Right-aligned in a fixed column, the
bars share an axis, so their **lengths are comparable** rather than merely
present.

Two smaller calls that fell out of it. **An open field takes typed values** — a
URL that only exists on staging is still a URL you need to filter on, and
production's autocomplete allows it; Enter commits. And **a number with known
values gets the picker too**: a status code is a number *and* an enumeration, so
`status` is a string with options and the picker is used wherever
`hasValueOptions` is true. A number with nothing to enumerate (`errorsCount >
5`) keeps the spinner, which is the right shape for a threshold.

### Two more defects that never errored

**`align-items: baseline` on a fixed-height pill never centres anything.** It
aligns the items to each other and then drops the group wherever the first
baseline lands, which sat the subject's text a couple of pixels high in a 26px
box and read as broken padding — Mehdi spotted it before I did. It is `center`
now, and the pill went from `control-height-sm` to `md`, because at 26px a
two-word clause was squeezed against its own border.

**The value select was eating the whole line.** `flex: 1` plus `margin-left:
auto` on the remove meant it absorbed every spare pixel on the plane — a 370px
empty box beside a three-word clause, with the "needs a value" note stranded at
the far end of it. A clause is as wide as what it says.

### And the well became a band

Full bleed with an 8px radius is a rounded corner at the plane's own edge, which
is a radius nobody can see. The plane's body has no horizontal padding — the
table below is edge to edge and its cells carry their own inset — so the search
is a **band across the plane** rather than a card floating in it, which is also
what it is: a region of the page, not an object on it. One hairline closes the
bottom; the fill does the rest.

### It is not a search bar, and it is not called search (2026-09-02)

> *"It's still really looking like a search bar, and that's something else, and
> I don't even like to call it search — maybe it's just a field with a very nice
> objective concise placeholder, maybe we can rotate examples. Remove the
> examples pill and row, make the field the most important part."*

Right about the word. **You are not searching a corpus, you are saying which
sessions you want** — and what comes back is a description you can edit, not a
result set. Every word a reader sees now says filter or describe: the section's
accessible name, the picker's placeholder, the translation offer ("read this as
a filter"), and the page's own subtitle.

Three things made it read as a search bar, and all three are gone:

1. **The magnifier.** A magnifier *is* the search signal. It is a `ListFilter`
   glyph now, which says "this narrows a list" — what the control does.
2. **The "reads plain English" badge.** A label on a field, explaining the
   field.
3. **The row of example pills** under it, saying the same thing a third time.

**The placeholder does all three jobs instead**, which is why they could go. A
fixed **lead** that never changes, so the field always says what it is for, and
one **example that rotates**, so it teaches the half nobody expects:

```
Describe the sessions you want, like “paid users who hit an error”
                                     ↑ rotates, every 4.2s
```

Only the example crossfades — it is keyed on its own text, so React remounts it
and the fade runs once per example. A line where the whole thing changed every
four seconds would be a page with a pulse. **It pauses while you are hovering or
focused**, because text that changes under a cursor aiming at it is the most
irritating thing a placeholder can do and somebody hovering is somebody reading.
And it does not rotate at all under `prefers-reduced-motion`: a cycling line of
text is motion in every sense that matters.

All five examples really translate — `sessions-check` runs each one through the
picker and asserts it comes back with steps. A placeholder promising something
the field cannot do is worse than one promising nothing.

**And it is now measurably the most important thing on the page:** four pixels
taller than the tallest control in the app's own scale, and the only type here
at 14px while everything else is 13. That is the whole of its prominence — no
fill, no shadow, no accent at rest. Being the largest object in a column of
small ones is enough in a monochrome interface, and it does not spend the one
accent this view gets, which the ring already has.

**The `m-sc` prefix and the `SearchCard` / `search-row` filenames predate the
rename and are left alone deliberately.** Renaming a prefix across four
stylesheets, five components and a check suite to change a word nobody sees is
churn, and a half-done rename is worse than an old one.

### The filter puts itself away (2026-09-02)

Two complaints, one shape.

> *"The clear button takes a whole space in height that doesn't have anything
> else, [and] as the list grows, I can't collapse the list to show the result."*

**The strip that held only Clear now earns its row.** It carries the filter's
**summary**, its **result count**, and its **disclosure** — and Clear rides along
at the end where it already was. Four things on a row that had one, and none of
them is new chrome: the summary and the count were both already computed, and
the caret is the answer to the other half.

```
⌄ 4 filters · 89 sessions          matching then ▾            Clear
1  Events · add_to_cart
2  Events · checkout_start
   Geography · Country  is  France
   Technology · Browser  is  Safari

⌃ add_to_cart then checkout_start, Country is… and Browser is… · 13 sessions   Clear
```

**Collapsed it prints the whole filter as one sentence** — the same
`describeFilter` the saved-segment list and the screen reader use. That is the
difference between a collapse and hiding something: putting the rows away never
costs you knowing what they said.

### And scrolling does it for you

The rule is one sentence, and it is the app's own:

> **Scrolling collapses it, and you override that until the filter changes.**

Which is `useNavCollapse` again, deliberately — there the window decides when it
crosses 1080 and you override until the next crossing. Same shape, same reason.
**Two moments matter and they are different intents:** building a filter, where
you want every row, and reading results, where you want the filter out of the
way but still want to know what it says. **Scrolling is the moment your intent
changes.** So nobody has to click anything in the common case, and the one click
there is always wins.

*"Until the filter changes"* is the important half. Adding a clause is you going
back to building, so the override lapses and the card opens to show you what you
just added. An override that outlived the thing it was about would leave you
editing a filter you cannot see.

**It does nothing below three rows.** A one-clause filter is shorter than the
summary line that would replace it, so collapsing it would be the control
costing more than the thing it hides — the strip shows "1 filter" as plain text,
with no caret.

### An open control is not an accent

> *"This colour in that state is a weird semantic token."*

Two tokens were wrong and both were in `theme/antd.ts`, so both were wrong
everywhere:

**`controlItemBgActive: surface-selected`.** This is *the* token behind a
selected row in every dropdown, menu and picker in the app, and
`surface-selected` is the one teal-tinted surface in the set. So "the option you
already chose" was **the only selection in the build that meant selection in a
different colour.** Everything else says it with a neutral fill and primary
ink: the nav's current row, the pager's current page, the segmented thumb, the
picker's own category rail. It is `surface-active` now, in both the global token
and Dropdown's override.

**`activeBorderColor: border-accent`** on Input and Select. antd fires that
whenever a field is focused or a dropdown is open, so every control in the app
was spending the one accent this design rations to say nothing more than "you
are typing in me" — which the caret already says, and which an open popover says
unmistakably. `border-strong` instead: a firmer edge and nothing else.

**The keyboard focus ring is untouched and still accent.** That is
`:focus-visible` in `base.css` with `--m-focus-ring`, and an accent focus
indicator is the one place this colour is genuinely load-bearing.

## 23. The window, the footer, and three things the sessions table got wrong (2026-09-02)

A batch off Mehdi's second pass on the sessions page, plus two asks that turned
out to be about the whole app rather than that one screen.

### The date window is one control, and it exists everywhere now

> *"Custom range should work, and the date filter should exist also in issues,
> synthetics and audits."*

Four lists in this app are the same kind of thing — sessions, issues, runs and
audits are all "things that happened, most recent first" — and until today only
one of them had a window at all. Worse, the one that had it offered **"Custom
range" and quietly applied ninety days**. A control that lies is worse than one
that is missing: nothing on screen contradicted it, so the only way to find out
was to count rows.

`shared/date-range.ts` is now the model and `components/DateRange.tsx` the
control. What is shared: the presets, the custom pair, the arithmetic that turns
either into two absolute bounds, and the label. **What is not shared is which
field a page tests** — a session's window is when it started, an issue's is when
it was last seen, a run's is when it ran, an audit's is when it was created — so
each page passes its own timestamp in and **the menu prints the field's name**.
"Past 30 days" of what is a real question with four different answers, and the
control answers it rather than leaving the reader to assume.

**Why bounds and not minutes.** The first version was `rangeMinutes()`, a number
of minutes back from now, which cannot express "the 3rd to the 18th" at all.
Every preset can be written as a pair of bounds; a custom range cannot be
written as a duration. So the pair is the model and the presets are the special
case.

Three smaller calls inside it:

- **It prints its value, which is why it is not an icon.** Display and Filters
  sit beside it as icon-only buttons and they can: both are questions you
  opened, answered and closed, and a badge reports what they hold. A date window
  has no "off" — every list is permanently inside one, and it silently decides
  what the count at the bottom of the page means. A control that is always doing
  something has to always say what it is doing.
- **Half a range filters nothing.** Until both ends are picked the list keeps
  every row, because emptying a list while somebody is mid-decision is the least
  helpful moment to do it.
- ⚠ **The picker's panel renders inside the menu's own DOM node.** Left in the
  body it is "outside" as far as the click-away is concerned, so the first click
  on a date closed the menu the picker lives in.

**And the fixtures had to grow up.** Sessions spanned three and a half days, so
7, 30 and 90 days returned the identical 134 rows; runs spanned twenty days.
Both now spread over about two months on a curve weighted to recent, which is
the shape of real traffic and gives every preset a different answer. **A control
that cannot change anything teaches people it is broken**, and the demo is the
only place that can be found out.

⚠ **The runs list lost its "Period" dimension.** It was the one list whose date
window was a filter — inside the menu, as a removable chip. The reasoning behind
that chip was sound and it survives as the trigger's job: **a list silently
truncated to a window lies about how much there is.** A control that prints its
own value says that at least as loudly, and it can also say "Jul 3 – Jul 18".

⚠ **Not on the tests list.** Production has an "All time" filter there and
Gabriel already told Nikita to remove it; a date range over a list of test
definitions is a window on nothing anybody asks about. Runs is the part of
Synthetics that happens in time.

### Audits asks the same three questions as every other list

> *"Audits doesn't even have display and filter settings consistent with what we
> have."*

This file used to argue the opposite, in as many words: *"there is no filter menu
here and no display menu… adding the others to look consistent would be adding
controls that filter nothing."* **That was true of a three-row fixture and false
of the page.** An audit carries a scope, a period, an author, a health band and
a date, and every one of them is a question people ask of a shelf of reports:
the mobile ones, mine, the ones that came out badly, the ones since the redesign
shipped. What made the old argument look right was having three rows to ask it
of.

⚠ **The rule that survives is the one that made it sound right: consistency is
not a reason on its own.** Every dimension reads a field the audit already has,
and every ordering key is a column the table already draws. Nothing was invented
to fill a menu. `scope: string[]` became `segment: string` with a `scopeLabel()`
for the display line, because the one question people ask of this list — "show
me the mobile ones" — should not be answered by matching text in a pre-joined
array.

The fixture went from three audits to eleven, for the same reason the sessions
one grew: **eleven is enough for a filter, an ordering and a window to visibly
do something.** Four people, six scopes, three periods, health scores across all
three bands, dates from this morning to eleven weeks back.

### The footer was five copies of one object

> *"The footer padding is wrong."*

Five pages had written it out longhand, and the five had drifted three ways:
four inset the row by 12px against a table whose cells are inset by 20px, the
fifth had no horizontal padding at all and its count sat against the plane's own
edge, and one of the five had no rule above it.

`ListFooter` now, and **the alignment rule is the whole reason it exists: the
count starts where the first CELL starts and the pager ends where the last cell
ends.** Not where the table starts — the table is edge to edge in the plane and
its outer cells carry the page's margin themselves. A footer that uses a
different number is a footer that is *nearly* right, which is the only kind of
misalignment people feel without being able to name.

`.m-page__controls` came out of the same pass: the toolbar's right-hand cluster
was defined four times in three stylesheets that already disagreed about whether
it wraps.

### The columns stopped moving

> *"When you change the pages and the data changes, the column widths change
> too, and this shouldn't happen."*

antd's default table layout is `auto`, under which **a column's `width` is a
suggestion the browser overrides from the content**. So page two with a longer
email on it shifted every column beside it, and the columns you were reading
moved under you between pages. `tableLayout="fixed"` on all five tables; the one
column without a width takes the remainder. Asserted across three pages, because
this is exactly the kind of thing a screenshot of page one cannot show.

### The blank row above the column titles

> *"On the top of the table titles there's an empty row — look between the filter
> and the column title."*

The sticky search had 16px of `padding-bottom`, on the sound rule that a gap
under a sticky box belongs to the box rather than being a margin on the card:
rows slide up through a margin. What made it wrong was **the search becoming a
full-bleed band**. A hairline closes the band, the table's header row is a band
of its own, and 16px of the plane's colour between two bands reads as a blank
row of the table. The hairline is the separation now.

### "is not" could not be read

Measured, because the eye was right and the reason was not obvious: **the closed
operator drew the word at `content-secondary` while the same word in the
dropdown under it drew at `content-primary`** — so opening the menu made the
value brighter than the value you already had.

The rule it settles is worth keeping: **in a clause, the words you can change
are primary ink and the words you cannot are muted.** The subject and the
operator are controls set as prose; "is matched", "to" and "seconds" are the
sentence's connective tissue. Colour does the work an underline or a box would
do more loudly.

### The dropdowns truncated their own options

> *"These dropdowns are awful, it's not consistent because I can't even see the
> whole word — it doesn't make sense to truncate that."*

antd's `popupMatchSelectWidth` defaults to true, so the menu is exactly as wide
as the control that opened it. That control is 140px because it sits in a 240px
popover beside its own label — and the option rows carry their own padding and
draw a pixel larger than the closed control. So "Most events" fitted in the
trigger and came out as "Most eve…" in the list under it, **which is the one
place truncation is indefensible: a menu exists to show you the words.**

`MenuSelect` is a component rather than a prop passed at six call sites, because
six call sites is exactly how the first five get fixed and the sixth does not.

### The ring, third attempt: an arc on a path

Two versions were rejected and both failed on the same fact — **this field is
1400px by 40px** — each in the way its own model implies.

1. A **conic** gradient divides the box by **angle**. The whole right-hand end
   cap occupies about three degrees of the sweep and the top rim occupies a
   hundred and seventy-six, so a fifteen-degree accent arc was a five-pixel dot
   crossing the middle and covered the entire end cap when it arrived there.
   *"At the bottom and top it's small, but on left and right it takes like half
   the field."*
2. A **linear** gradient divides it by **distance**, which balances the arc but
   only moves sideways — the top and bottom rims light at the same moment and it
   stops reading as a ring at all. *"Now it's a horizontal movement, that's
   wrong."*

**A dashed stroke on an SVG path is measured in arc length.** The arc is the
same length wherever it is, it goes round the corners, and it travels the
perimeter in order — which is what "a circle" means on a shape that is not one.
`pathLength="100"` normalises the perimeter, so every dash figure is a
percentage of the loop and holds at any plane width.

⚠ **And the arc grows and shrinks**, which is the part that makes it read as
alive rather than as a marquee: the dash grows from one end, so the leading edge
runs ahead and the trailing edge catches up. The travel and the breathing are
deliberately not divisors of each other — at 3.4s and 1.7s exactly they would
land in phase every cycle and the whole thing would tick.

> *"The edges of the arc segments should be a gradient and the colour more
> subtle, you can even add a glow."*

A stroke cannot be given a gradient **along** its own length in CSS — `stroke`
paints by position in the box, not by distance down the path — so the softness
is a **blur**, which is the same result by a simpler route: a blurred cap has no
edge, it has a falloff. Two passes of the identical dash sharing one set of
keyframes: a wide one blurred hard is the glow, a narrow one blurred just enough
loses its ends. **And the colour is held back** — the arc is the accent at 60%
and the glow at 22%. At full strength it read as a status.

### The play, and the two positions it was wrong in

Three positions in one day, and the two rejected ones are worth keeping because
each was wrong for a different reason.

It began as a **hover-only glyph in the last column**, on the argument that the
row opens the replay so a button repeating that 134 times is 134 invitations to
do what the row already does. Half of that still holds — the row is the target
and this is not a second control — but it made the one verb of the whole page
invisible until you were already pointing at it.

Then it **led the row**, filled, at 12px: *"the play icon on the left is
horrible, it looks like a chevron."* Right. A small solid triangle with no
container is a caret, and at the *start* of a row a caret means expand.

> *"Maybe better to add an icon on the right, an outline lucide icon, that
> appears on top of the information, with a nice gradient behind to cover what's
> behind — so if I reduce the viewport and a scroll appears for the table, the
> play icon would still appear on the right."*

So: an outline `CirclePlay` at the right edge, always drawn, and ⚠ **sticky**.
The plane's body is the scroll container in both directions, and nine columns on
a narrow window overflow sideways — which put "watch this" off the right edge of
the screen on exactly the viewport where somebody needs it most.

⚠ **The gradient is what makes a sticky cell readable.** Without it the cell is
either transparent, so metadata chips slide under the glyph and collide with it,
or a hard fill, which reads as a column with a seam down its left edge. A fade
from nothing to the row's own colour lets content go quiet as it passes and
never draws an edge of its own. The fill is a custom property set on the **row**,
so it follows the hover — the plane's colour would stop matching in the one
state the play is actually in when somebody is looking at it. And `transparent`
rather than `rgb(… / 0)`: CSS gradients interpolate in premultiplied alpha, so
transparent-to-a-colour does not pass through grey.

⚠ **The header cell is sticky too**, and it is not a row: antd puts a column's
`className` on both the `th` and the `td`, which is what makes the pair hold one
edge. It gets the header's own ground so the column titles do not scroll out
from under the glyph.

### The bookmark became a control

> *"Add a bookmark icon right beside the replay, and besides all the regular
> states it should have the bookmarked (filled). This will remove the bookmark
> icon in the session column."*

It had been a **mark** beside the name, reporting `favorite`: the row drew the
fact and nothing set it. It is a real button now, with `aria-pressed`, a
stopped-propagation click — bookmarking a session is not asking to watch it —
and **the filled glyph is its on state**. Two lucide glyphs of the same shape,
one hollow and one solid, which is the only pair of states a bookmark has ever
needed, and it keeps this page's single accent for the play.

Four states and only the fourth is not a shade of grey: decorative at rest, the
row's hover brings it forward, its own hover gives it a target, bookmarked is
filled and primary. ⚠ **The bookmarked rules come after the hover ones**, or a
bookmarked row stops reading as bookmarked the moment the cursor lands anywhere
on it.

Bookmarking is a real edit, so it is state rather than a fixture flag — an
overlay keyed by session id, so the fixture stays the fixture and "what did I
change" is one object you can read.

### And the collapse came back below three clauses

> *"What happened with the collapse search, I can't see it anymore."*

He had two clauses. The caret appeared at three, on the arithmetic that
collapsing a one-clause filter saves less height than the summary line replacing
it costs. **That is true and it is beside the point.** An affordance that comes
and goes on a threshold nobody is counting does not read as an optimisation, it
reads as a control that has broken — and then the one time it is missing is the
time you go looking for it.

The caret is on the strip whenever there is a filter. ⚠ **The scroll rule keeps
its threshold**: collapsing itself is something the page does without being
asked, so it waits until the filter is actually in the way; offering the caret
is not, so it does not.

### One real bug, found by the fixture growing

`useAudits` called `onFinished` — which raises a toast, a setState on the App
provider — **from inside the `setAudits` updater**. React runs updaters during
the render phase, so that is "cannot update a component while rendering a
different component", and under StrictMode the updater runs twice so the toast
fired twice as well. It was invisible while the fixture had one audit at 38%
that never finished inside a session, and surfaced the moment there were two
running jobs. The updater is pure now, the announcement is queued out of the
render phase, and a Set makes it once per audit however many times React replays
the update.

## 24. Segments become a section, and a segment becomes what it always was (2026-09-02)

> *"What if segments were a whole new tab in sessions, instead of just a button
> on the top. If you do that we'll need to redesign and create a segment drawer,
> where we can edit the segment rules — remember, the segment is just one saved
> search so the design should be really consistent."*

### The thing the redesign found

A segment was a name and two booleans, and **its rules lived in a hardcoded
`inSegment()` switch** — four `case` arms saying, in TypeScript, what a segment
is supposed to hold as data:

```ts
case 'seg-204': return s.deviceType === 'mobile' && s.issueTypes.includes('click_rage');
```

So the one thing a segment IS was the one thing you could not read, edit or
show. That is why it could only ever be a dropdown of names: a dropdown was the
most a name-and-two-booleans could support.

Two things were wrong with the switch and only one was obvious. The obvious one:
the tab and the drawer had nothing to draw. **The other is worse** — it was a
second definition of the same segment, so the day somebody edited "Mobile rage
clicks" the list it produced would have gone on matching the old rule, with no
error anywhere.

`SavedSegment` carries `filters` and `eventsOrder` now — the same two fields the
live search holds — and `inSegment` runs them through the same evaluator.
"What does this segment contain" and "what does this search contain" can no
longer give different answers.

⚠ One rule changed when it became real. **"Paid users, checkout" tested
`plan === 'paid'` and nothing about checkout.** It is a sequence and a plan now.
That is deliberate: the rules ARE the segment, so a segment matching something
its name did not describe was the old model's bug, not a behaviour worth
preserving.

⚠ And **"Mobile rage clicks" matched nothing at all** once the rules were real —
no mobile session in the fixture carries `click_rage`, because on a phone the
thing is a *tap*. It is the `taprage` event now, which the catalogue already
offered. A segment that holds zero sessions at every window reads as a broken
segment rather than as an empty one, and the switch had hidden that for as long
as it existed.

### Why a tab and not a control

The same argument Bookmarked won on: **a section replaces the body, a filter
narrows it.** Segments is not a narrower list of sessions — it is a list of a
different thing — so it cannot be a filter. It was a dropdown at the top of the
page, which is where things go when nobody has decided what they are, and a
dropdown could show their names and nothing else: not what they mean, not how
many sessions they hold, not who made them, not when anybody last touched one.

Every row prints **its own rules**, in the same sentence the collapsed filter
prints, from the same function. "Paid users, checkout" is a name somebody chose;
`add_to_cart then checkout_start, plan is paid` is what it does. And **the count
is live**, measured against the same window the sessions list is in by the same
evaluator, so the figure on the shelf is the figure you get when you open it.

**Two verbs, and they are different.** The row opens the segment, because
reading is what you came for; **Use** loads its rules into the sessions filter
and takes you back to the list. One of these edits the saved thing and the other
runs it — a dropdown of names had made them the same click.

⚠ **Using a segment loads its RULES, not a row with its name on it.** Production
inserts a segment as one opaque event, which is how you *compose* with one, and
that path is unchanged — a segment is still an entry in the filter picker. This
is the other verb: you are opening a saved search, so what lands in the field is
the search, editable, and the rows are the ones the drawer just showed you.

### The drawer edits it with the sessions filter itself

Not a component that looks like the filter. `SearchCard` in a new `panel`
variant, fed by `useFilterDraft`, which binds **the same eleven transforms**
`useSessions` binds to the live search. The picker is the picker, a clause reads
as a clause, the value fields carry their proportion bars, and the sentence at
the bottom is written by the same function. **There is nothing in the drawer
that could drift from the page, because there is nothing in it that is a copy.**

That is what forced the one refactor underneath all of this: the eleven verbs —
add, add-many, update, replace, remove, move an event, add/update/remove an
event's property, toggle its order — were `setState` updaters inside
`useSessions`. They are `SearchFilter[] → SearchFilter[]` transforms in the
shared layer now, and React binds them twice. Copying them into the drawer would
have been eleven chances for "add an event" to mean something subtly different
in the two places you can do it.

Four smaller calls in the drawer:

- **It counts as you type.** The strip prints how many sessions the rules
  currently hold, live. That is the one question a segment exists to answer and
  the one thing a rules form usually makes you save and navigate to find out.
- ⚠ **The pool and the result are two different numbers**, and they were one
  prop for a day. Fed the filtered list, the value picker can only offer values
  that survived the clause you are editing — **pick France and France is the
  only country it can still see**, so a second country is unreachable. The pool
  is the window; the result is its own number.
- ⚠ **The draft is a draft.** Nothing reaches the saved segment until Save.
  Editing rules and watching the list behind the drawer move under you would be
  a preview nobody asked for, with no way back out of it.
- **It will not save a half-written clause.** A row whose operator wants a value
  and has none narrows nothing, and the row already says so — "needs a value".
  Let it through and the segment quietly means something other than what it
  prints, for as long as nobody reopens it.

**Somebody else's segment opens, reads and applies.** It does not save, and the
eyebrow names the owner rather than leaving a disabled button to be interpreted.

### Two defects in the shared drawer, found by using it for a second thing

**It said "Name this test" whatever it was naming.** `EntityDrawer` is the shell
every object opens into and it had a noun hardcoded in it, so the segment drawer
asked people to name a test. The caller brings its own word now.

**And a name had to be committed before the footer could see it.** Renaming an
existing thing is a commit — you can change your mind, so it takes Enter and
offers Cancel. Creating one is not: the footer owns the only commit there is,
and people typed a name and clicked a Create that stayed disabled with no way to
see why. While creating, the name is live and the rename's own Save/Cancel pair
is gone.

### One mutable, and why

Segments are editable now, and three things have to see an edit: the evaluator
(a search can filter *by* a segment), the catalogue (the picker offers segments
as entries), and `entryOf` (a row has to name its own subject). Every one is
reached from a call with no business taking a segments argument — threading it
would have changed five signatures so that a leaf could look up a name.

So `shared/sessions-logic.ts` holds one module-level list and a setter, and
`useSessions` keeps it current in an effect. It is also the shape production
has: **the evaluator reads a store.** `SESSIONS` is a fixture and
`SAVED_SEGMENTS` is a seed; what the user has now is the registry.

⚠ Miss that effect and a new segment counts zero sessions everywhere except in
the drawer that made it — which is exactly the bug it replaced, and exactly what
`sessions-check` now watches.

## 25. Seven subtractions, and a fixture bug they uncovered (2026-09-02, after the call)

The unambiguous half of Mehdi's evening batch (§22.4 in the backlog): the items
that are either a straight delete or a fact about production he stated on the
call. Nothing here needed a design decision, which is why it went first.

### The errors column, and why it was the cheapest-looking win

It was the line the sessions rebuild was proudest of: `errorsCount` is in the
list payload and **drawn nowhere**, so putting it on screen cost no endpoint and
no backend. That was true and it was the wrong conclusion.

Mehdi checked production live — *"I don't think we have errors… no, we don't"* —
and gave the reason it had never been drawn: **"it would be too much data to
read and people wouldn't get it. That's why we made it as tabs."**

Verified in the code afterwards, and he is right in a more precise way than he
put it: `errorsCount` **is** declared on `ISession` and on `SessionItem`'s
props, and it is rendered in neither. So the field is real and the decision not
to draw it is old and deliberate. **A field being unused is not evidence that
nobody considered it** — which is the general form of the mistake, and the
reason the inventory's "free / cheap / expensive" axis needs a fourth column for
*already rejected*.

### So the issue-type strip came back, and it is one decision with the column

Deleted the same morning on his instruction ("keep only the all sessions and
bookmarks"), restored the same evening: *"we're missing the tabs for errors,
this and that… it's an easy win, because it should be the same tabs as we have
in tests."*

⚠ **Not a reversal — the missing half of the sentence.** The column goes and the
strip is what answers the question it was answering. One choice against 134
figures.

**And it is its own state, which is the part the morning got wrong.** The
argument for deleting it was that `issueType` is already a catalogue property,
so a strip is a second path to one filter. Production says otherwise and the
distinction is real: `searchStore.activeTags` is **single-select and separate
from `filters`**, exactly as the Tests page's status strip is separate from its
six filter dimensions. One narrows to a *kind*; the other composes. Both exist,
and the build now matches.

Three details taken from production rather than re-decided:
- **The labels are theirs** — which is why `js_exception` reads **"Errors"**,
  not "JS exception". That is also the word Mehdi used for the tab.
- **The glyphs are theirs** (`tagIcons` in `SessionTags.tsx`). Which icon means
  "rage" is a decision this product already made, and choosing a different one
  would make the same word mean two things across two builds of one app.
- **`mouse_thrashing` is hidden**, as production hides it.

### ⚠ The fixture bug the strip exposed

The strip came back reading **Click Rage 3, Tap Rage 0**. The three were the
hand-written leads; the generator had produced none.

```
ISSUE_SETS has 9 entries, indexed with (i * 3) % 9
gcd(3, 9) = 3  →  only indices 0, 3, 6 are ever reached
```

**Six of the nine sets had been dead code since the fixture was written** —
every `click_rage` set and every `js_exception` set among them. The only reason
"Errors" showed anything at all was the `['js_exception']` fallback for sessions
with `errorsCount > 0`. The stride has to be **coprime with the length** to walk
the list; 4 is.

⚠ **It was invisible until today, and the reason generalises: a fixture defect
is only as visible as the least aggregated view of it.** The errors column drew
a number per session — 134 numbers, all plausible. The strip draws a number per
*kind* — seven numbers, and two of them wrong. Nothing had ever aggregated this
fixture by issue type before, so nothing had ever asked it a question it could
answer incorrectly.

`sessions-check` now asserts every tab has a non-zero count, which is the
cheapest possible guard against the class.

### Rage belongs to the device

Restoring the strip meant offering a **Tap Rage** tab, and production
platform-gates the two so a web project only ever sees one of them. This fixture
is one project holding desktop and mobile sessions together, so both tabs are
offered — and `rageType()` assigns by device, so **a phone's rage is a tap and a
desktop's is a click**. Otherwise one tab could never match anything, which
reads as a broken control rather than an empty one — the same defect the segment
fixture had this morning, for the same reason.

### Sorting, and a limit that is not ours

> *"You can sort by date and you can sort by number of events. So which means
> you cannot do anything else… we have to reload the entire list because it
> might be like millions of sessions."*

Verified: production's `sortValues` is exactly four — `startTs-desc`,
`startTs-asc`, `eventsCount-asc`, `eventsCount-desc`. So `SORT_CHOICES` is those
four, and **`duration` and `errors` lose their column sorters**.

**A sortable header the backend cannot honour is the worst kind of affordance:**
it works in the prototype, demos beautifully, and gets filed as a bug six weeks
later. The table's whole argument over the card was that columns sort — that
argument survives on the two columns where it is true.

### The bookmark comes off the row

A mark, then a control, then gone, all in one day and every step his. The last
one came with usage rather than taste: *"people don't use the bookmark there.
They need to view the session first before bookmarking it. So keep that for when
you're going to be reviewing the replay."*

Obvious in hindsight, and it is the shape of the mistake worth remembering: the
control was correct in isolation and wrong in sequence. **You cannot decide to
keep something you have not seen.**

`favorite` and the Bookmarked tab are untouched — the state is real, only the
control moved. The check now asserts both halves, because *a feature whose
control moves has to keep working or the move was a deletion wearing a plan*.
The play is alone at the edge now, a size down: with nothing beside it there is
no pair to hold an edge against, and his last word was *"keep the play button,
but make it much smaller"*.

### Metadata on, and one class doing two jobs

**Metadata is a default column** now (*"then it should be by default"*). It was
opt-in, which put the one column carrying the customer's **own** vocabulary —
plan, cohort, account — behind a menu while six columns of ours were on.

And the device cell's second line lost its size step: *"why is Safari bigger
than iPadOS and tablet there? I don't get it."* There was no reason. A size step
says *this is a different kind of thing*, and these are three facts about one
device; a step of colour already says which one you filter on.

⚠ **That fix could not be made where it looked like it lived.** `.m-ss__quiet`
was carrying two jobs — the device cell's prose **and** the metadata column's
`+2` overflow, which sits in a row of 2xs chips. Changing the one class would
have made the overflow larger than the chips it counts. Split into
`.m-ss__quiet` and `.m-ss__more`. **A shared class is only shared if both users
want the same thing when it changes.**

### The natural-language field is parked, not deleted

> *"'Describe the sessions you want' — we used to have it as a feature. We
> removed it. So we won't have something like this. It's a new feature. We can
> have it. Not saying we don't."*

**It is out because it is a feature OpenReplay shipped and removed**, and this
scope forbids adding features. He is warm on it for later and said why it is
cheap now: two years ago it needed a trained model, *"today you would ask an
LLM."*

So the switch, not the code. `onTranslate` is optional on `FilterPicker` and
gates the entire sentence path — the offer, the steps, the ignored words, the
accept. **The card stopped passing one prop.** `translate()` is untouched,
`FilterPicker.stories.tsx` still exercises it behind a `sentences` arg, and the
feature is one prop from returning. Deleting it would have thrown away the half
that is hard to rebuild.

The field says `Filter these sessions` and nothing else. **A control that
promises a sentence and cannot read one is worse than a plain button**, which is
why that line is now four words long.

⚠ **The ring's justification went with it, and the ring stayed.** It was there
because *this field is where the search agent will live*. That is no longer
true, so it now decorates the control that opens a filter rather than one that
answers questions. It stays because Mehdi engaged with it over three rounds and
twice asked for it to be **better**, not for it to go — removing something
somebody refined without being asked is its own kind of error. But it is
written down as a candidate for the layout pass, where every piece of expression
has to earn its place again.

### Two things the suite taught

⚠ **A setup step that assumes a default breaks silently when the default is what
changed.** The metadata check clicked the Display pill to turn the column *on*;
once it was on by default the click turned it **off**, and the suite then waited
thirty seconds for a chip that could not exist. It asserts the default and uses
it now.

⚠ **And a click on a control that is not there is a timeout, not a failure.**
Three separate steps broke that way today, each reporting a locator instead of a
claim. Where a step depends on the previous block's leftovers, it now clears
state explicitly rather than reaching for a Clear button that only exists
sometimes.

## 26. The menu gets its shape (2026-09-03)

Gabriel's structure, which is the first version of Mehdi's 09-02 ask —
*"the name of the product… limit the number of stuff you have visible, and then
have sub menus"* — drawn out in full. The whole tree is data now, in
`nav/tree.ts`.

```
                          Search              ⌐ no label: the top of a menu
                          Sessions            | does not need to be told
                          Highlights          ⌐ it is the top
        ── Agents ──
                          Issues          11
                          Synthetics       7
                          Audits           1
        ── Product ──
                          Analytics
                            Data Management
                            Dashboards
                          Activity
```

### One rule decides what is in it

> *"The tabs don't show in the sidemenu, only subitems. Tabs only appear in the
> container."*

**A tab belongs to the page it is on, and the page already draws it.**
Synthetics' Tests / Runs / Environments strip lives in `TestsPage`; the
sessions strip lives in `SessionsPage`. Carrying the same three rows in the nav
as well meant one set of sections existed in two places that had to be kept in
agreement — and it is exactly why Mehdi asked for two levels rather than three:
*"synthetics will not have anything below it… we can rely on these tabs like
tests, runs, whatever."*

So `AgentEntry.sections` is gone from the roster. **Nothing was lost but the
duplicate**: the keys those rows navigated to are unchanged and the page's own
strip still writes them, which is what made the deletion safe rather than
merely tidy.

⚠ **The consequence worth noticing: exactly one row in the whole column
expands.** Analytics, holding two subitems. The disclosure caret, the nested
rail, the flyout card at 52px — all of that machinery now serves a single row.
It stays because subitems are a real level that will grow (Data Management and
Dashboards are two of a set, not a pair), but it is worth knowing that the
column is now essentially flat.

### And the groups are named again

The "AGENTS" label became a bare rule on 09-02, and the argument was good: one
group does not need to be told what it is, and the word was the only uppercase
type in the column.

**That argument dies at two groups.** A rule between Audits and Analytics says
*something changed*; it cannot say *changed to what*, so the reader is left
inferring the category from the rows — which is the one-word job a label does.

So both come back, doing different work: **the rule is the break, the label says
what broke.** And the label is not the old one — 11px, the row's own case,
`content-muted`. What made "AGENTS" read as shouting was the uppercase, not the
existence of a word. The first group keeps no label.

### The collapse moved to the corner

> *"Remove the collapse sidebar from the footer and bring it to the top right."*

It was the fifth glyph in the foot, on the argument that it belongs with the
other preferences about the chrome. **What that missed: every other control down
there opens something, and this one reshapes the thing they all sit in.** It
read as a sibling of Support when it is a property of the column itself.

⚠ **Narrow, the brand row becomes the control.** 52px does not hold a mark and a
button side by side, and a collapsed menu whose only way out is a keyboard
shortcut is a trap. So the mark stays where it is, the row carries the tooltip
and the click, and the expand glyph crossfades in over the mark on hover — both
layers in the same 28px box, so nothing moves as they swap. That keeps the
control in the same corner in both states, which was the one good property of
having it in the foot.

### Two smaller calls

**The first group scrolls now.** It used to be pinned above the single divider,
which worked while there was one group below it; with three, a pinned first
group would leave a rule at the top of a scroller with nothing above it to
separate.

⚠ **Search is kept and it is not in the list.** It became a row on 09-02 on
Mehdi's own ask, and a list about the item hierarchy omitting it is not the same
as a decision to remove it — deleting a three-day-old choice on an omission
would be reading too much into it. Flagged rather than assumed; one line either
way.

**Highlights gets the marker glyph, not a star.** A star means favourite, and
Bookmarked is already a tab on Sessions — two rows meaning "saved" in one column
is the confusion worth avoiding. ⚠ Mehdi also said on 09-02 that Highlights is
*"probably"* being removed, so this row may not survive its own kill list.

## 27. The OpenReplay mark, and the picker starts saying which kind (2026-09-03)

### The logo is the product's own file

Copied out of `openreplay-repo/frontend/app/svg/logo-small.svg` into
`shared/openreplay-mark.ts` — two paths, one viewBox, both brand colours as the
file carries them: the outline in `#394EFF` and the inner play in `#27A2A8`.

⚠ **Not redrawn.** A logo is the one asset in a design system where "close
enough" is worth nothing, because it is the thing every reader already knows
the shape of.

**Reading the shape is what gave the animation away.** The mark is *a play
button inside a play button* — the outer triangle has the inner one cut out of
it (one path, two subpaths, `fill-rule: nonzero`) and a small solid play sits in
the hole. Nothing had to be added to make it move; the two halves were always
separable, which is how Mehdi's *"keep it as a play button"* and *"slightly
lift it up"* are satisfied at once.

So on hover **the inner play advances**: it slides 2.5 viewBox units along the
direction it points and grows 9%, as though the thing had been pressed and
started. Three rules keep it from being a toy:

1. **One move, and it ends.** No loop, no pulse, no spin. It travels on enter
   and returns on leave. A logo that animates forever is a logo you learn to
   ignore — and this one now sits beside a control people are actually aiming
   at (the collapse).
2. **It moves along its own axis.** A play glyph has a direction, so forward is
   the only motion that does not fight the shape. Scaling from the centre would
   make it a bubble; rotating it would make it a spinner.
3. ⚠ **The pivot is the inner play's own centre**, `21px 29.5px` in viewBox
   units, not the box's. The glyph sits left of centre, so scaling about the box
   would drag it sideways and the growth would read as a drift.

**The outline holds still**, always — a logo whose silhouette changes on hover
reads as a different logo. It deepens a shade instead, so the pair responds as
one object rather than a part coming loose.

⚠ **The colours are tokens with the brand's values as fallbacks**
(`--m-brand-blue`, `--m-brand-teal`). The day the palette moves to OpenReplay's
blue — *"maybe change it to a slightly different blue"* — the logo follows from
the same place every other accent does, instead of holding a hex the rest of the
build has moved past.

And the wordmark says **OpenReplay**. The strategy question closed on the
facelift, so the Melonade name went with it.

### The picker says which kind, and only when that is a question

> *"Separating the filters from the events… if it's a filter maybe it shows up
> slightly different."*

**Verified against production first**, in `types/filter/newFilter.js` and
`filterType.ts`, and the shape is more tangled than either screenshot suggests:

- **23 events and 35 filters**, over seven categories: Autocapture, DevTools,
  User, Metadata, Session, Issue, Events.
- ⚠ **The categories are shared, not split.** DevTools holds events (Error,
  GraphQL, the performance metrics) *and* filters (Fetch URL, Console). Session
  is filters only. So "which category" cannot tell you "which kind" — which is
  exactly what Gabriel said on the call: *"both of them are auto captures in my
  opinion."*
- **Production's own pickers already print the namespace on every row**
  (`Autocapture ›  Label`) and show a data-type glyph — `Aa`, `#` — **in the
  Filters list only.** That is the real discriminator hiding in their UI: **an
  event has no data type; a filter does.**

Our picker already carried those glyphs. What it had stopped doing was saying
there are two kinds at all — the merge into one button took the distinction out
along with the two headings.

**So: one search across both, and a heading that appears only when the result
spans them.** Type `country` and it is a filter — one group, no heading, nothing
to disambiguate. Type `error` and it is both, and the two headings earn their
rows. That keeps the win (you no longer have to know the kind before you can
start looking) and returns the fact (they behave differently once they land).

⚠ **And the headings are not "Events" and "Filters".** Those two nouns are
precisely what Mehdi says people do not know on arrival — *"people don't know
right away what an event is, what a filter is."* So the headings say what each
kind does to your search:

| | |
| --- | --- |
| **Things that happened** | In order, and they can repeat |
| **Conditions on the session** | Applied to the whole search |

Those two lines are the entire distinction, and printing them once beats a
glossary. The heading is a caption rather than a section title — smaller than
the rows it introduces, outside their left inset — so the eye reads down the
names and picks the heading up peripherally.

⚠ **What is still owed here**: production's **block-level** filter (a condition
on every event above it) versus an **event-level** one is a third thing this
does not yet distinguish, and it is where Mehdi's *"group filters"* rename
belongs. Options are in the session notes; nothing is built for it yet.

### And the segment drawer says the same thing in its own words

The field's copy carries into the drawer, one word different: **"Filter the
sessions this segment holds"** rather than "Filter these sessions". Same control
doing the same job — but *these sessions* points at a list, and a drawer has no
list to point at: you are saying which sessions the segment will hold.

---

## §28 — The mark shape-shifts (2026-09-03)

Gabriel, having seen the first hover (the inner play sliding forward a couple of
units): *"as the OpenReplay logo are two triangles with rounded corners, can we
do an animation where the teal rectangle inside increases and becomes the outer
triangle, and when mouse leaves the darker triangle goes back to its place, like
a shape shifting thing."*

**The shape already contained the animation.** The mark is a play button whose
outline is a play button: one path with two subpaths under `fill-rule: nonzero`,
so the inner triangle is *cut out* of the outer one, and a small teal play sits
in the cut. Nothing had to be added. At rest the **blue** is the triangle with a
play taken out of it. On hover the teal grows until it *is* the triangle, and the
cut-out passes to the teal — a play opens in the middle, in the place the teal
just vacated. The two halves have traded which one is the negative space.

Four decisions did the work.

**The silhouette never moves.** The outer frame is the constant; only the
interior changes. A logo whose outline changes on hover reads as a different
logo, and this one sits beside a control people are aiming at (the collapse).
The frame does not dim either — it did in the first version, and an outline
lightening while the interior floods teal reads as three things happening rather
than one.

**A clip does the fitting, not a matched scale.** Filling the hole exactly needs
2.216 across and 2.321 down; a uniform scale therefore leaves daylight on one
axis, and a *rounded* triangle can never reach a *sharp* one's corners at all. So
the teal overshoots — 2.5, checked against each of the hole's three vertices —
and a `clipPath` built from the outline's own hole subpath cuts it back. The end
state is the frame's interior exactly, sharp corners included, rather than an
approximation of it.

**The opening is a hole, not a blue play.** The obvious version paints the middle
with the frame's blue, so the logo reads as its two colours swapped. It was built
that way first, then measured:

| the middle, hovered | contrast on the teal | L\* apart |
| --- | --- | --- |
| a blue play | 1.84:1 | 17.3 |
| a hole, light theme | 2.76:1 | 34.8 |
| a hole, dark theme | 6.63:1 | 59.6 |

The glyph is 14px wide, so the whole payoff is about 5px of detail. At 1.84:1
that is a smudge — the blue and the teal are nearly the same weight, which is
exactly why they work *side by side* in the logo and exactly why one cannot sit
*inside* the other. A hole is not WCAG-clean either (a logotype is exempt from
1.4.11, so the threshold is not the argument) but it separates on lightness
rather than hue, by twice as much in light and three and a half times in dark. It
needs no colour that is not already in the mark, and cutting a play out of a
triangle is what this mark does.

It is a luminance `<mask>`, so it is a real hole: the nav's background, the theme
and any fill under it are somebody else's business.

**They cross in opposite directions.** The teal expands outward while the opening
contracts into place, and on the way out the opening closes while the teal
shrinks back. The declarations on the base selector are the *leave* timing and
the ones under `:hover` are the *enter* — the trade is not symmetric and should
not be. On the way in the teal leads and the opening follows it into the gap; on
the way out the opening clears first, so the teal is not shrinking around a hole
that is still there.

### Four things that made this harder than it looks

- ⚠ **`transform` moves an element's `mask` and `clip-path` with it.** Hanging
  the mask on the scaling path scaled the punch too, so at 2.5× the hole covered
  the whole fill and hovering blanked the logo's interior. Both the clip and the
  mask now live on untransformed wrappers.
- ⚠ **A mask's default region is 120% of the *unscaled* bounding box.** Left at
  the default it crops the grown teal back to roughly its resting size, and the
  animation appears to do nothing. `maskUnits="userSpaceOnUse"` with the whole
  viewBox.
- ⚠ **Paint the frame first, the fill on top.** They are disjoint, so the pixels
  are identical either way *except* at the boundary, where the teal's
  antialiased edge composites over solid blue instead of over the background. The
  other order leaves a pale seam tracing the inside of the frame.
- ⚠ **The bounding boxes are measured, not read off the path.** The rounded tip
  bulges about half a unit past its last on-curve point: the inner play is 17.02
  wide, not the 16.42 the coordinates suggest. Off by that, the pivot is half a
  unit wrong and the growth reads as a drift. Both are symmetric about y 29.5, so
  the whole swap is one horizontal shift (3.85) and one scale, with no vertical
  correction.

**It does not run in the collapsed menu.** At 52px the brand row *is* the
collapse button, and its hover already crossfades the mark for an expand glyph.
Two animations arguing over one gesture leaves neither readable, so the shift is
switched off there and the glyph that says *expand* is the only thing that
answers the cursor.

`tools/mark-check.mjs` asserts all of it in both themes by reading real pixels
out of a screenshot — the frame's colour, the interior flooding, the sharp corner
filling, and the hole matching the surface behind the logo exactly. ⚠ Serialising
the `<svg>` and rendering *that* gives a white box: the classes are in an
external stylesheet that does not travel with the markup, so nothing is filled
and every colour assertion passes on nothing.

---

## §29 — One identity, one robot (2026-09-03)

Mehdi wanted the per-user avatar back and smaller, but *"not a face at 16px"*,
possibly from a different library. Gabriel picked DiceBear's **pixelbot**, with
one requirement: *"I want the avatar to be exactly the same when the user is the
same, of course, when I filter by user."*

**Why a robot and not a face.** A generated face at 16px is a smear that reads as
a photograph of nobody, and it makes a claim the data cannot support — these are
user IDs and email addresses, not people who chose a picture. A pixel robot is
legibly synthetic: it says *this is a token standing for an identity*, which is
what it is. Pixel art is also the one illustration style that gets more readable
as it gets smaller, because it was drawn on a grid.

**The seed is the identity, and that is the entire requirement.** DiceBear is a
pure function of its seed, so "the same user gets the same avatar" needs no
cache, no store and no id map — it needs the seed to be the identity and nothing
else. Not the row, not the index, not the session id. `seedFor` takes the user id
when there is one and the anonymous id when there is not, so an identified person
is one robot across every session they appear in and an anonymous visit is its
own.

⚠ **Deliberately not `numericHash`**, even though the fixture carries one and
production has a `userNumericHash` beside it. A hash is a lossy copy of the thing
it hashes: two identities can collide into one robot, and the field can drift
from the id it was meant to summarise — which is exactly what had happened.

### The defect this found

**One person owned eleven user ids.** In the fixture generator the display name
came from `(i * 7 + 2) % 8` and the id from `1000 + (i * 613 + 77) % 8999` — one
per person, one per session. So `ada.stone@northwind.com` appeared on eleven rows
carrying eleven different ids. Nothing rendered the id, which is the only reason
it survived: **the avatar is the first thing that reads it**, and it would have
given one person eleven faces. The identity is now one choice — person, then id,
hash and name from that.

The same class of drift was in the filter's value list: the five user ids offered
in the picker were all typed out from the ten hand-written lead sessions, so
filtering by a user returned exactly one row and there was no way to *see* that a
person's avatar holds. They are derived from `SESSIONS` now, with the real counts
as weights — which is also the only way the picker's proportion bars mean
anything.

### Why the HTTP API, and what it costs

`@dicebear/collection` stops at 9.4.3 and **pixelbot is a 10.x style**, so there
is no local generator for it. Measured before choosing:

| | over the wire |
| --- | --- |
| `svg` | **995 bytes** (20.9 kB raw, gzipped) |
| `png?size=40` | 2,856 bytes |
| `webp?size=48` | 4,140 bytes |

So the SVG — which is also the only resolution-independent one; a raster sized
for a 20px avatar is wrong the moment the avatar changes size. Responses carry
`cache-control: public, max-age=31919000` and `access-control-allow-origin: *`.
The fixture holds about fifty distinct identities, so a full browse of every page
is roughly 50 kB, once.

⚠ **It is the only thing in the prototype that fetches from a third party at
render time**, and it is built to survive the fetch not landing: the tint is the
element's own background, drawn first, and the robot is an `<img>` on top. A
failed request leaves a small coloured chip where an avatar goes — a degraded
avatar rather than a broken image — and because the tint is seeded too, it is
still the same chip for the same person.

⚠ **Not `loading="lazy"`.** It was, on the reasoning that a paged list need not
fetch below the fold. It fetched two of the twelve rows *on screen* and left ten
grounds empty: Chrome defers on its own reading of the scrollport, and a table
body inside a scroller is exactly the case it reads badly. At 995 bytes each
there is nothing to defer. A `preconnect` in `index.html` covers the rest — twelve
avatars on a cold cache took 2–4s to appear and most of that was one TLS
handshake nothing had asked for yet.

### The ground, which is also the start of Mehdi's one-hue-per-row

pixelbot arrives transparent, so something has to sit behind it or the robot's
outline is all there is on a white row. That something may as well carry
information, and Mehdi's own resolution to his twenty-colours objection was *one
hue per row, used twice* — avatar on the left, play on the right, so the two ends
of a wide row are visibly the same row. `hueIndexFor` is that hue; wiring it to
the play is still open.

**Twelve hues, and the number is the point of the objection.** A hundred and
thirty-four distinct colours is a colour per row, which is noise. Twelve means
hues repeat down the list, and repeating is fine: the hue is a tint that makes a
row cohere, not an identifier. The robot is the identifier. Chroma is 0.04 —
almost nothing — because this sits behind a small illustration, under a name, in
a table with a real accent elsewhere on the row.

Written as `oklch(var(--m-avatar-l) 0.04 calc(var(--m-avatar-i) * 30deg))`: one
declaration for twelve grounds instead of twelve rules, with lightness the only
thing the themes disagree about.

⚠ **The hash needs an avalanche before the modulo.** `% 12` reads the low bits,
and FNV-1a's low bits barely move for short similar strings — which is every seed
here. `u-1187` and `a-8801` landed on the same hue, adjacent in the list, and
twelve rows produced six distinct grounds instead of nine or ten. Three
xor-shift-multiply rounds (`lowbias32`) cost nothing and are what makes the
modulo mean anything.

### What the check asserts

`tools/sessions-check.mjs` walks **every page**, not one filtered view — a filter
can only prove the property for the rows it happened to return. Every row carries
a pixelbot; one person is one seed across every session they appear in; two
people never share a robot; the avatar is 20px inside the 38px row every list in
this app uses, so it cannot be the thing setting the rhythm; and the twelve
grounds actually spread. ⚠ It also asserts that **the list holds people with more
than one session** — "one person, one seed" is satisfied trivially by a fixture
where every row is a different person, so without that the main assertion is
worthless.

---

## §30 — Six rows and twenty-one destinations (2026-09-04)

The third menu structure in three days, and the first that describes the whole
product rather than the part that is built.

| | 09-03 | 09-04 |
| --- | --- | --- |
| top-level rows | 9 | **6** |
| groups / rules | 3 groups, 2 rules | none |
| rows that open | 1 (Analytics) | **4 of 6** |
| destinations reachable | 12 | **21** |

**This is the version that answers Mehdi's 09-02 ask** — *"the name of the
product… limit the number of stuff you have visible, and then have sub menus"* —
because a group label is not a limit. A label sorts nine visible rows into three
piles; a parent row *replaces* its children until you ask for them.

It also resolves the label argument by dissolving it. "Agents" spent 09-02 as an
uppercase group label, 09-03 as a bare rule, then went back to a label — and it
is a **page** now, with Issues, Synthetics and Audits inside it. The heading that
could not decide what it was turned out to be a destination.

### Tabs and subitems are not interchangeable, and the spec is precise about it

Gabriel's spec marks every row as one or the other. Synthetics' Tests / Runs /
Environments are **(Tab)** and stay in `TestsPage`; Sessions / Bookmarks /
Segments are **(Subitem)** and therefore had to *leave* the sessions page's tab
strip. So `SessionsPage` draws no strip at all now and the route says which of
the three you are on.

That is the same rule as 09-03 — a thing drawn in the menu **and** in the page is
two controls showing one fact — applied in the other direction. `model.tab` stays
the single source: the shell writes it from the route and reads it back for the
highlight, so applying a segment (which moves you to the session list) moves the
menu with it.

**Which is also why the title moves now and did not before.** A tab strip under
one title says *these are three views of Sessions*; three menu rows say *these
are three destinations*, and a destination whose header does not name it is a
page you cannot tell you have arrived at.

### What is gone, and one judgement call

- **Highlights**, marked "(remove)" in the spec. It was a kill candidate in the
  09-02 numbers (under 2% of customers).
- **Alerts is back**, under Product Analytics. Also a 09-02 kill candidate; the
  spec lists it, so it lives.
- **Activity moved into Data Management**, which is the 09-02 call finally drawn.
- ⚠ **Search is gone, and that one is a judgement.** It became a row on 09-02 on
  Mehdi's own ask and is absent from both the 09-03 and 09-04 specs. On 09-03
  that was read as an omission because the spec was about hierarchy; this one
  enumerates twenty-one destinations across six areas and *invents four that did
  not exist*, so it is describing the whole menu. A search field also already
  sits at the top of the sessions list, which is what that row opened. **One
  commented line in `tree.ts` puts it back.**

### Three things the restructure broke, none of them visible

- ⚠ **Every count in the product vanished.** Counts live on Issues, Synthetics
  and Audits; the moment those became subitems, and `SideNav` was passing no
  `count` to a nested `NavItem`, the count column emptied — *the menu's own
  argument* ("it keeps the COUNT column, which is the menu's whole argument")
  gone, silently. Subitems carry counts now, **and a parent's count is the sum of
  what is inside it**, so a closed row still says how much is waiting. The glyph
  stays off a subitem; a number is not a texture.
- ⚠ **Nothing was marked current in the collapsed rail.** A parent was lit by
  `inside && !open`, which means "lit when its children are hidden" — and
  collapsed, children are never rendered whatever `open` says. Once every
  destination became a subitem, the narrow menu had no current row at all. It is
  `inside && (!open || collapsed)`.
- ⚠ **`Placeholder`'s label map went stale in twelve places.** It was six
  hand-typed entries; twelve new destinations would have printed their raw route
  (`data/properties`) as a page title. It reads the tree now.

**The glyphs are doing more work than eleven were.** Six marks are the only thing
in the rail when it is narrow, and the only thing distinguishing six closed
parents when it is wide: `PlayCircle` for Recordings, `Bot` for Agents,
`ScreenShare` for CoBrowse (two people on one screen), `Video` for Spot (the
recorder — Recordings already owns the triangle), `ChartColumn`, `Database`.

**The cost of "no glyph on a subitem", stated plainly:** Issues, Synthetics and
Audits were top-level rows with recognisable marks and are now subitems without
them. The rule is kept because the alternative is glyphs on some nestings and not
others — Recordings' three have no natural marks at all — and a menu whose indent
sometimes carries an icon column and sometimes does not is harder to read than
one that never does.

---

## §31 — The name on a row is a control (2026-09-04)

*"Make the session email/user clickable with a mute hover with dotted underline,
and when clicked the table will be filtered by that user."*

**It looks like text at rest, on purpose.** Twenty rows of underlined links is a
page of links, and the name is still first of all the row's *subject*: what this
session is. The affordance arrives on hover, as a **dotted** underline — dotted
rather than solid because a solid underline is a navigation, and this does not
take you anywhere. It refines what you are already looking at.

**The hover steps back rather than lighting up.** The row already has one accent
(the play, on the right), and a name that brightened would be a second thing
competing for the click on a row where hovering is how you read. Stepping back is
the quietest way for a control to say it is one. The keyboard gets the same
answer plus the focus ring — a dotted underline alone is not a focus indicator.

**It replaces rather than appends.** `userId` and `userAnonymousId` are both
single-valued per session, so a second identity clause is two conditions that
cannot both be true and the list goes empty. Clicking a second name has to mean
*show me this person instead*; there is no reading of it that means *and*.
Everything else in the search survives — clicking a name inside a search for rage
clicks on iOS asks "which of these are hers", not "start again".

The clause is built through the **catalogue**, not by hand: a literal `'is'` in
the click handler would be a second definition of what a `userId` filter is, and
it would keep saying `is` after `defaultOperator` stopped agreeing.

### What it exposed: the fixture printed one string and filtered on another

The first build produced the clause **"User ID is u-7734"** under a row reading
`mia.okonkwo@brightline.co`. Production derives the display name —
`userDisplayName: session.userId || session.userAnonymousId` in `session.ts`, so
**the row prints the id itself**. This fixture stored a `displayName` beside a
`userId` that was a different string entirely. Nothing had ever shown both at
once.

`displayName` is gone as a stored field. `displayNameOf(s)` derives it exactly as
production does, and the identified rows' ids **are** the emails. A field that
restates two other fields is a field that can disagree with them — the same
defect shape as the eleven-ids-per-person bug the avatar found the day before,
in the same file.

---

## §32 — The row opens the replay (2026-09-04)

*"Clicking on the sessions row (except the session name, and the metadata pills)
will open a session replay, same session replay we have in issues."*

**Same player, not a second one.** `ReplayPlayer`, `ReplayTimeline` and
`ReplayFrame` are already built and already what the issue queue opens; a
sessions player beside them would be two components drifting apart over one
design, and the replay is explicitly a placeholder this week (BACKLOG §22.5.5:
"drop in the existing issue-replay page"). All the new work is an adapter in
`shared/session-replay.ts` plus a header.

**The whole row wears the click cursor.** Gabriel, immediately after: *"the row
cursor should be the click cursor."* The play glyph on the right had been
carrying the entire affordance — at the far edge of a wide table, which is
exactly the corner a reader is not looking at while they read a name on the left.
The two exceptions inside the row keep `pointer` too, because they are also
clicks; what would be wrong is a row that looked inert.

**One guard covers both exceptions.** The name and the metadata pills are both
`<button>`s, so `el.closest('button')` handles them — and handles whatever gets
added next. Writing the exceptions out by class would have been a list to
maintain, and the first control somebody added without updating it would silently
open the replay instead of doing its own job.

**It replaces the plane rather than floating over it.** A drawer would have been
less work and it would have been wrong: production opens `/session/:id` as a
page, and a replay is where you *go* — it takes a viewport and holds attention
for minutes. A drawer over a table promises you are still in the table. The way
back is a **back arrow naming the list**, not a close X: an X dismisses something
that interrupted you, an arrow returns you to where you were with the search and
the page you had still in place, which is what actually happens.

### The player reads a journey, and a session row has none

The whole replay — markers, caption, panel — derives from **one string**,
`session.journey`, a plain-words account of what the person did in order. The
issues fixture has those because somebody wrote them. A `SessionRow` has no prose
at all; what it has is `sessionEvents()`, a deterministic ordered list of event
ids.

So the journey is written *from* the events, one clause each. That keeps three
things true at once:

1. the markers are the session's own events, in its own order — scrub the track
   and you are reading the event list
2. the same session always produces the same journey, because `sessionEvents` is
   pure
3. an event that is **real** on the row (an error, a crash, rage) is real in the
   replay, because `sessionEvents` already forces those in

⚠ **The phrases are written to be classified.** `kindOf` matches keywords to
decide whether a marker is an error, a rage, a slow moment, an input or a
navigation — so "clicked the same thing again and again" has to contain a rage
word or a rage click draws as an ordinary click. Changing a phrase means checking
it against `KIND_RULES` again.

`variation` and `tags` come back empty, and that is not laziness: a variation is
an agent's reading of how *this* session experienced a *known issue*, and a
session in the list is attached to no issue. An empty string is the honest value.

**Watching a session marks it read.** The list has always drawn a read row more
quietly; it was drawing the fixture's opinion of what you had seen, which stops
being true the first time you open anything. And **leaving the section closes the
replay** — the three sections are menu rows now, so a Bookmarks row that opened
onto whatever was playing would be the menu lying about where it took you.

---

## §33 — The device is one glyph (2026-09-04)

*"The device should be an icon of tablet / desktop / mobile, and the OS and the
browser should appear only in the tooltip, like Mehdi wanted."*

It was `Chrome / macOS · desktop` in a 158px cell, set in two sizes. **Three
facts in one cell is a paragraph in a table, and nobody scans a paragraph** —
which is the only thing a list column is for.

What a reader wants from this column at a glance is *phone or computer*, because
it changes what the session means: a rage click and a rage tap are different
events, the viewport is different, the journey is different. A browser version is
a detail you look up about **one row**, never a thing you compare down a column —
so it goes where details go.

⚠ **The glyph is the DEVICE, not the browser, and that is what makes it
buildable at all.** This item had been sitting in the backlog with a snag on it:
*lucide has no browser brand marks*, and drawing Chrome from memory is the one
thing the design rules here forbid outright. Three device types are three shapes
that already exist — `Monitor`, `Smartphone`, `Tablet`. The snag was in the
framing, not the library.

**The column went 158px → 44px** and the 114px went to the session name, which is
the only column with no width of its own and the one that actually runs out of
room. Centred, because a glyph in a left-aligned column has a ragged edge on both
sides — there is no second thing to hold a line with.

**It is drawn one step quieter than the ink around it.** A 15px 1.75-stroke glyph
reads darker than 13px text at the same colour, because the strokes are thicker
than a letter's; at `content-secondary` it would have been the loudest thing in a
row of names and figures, for the least reason. It brightens with the row rather
than on its own.

⚠ **The label is on the element, not left to the tooltip.** A tooltip is a hover,
and a hover reaches neither a screen reader nor a keyboard — without an
`aria-label` the cell is an unlabelled picture of a phone.

### Two things the narrow column broke, both in the header row

⚠ **44px is a glyph's width, not a title's, and the column is sized to the
title.** "Device" is 38px of 12px medium plus 16px of cell padding, so at 44 it
wrapped — and a `th` that does not fit its own word does not overflow or
ellipsize, **it wraps and takes every other column's header with it**. The header
band went 31px → 49px. It is the least local failure a table has: one tight
column reshapes the whole row, and nothing about it points at the column that
caused it. 60px, and `thead th` is `nowrap` now so the next tight column
overflows its own cell instead of reshaping the table.

⚠ **The sticky play column made a hole in the title row.** The sticky rule sets
its cell `background: transparent` over a `::before` gradient fading to
`--m-ss-play-ground` — a property only the **body** rows set. The `th` carries
the same class, so the last 52px of the title row was transparent with a
transparent fade over it: a differently-coloured band at the right end of a row
that is meant to be one colour. The header's copy is flat and solid now. Flat
deliberately: the gradient exists to cover a long **value** sliding under the
glyph as the table scrolls sideways, and a header cell holds a title or nothing —
a fade there would only reintroduce the translucent sliver it is fixing.

---

## §34 — The 09-04 batch: the mark, the hue, the window (2026-09-04)

**The play is the OpenReplay mark.** It was `CirclePlay` — the glyph every media
player on the internet uses. The product's own mark *is* a play button, so the
one affordance on the row now says whose recording this is, which is the second
half of Mehdi's recognition argument: the avatar on the left, this on the right,
*"right away I understand I'm on the sessions page."*

It is **stroked, two triangles** — `OR_OUTER` and `OR_INNER`, `fill: none`.
Stroking `OR_OUTLINE` would draw its hole as a third outline: a triangle inside a
triangle inside a triangle. 3.8 is lucide's own weight carried across (1.75 on a
24-unit box → ×52/24).

**Its states, after three passes.** White at rest, muted once watched, **the
row's hue when you hover the glyph itself**. It was tinted at rest first, which
made the column a rainbow saying nothing the first column doesn't. Then the hue
moved to the *row's* hover, which fired every time a cursor crossed a line on the
way somewhere else. On the glyph it means what a hover means. And it is **only on
the row you are pointing at** — twelve of them down a column is a texture you
stop seeing, and the row is clickable anyway, so the glyph is the reminder that
there is a way in rather than the only one.

**One hue per row, and the row carries it.** `--m-avatar-i` is set on the `<tr>`,
so the avatar's ground and the mark's ink read one property. That is what makes
it one hue rather than two elements that agree. Lightness differs because the
jobs do: 0.93 behind an illustration, 0.52 as a stroked glyph on the same
surface.

**It follows the density control**, which the `size` prop cannot — an attribute is
written once at render. CSS on the svg overrides it: 14px compact, 17px spaced.

### The tab strip is back, beside the menu rows

Both, and there is no contradiction — because there is still only **one piece of
state**. `model.tab` is written by the strip, and the menu's highlight is
*derived* from it rather than kept as a second route. The standing objection was
never to two controls; it was to two copies. The pair earns its keep: the menu is
where you go from anywhere, the strip is where you move between siblings without
leaving the page you are reading.

### Two dates, not a range picker

antd's `RangePicker` was four complaints in one screenshot: the pair and its
arrow do not fit a menu this narrow, so both ends truncate to `Start da…` and
`Oct 13, 2(`; the start field read **empty** after a date had been chosen; the
selection reset on its own; and moving the panel to months or years broke it.

All four are the same thing — one control holding a pair, with its own idea of
which end you are editing, its own hover preview and its own panel state. **A
window is two dates, and two dates are two fields**: each holds one value, each
is full width so it fits, and neither can reset the other. The one thing the pair
keeps is the order — picking a start opens the end, so the common case is still
two clicks and no aiming. The hint under it is gone: *"Both ends, and the list
narrows"* was explaining a control that now explains itself.

### One alignment rule and one width rhythm

Gabriel: *"Started and Events are different and Duration is really close to
Location."* Both halves were the same bug. **Every column is left-aligned** except
the two glyph columns. Right-aligned figures are correct in a table you compare
magnitudes down — this is not one, you scan it for a session — and the cost was
exactly what he saw: a right-aligned Duration ends where a left-aligned Location
begins, so two values touch while their columns are 96 and 160 apart. Right
alignment puts the whitespace on the wrong side of the number.

**Every width is a multiple of 8**: 88, 96, 112, 160, 200, and 56 for the two
glyph columns. Started and Events were 104 and 82 — no rhythm, and 2px is the
sort of thing you feel without being able to name.

⚠ **"Centred" is not centred if the paddings differ.** The table gives its last
column a 20px right inset and every cell an 8px left one, and `text-align:
center` centres inside the *content* box — so the play sat 6px off. Both paddings
are zeroed on that cell, and the 56px column centres the 24px target itself.

### The menu counts sessions you have not watched

The same rollup the agents get: a parent carries the sum of what is inside it, so
a closed Recordings row still says whether there is anything in there. It counts
**unwatched** sessions, which is what "new" means for a list you come back to, and
it is counted against the model — so watching one takes it off the badge.
Bookmarks and Segments count nothing: a bookmark is something you chose, not
something waiting.

### The switch was invisible when it was on

⚠ `Switch.colorPrimary` was `action-primary-bg`, which is near-**black** in light
and near-**white** in dark, because a primary button inverts with the theme. The
handle is white and does not. So a switch that was on in dark mode was a white
circle on a white track: **1.06:1**, and Gabriel's screenshot of it is a blank
pill.

The handle cannot be fixed instead — flipping it dark solves the on state and
breaks the off one, whose track is a mid grey; one handle colour cannot read
against both a near-white and a mid-dark track. So the **track** stops being the
primary. It comes from the **palette** rather than a role, and that is the point:
a role is allowed to flip with the theme and this value must not. `a-500` and
`a-600` read 4.8:1 and 6.4:1 against white in *every* theme, because they are the
same colour in every theme.

### The column picker stays, and says what it is for

Mehdi was right that nobody adds a column — *"we don't have more information to
give"* — and that does not mean the control should go. Every column is on by
default, so the list is for turning things **off**: a narrow window, a projector,
someone who does not care about metadata. The heading says "Columns to hide",
because "Columns" over a row of already-lit pills sends you looking for the other
half.

---

## §35 — The hue was never the robot's (2026-09-04)

Gabriel, on the hover colour: *"the colour of the play when hovered is still not
connected to the pixelrobot, what is going on?"*

**Both sides were hashing the same seed with different functions.** `hueIndexFor`
turned the identity into one of twelve angles; DiceBear turns the identity into
one of its own palette entries. There was never any reason for the two to agree,
and they didn't — the robot for `ravi.patel@vantage.io` is pink (`#f9a8d4`) and
the hash had put his row on green.

Nothing could be fixed from our side. **Pixelbot takes no colour parameter** —
every plausible name was tried against the API and silently ignored — and
matching its choice would mean reproducing its PRNG. So the colour is **read off
the avatar**: one flat fill dominates a pixelbot, and that fill *is* the robot.

`useAvatarHue` fetches the same URL the row's `<img>` already asked for (an HTTP
cache hit in every case but the first, and the first is 995 bytes), finds the
dominant fill with a regex, and turns it into an OKLCH angle. Results live in a
module `Map` for the life of the page, because a seed's hue cannot change. ⚠ **It
never touches the DOM** — the obvious version inlines the SVG and reads the fill
off the elements, which means injecting third-party markup into the page for a
colour.

**The hue only.** The robot's colour is a pastel — `#f9a8d4` is Tailwind's
pink-300 — and a pastel is unusable as ink: about 1.9:1 at 14px on white. So the
row borrows the *angle* and supplies its own lightness and chroma per job: a
ground behind the avatar, ink for the play. That is the only way "the same colour
as the pixelbot" can be true of a background and a 14px stroke at once.

One custom property carries it. `--m-row-hue` is set inline on the `<tr>` when
the reading lands, and falls back to the hashed twelve until then — so
everything that wears the hue reads one value and the two uses cannot disagree.

### The avatar's ground had to stop being a tint

⚠ **Pixelbot ships its own background**: a full-bleed `#042f2e` rect, near-black
teal, whatever colour the robot is. In a light list that is a black square per
row — *"in light mode it's horrible, the background of the avatar is super
dark"* — and in either mode it is a colour belonging to neither the robot nor the
theme.

Turning it off is what finally makes the component's original premise true (it
was written for a transparent avatar). ⚠ **`backgroundColor=ffffff00`, an
8-digit hex**: the API validates against `^#?([0-9a-f]{3,4,6,8})$` and answers
**400** to the word `transparent`, which the browser then reports on the `<img>`
as `ERR_BLOCKED_BY_ORB` — a message that says nothing about the cause.

And with it off, the ground could no longer be a wash. At 0.93 a pastel robot is
1.1–1.6:1 against it. Pixelbot's palette is Tailwind's 300s, drawn to sit on
something dark, and no parameter changes that — so the ground goes where they
read: **0.40 in light and 0.30 in dark**, measured against the six robot colours
the fixture produces (3.4–5.0:1 and 4.9–7.2:1). Both are visibly *coloured* chips
in the row's own hue, which is the difference from what shipped: a fixed
near-black teal square became a mid-tone chip the same colour as the thing inside
it.

⚠ **That was wrong, and it lasted one commit.** Gabriel: *"so you are saying
there's no way to make the avatar light mode?"* There is. The robot's colour
cannot be **set** — pixelbot has no option for it, and `robotColor` /
`primaryColor` validate against the API's merged cross-style schema while
pixelbot ignores them — but it can be **recoloured after the fact**.
`saturate(1.6) brightness(0.55)` on the `<img>` takes each pastel about two steps
down its own ramp, a 300 to something near a 600, and puts all eight the fixture
produces between **3.35:1 and 4.97:1** against a pale 0.93 chip.

So the avatar follows the app's convention after all: **light chip with dark ink,
dark chip with light ink**. 0.93 ground with the robot darkened in light; 0.30
ground with the robot as it comes in dark, where a pastel is doing exactly the
job a pastel is for (4.9–7.2:1) and darkening it would undo that.

⚠ It is the one place in this app where a **theme changes an image** rather than
a token, and that is because the image is the one asset here nobody controls.
Worth remembering the next time a third-party asset arrives at the wrong weight:
a filter is a real option, and dismissing it cost a round.

### And then the face vanished, because I had measured the wrong pair

The first filter was picked by measuring the pastel against **the chip**. The
face does not sit on the chip. **A pixelbot is not a coloured shape on a
background**: its body is `#000000` at 40% opacity and its *face* — the eyes and
the mouth — is the bright pastel. It is built for a dark ground, where the body
all but disappears and the face glows.

So `saturate(1.6) brightness(0.55)` left **face against body at 1.19–1.76:1**,
and light mode came out as a green checkerboard with no face in it.
`saturate(2.2) brightness(0.26)` measures the right pair: **3.55–4.39:1** of face
against body across all eight colours, with the body still 2.81:1 against the
chip so the silhouette reads too. The chip goes paler at the same time —
`oklch(0.96 0.03 h)`.

**The lesson is not about pixelbot.** Contrast is a property of a pair, and the
pair is whatever the thing is actually drawn *on*. Measuring against the nearest
surface instead of the real one produces a number that is correct and answers
nothing.

### The hover had the same shape of error

It was measured against the plane and not against **its own rest state**. In dark
the play rests at white, and `oklch(0.74 0.13)` sits only **1.94–2.18:1** from
white — the glyph changed colour and you could barely tell. `0.66 / 0.16` is
2.4–3.0:1 from white and still 5.6–6.9:1 against the plane; light moves the same
way, 0.52 → 0.55 with the chroma up.

⚠ Chroma stops at 0.16 rather than going further because **`oklch()` clips to
sRGB**, and a clipped colour quietly loses chroma — past that point the deepest
hues stop getting deeper while the others keep going, and "one hue per row"
becomes a lottery.

### An unwatched session fills its triangle

*"The sessions not watched are still not different enough — maybe the inner
triangle should be filled."* A muted outline against an unmuted one is a
difference you have to compare two rows to see; **filled against hollow you see
in one**. And the weight is on the right state: an unwatched session is the row
with something in it for you. It stays stroked as well as filled, because a fill
alone is smaller than the outline by half a stroke on every edge and the two
states would change size as well as weight.

---

## §36 — Two scopes, named and real (2026-09-04)

Mehdi spent five minutes of the 09-02 call explaining what a filter is, and it
was the most useful five minutes on the tape. It is also the part the 09-02
build had got wrong in two different ways at once.

**His explanation, in his own words.** An **event-level** filter narrows one
event — the little funnel beside it: *"you're looking for replays where it might
contain multiple events but one of the events you only care about country
Albania."* A **block-level** filter applies to every event above it: *"if you
add country in the filters it's going to apply on all the events block… it's a
group filtering basically."* That is why production has two sections, and he
gave the cost of not having them: without the block, filtering three events by
France means *"I would have to error, I have to add France; then page view, you
have to add France."*

He is not defending the design — *"I know it's confusing. I know that it could
be better"* — and he named the fix himself: **the name**. *"Not filters, we'll
call them something else, like group filters."* Because the real complaint is
*"people don't know right away what an event is, what a filter is."*

### What was wrong

**1. Nothing on screen said which scope a row had.** The 09-02 build deleted the
two section headings along with the two Add buttons. Only the buttons were what
he asked to merge; the headings were carrying the scope. The picker, meanwhile,
printed two headings of its own invention — "Things that happened" and
"Conditions on the session" — so picking a thing taught you a name that appeared
nowhere else. Three vocabularies for two kinds.

**2. The event-level filter did not filter.** `eventPosition` returned
`sessionEvents(s).indexOf(entry.id)` and never looked at `f.properties`. So
*"Click where URL is /checkout"* returned exactly what *"Click"* returned. The
one control on the page that expresses event scope was the one control that
could not change a result — which makes the distinction unfalsifiable, and a
distinction a reviewer has to take on trust is a caption.

### What it is now

**One vocabulary, in four places** (`vocabulary.ts`, its own module so the row
can say the same words as the card it lives inside): **Events** and **Group
filters**, with the behaviour as a hint beside each — `Applied to every event
above` on the section, and its exact opposite, `Applied to this event only`, on
the funnel's tooltip and above its picker.

The heading is quiet on purpose: 11px, muted, no rule, lighter than the rows it
labels. Adding headings back to a three-clause filter risks turning a control
into a document with chapters, and the rows are the content. What earns the two
lines is that the scope is otherwise invisible.

**And the event-level filter is real.** `eventAttributes(s, eventId)` gives each
occurrence the attributes its kind carries — a network request has a status code
and a rage click does not — sampled from `VALUE_FIXTURES` **with its weights**,
so the proportion bar in the value picker and the count the filter returns come
from one distribution. `eventPosition` now honours a row's sub-properties under
the row's own `and`/`or`, which is what makes those clickable words mean
something. Measured: *Click* is 40 sessions, *Click where URL is /checkout* is
10.

An **incomplete** sub-filter still narrows nothing — it is skipped rather than
matching nothing, so a half-built clause does not empty the list under you.

**The order control moved to the Events heading**, right-aligned, which is where
production keeps it (`FilterListHeader`). It had been riding the summary strip —
a strip that also speaks for the group filters below, so it was the wrong row to
say *how the events relate*.

### A bug found on the way: the collapse cancelled itself

`useFilterCollapse` followed the scroll in both directions, and the filter's own
height is usually what makes the page scrollable:

> scroll down → collapse → the rows leave → the page no longer overflows → the
> browser clamps `scrollTop` to 0 → the listener reads 0 → expand.

At a 620px viewport with four clauses that loop settles **open**, so the feature
did not happen at all; on a tall monitor it worked, which is why it survived. It
is one-way now — scrolling only ever closes it — which is what the hook's own
comment already claimed. Nothing is hidden by staying closed: the strip prints
the whole filter as a sentence, and the caret reopens it.

### What was deliberately not touched

*"No big changes at all for now."* The field, the ring, the value picker, the
category rail, the collapse and the summary strip are all as they were. The
three-column picker Gabriel proposed live stays rejected (*"for people it's
going to be super confusing"*). The natural-language path stays parked behind
`onTranslate`. **User and metadata are already the filter-only kinds** he named,
so that cut needed no work.

---

## §37 — One door, two catalogues (2026-09-04)

The 09-02 build read "have event and filters within a single button" as one
button **and one list**, and merged production's two catalogues into a single
scroll. Gabriel, 09-04: *"separate filter from events in a way that doesn't
compromise the unified filter field… the list in the picker should stay exactly
the same as it is currently in OpenReplay, undoing the merger we did into a
single picker."*

He is right, and the distinction is worth stating because it was the whole
mistake: **the ask was about the entry point, not the catalogue.** One button is
a claim about how many things are on the bar. It says nothing about what is
inside them.

### Where the kind gets decided

There are only five places it can be decided — before the list, beside it,
inside it, after the pick, or at the bar — and the option chosen is **before**,
with one condition that makes it affordable.

**The fork.** Clicking the field opens two cards: *Events* and *Group filters*,
each with a sentence and its own glyph. Choosing one opens production's list for
that kind, scoped exactly as `SessionFilters` scopes it (`eventOptions` /
`propertyOptions`).

**And the fork is only reachable on an empty search.** The standing objection to
a fork step is that it charges a click on everything you ever add, forever, to
teach a distinction an expert learned on day one. Here the bar retires the
moment there is one rule, and each section grows its own **Add** — so the fork
appears once per search, exactly when a reader is least oriented, and never gets
in the way again.

⚠ **Both section headings render once the search is non-empty**, even an empty
one. An Add that appears only when its own section is already occupied is an Add
you cannot reach until after you have used it. Production draws both for the
same reason.

**And this is not the two buttons Mehdi objected to.** His words were *"we have
two buttons and people don't know right away what an event is, what a filter
is."* Two buttons at the top of a card, before you have picked anything, **is** a
question about vocabulary. The same two at the foot of the sections they fill are
not a question at all — each is attached to the thing it makes, and the thing it
makes is on screen above it.

### The morph is the argument

The fork does not fade in over the bar; **it is the bar, growing.** The surface
starts at the bar's own measured width and height and moves to the panel's, then
changes shape again into the catalogue. A popover that appears somewhere else
has to be connected to its trigger by the reader; a shape that grows out of one
does not.

⚠ **Width and height are animated, which is normally the wrong choice** — a
transform is cheaper and does not reflow. It is wrong here: a scaled box scales
its own text and its own border, so a 13px label would arrive at 19px and
shrink. One element, no siblings, 260ms, contents absolutely positioned so they
are not laid out per frame. The rule of thumb does not apply when its reason
does not.

**The two glyphs are drawn rather than taken from lucide**, which is the one
place in this app where that is right. Lucide has a funnel and a mouse pointer;
both name the *control*, and neither says the thing these cards exist to say,
which is a difference in **scope**. So the sequence is three steps on a rising
stair, joined; the group is a brace gathering three lines.

### The ring is a torch now

Gabriel: *"I kinda hate the ring now — what if you add a ring in a mask with a
glow and you reveal that when you hover only in a radius around that."*

The travelling arc was correct in every way except the one that mattered: **it
moved on its own schedule.** A 1400px rectangle with a light running round it
reads as loading, or as an alert, twenty-four times a minute whether or not
anybody is looking.

The rim is whole and always drawn; a radial mask centred on the pointer reveals
only the stretch near it. **With a lead-in** (his pick of the variants): the
radius opens as you *approach*, driven by distance to the box rather than by
entering it, so the rim is lit before you land. Hover tells you where you are;
distance tells you where you are going.

That deleted more than it added — `pathLength`, two keyframe sets, the dash
arithmetic and the phase-drift note all went. What is left is two rectangles and
a mask.

⚠ **Focus has no pointer**, so focus drops the mask entirely and takes the whole
rim, held still. A control whose only indicator is a mouse position is a control
with no focus indicator, which is the trap every reveal-on-hover effect sets.

The document-level listener is the part to be careful with: it stores
coordinates and nothing else, one rAF loop does the geometry and **parks itself**
when the light is out, the box is measured on wake rather than per move, and the
result is three custom properties.

### The ground is inverted

Gabriel: *"I don't like the background of the section, it seems really
disconnected — I think we should invert, brighter background on the back."*

A grey band cut across a white plane does read as a slab from another document:
it shares no edge with the table under it, and it is the only large grey shape on
the page. So the section takes the plane's own ground and **the field carries the
tint** — the ordinary way round for a form. The filter and its results are one
surface now, and the fill is on the one shape you act on. A row's hover had to
flip with it: it used to step *up* toward the plane off a sunken well, and now
steps in.

### Two smaller moves

**The examples came back, as a different thing.** The 09-02 pair rotated prose
you were invited to type, and came out the same day because the field cannot read
a sentence. These sit after the word *like* and are **specimens** of what a
filter can say — you read one and click, you never type it — so the promise is
true and the field stays a button. Quieter than the lead, because the lead is the
instruction and this is an illustration of it.

**Save as segment moved to the strip, beside Clear.** In the page header it lived
among controls that are always available while it is only usable once there are
rules, so it spent most of its life greyed out explaining that you had not built
a filter yet. The strip exists only when the filter does. It also puts the two
verbs that dispose of a filter side by side: keep this, or throw it away.

---

## §38 — Both reversals, from a recording read too late (2026-09-04)

The 09-03 meeting was recorded and not read until after 09-04's work shipped.
Two of the things built that day had already been decided against on the call.

### The bar was a known failure

> *"I like this thing of events and group filters, but probably we can make it
> as a button. **I wouldn't put it as a bar. We tried the bar before.** People
> sometimes they type into the bar, they're expecting to see results in there —
> which we used to have at some point, but for technical reasons it adds much
> more overhead."*

OpenReplay shipped a type-into-it bar and removed it. That makes this a report
rather than a preference, and it invalidates the reasoning the 09-02 bar was
built on: *the field is the most important thing on the page, so it should be
the biggest control*. Size is exactly what made it read as a field, and a field
is what people typed into.

**It is a button now** — 26px, the same height as the date range and the display
menu beside it, told apart by the accent rather than by size. *"You can have a
nice button like this funnel… and have it in blue or in something obvious."*
This page's one accent was unspent, so nothing is displaced by spending it here.

⚠ **Not `--m-action-primary-bg`** — that token is near-black in light and
near-white in dark, which is the trap the Switch fell into on 09-04. The tint is
`--m-surface-selected`, the colour the palette already generates from the accent
hue, rather than a second name for a colour that exists.

**The rotating examples are gone for the second time, and now for a better
reason.** The 09-02 pair rotated prose you were invited to type, and came out
because the control cannot read a sentence. The 09-04 pair sat after the word
*like* as specimens of what a filter can express, which was honest — but his
objection is that a field-shaped control invites typing *at all*, and an example
after "like" is that invitation with a worked demonstration attached.

**What survived:** the claim was never that the control should be large, only
that there should be one of it. There still is. The torch ring stays too — it is
size-independent, and it reads better on a small target, because a light that
finds a small thing is doing something a hover state cannot.

### The fork lost, and it lost on the click

He reached it the long way, which is why the reasoning is worth keeping. He
floated two buttons himself; Gabriel described exactly the fork that was then
built; he walked production's two menus, noticed **Autocapture appears in both**,
and concluded the split is redundant precisely where it is visible. Then:

> *"What I don't like about it is you need to understand what a group filter is
> and what an event is, **plus it adds another click**."*

And Gabriel, in the room: *"I definitely think the best option is merging them
all, and the logic behind the filtering, OpenReplay will do it."*

So the kind is decided by **what you pick**, not before you pick — one merged
catalogue, and the two kinds stay legible in two places, neither of them a step:
the picker heads each group with its name when a result spans both, and the row
lands in the matching section below.

⚠ **The fork's one real defence was never put to him:** it was only reachable on
an empty search, so it charged its click once per *search* rather than once per
clause. That is true, and it is not enough — he named the cost twice and the
designer agreed with him on the call. Keeping a design on an argument nobody in
the room made is how a review stops meaning anything. `git show dc1780d` has the
two cards and their drawn glyphs.

**The morph survived the fork it was built for**, and is worth more now: a 64px
button becoming a 528px panel is a larger claim than a bar widening slightly.
One object changing shape, rather than a panel arriving beside its trigger.

### What the checks record

The suite is the honest register of the reversal, so the old assertions were
rewritten rather than deleted quietly:

- *"the field is the biggest control on the page and the only one at 14px"* — a
  faithful test of a claim that turned out to be the defect. Now: **the button
  sits on the same baseline as the controls beside it.**
- *"the one picker holds both kinds"* → *"the bar forks into the two kinds"* →
  **back to one merged list.** Three versions in two days; the churn is the
  record of a real argument, and the block says so.

### Still owed from the same call

Not done here, and each is a decision rather than a build: **the tabs move below
the filter** (you filter, then read the tabs); **mark the last few played
sessions rather than dotting the unseen** — *"people look at 0.001% of sessions
they capture"*, so a marker on the unseen is a marker on everything, and the play
glyph cannot carry it because it only exists on hover; **merge the date-range and
Display line into the line above**; **metadata badges bigger**. And above all
them, the layout: **two components on this page, three at most.**

---

## §39 — Two components, and the plane gives up its surface (2026-09-04)

Mehdi's 09-03 ask, and the thing he called the important one: *"We need to have
components. This screen should probably be two components… this is just a
technique we used over time to have it more airy."* Two here, three at the very
most. He walked production's cards page to show five — title, each series,
breakdown, card, drill-down.

### The line that answers every list page

Not header-over-table. **What makes the set, against what reads the set.**

- **The question** — the filter, the date window, and the verbs that dispose of
  the query itself (Save as segment, Clear). Everything that changes *which rows
  exist.*
- **The answer** — the narrowing tabs, the display menu, the column headers and
  their sorters, the rows, the pagination. Everything that changes *how you read
  the rows that exist.*

**The test that settles the hard cases:** a control that displays counts derived
from the result belongs to the result. `All 38 · Errors 6` is arithmetic on what
the filter returned, so it cannot sit above the thing it counts. Which is the
conclusion Mehdi reached by instinct: *"you have the tabs first, all errors
whatever, and then you have the filters — it should be reversed."*

It also settles Display, which changes nothing about which rows exist.

⚠ **And the distinction that will bite on every other page:** two kinds of tab
look identical and belong in different places. **Destination** tabs (Sessions /
Bookmarks / Segments, or Tests / Runs / Environments) are different lists and
stay in the page header. **Narrowing** tabs are one list filtered, carry counts,
and belong in the answer's head.

### The plane gave up its surface rather than holding cards

The obvious way to add components would have been to inset cards into the
existing plane. That is **three surfaces deep** — ground, plane, card — and
Gabriel had already named the risk on the call: *"if we use that separation with
a lot of components it wouldn't make sense, it would feel really disconnected."*

So the plane keeps its margin, its scrolling and its header, and loses its
border, its radius and its fill. The header sits on the ground; the components
are the only cards on screen. **Two levels, exactly as many as before**, and it
is production's own arrangement: a grey application background with white cards
on it.

The 09-04 inversion survives unchanged inside the card — a white component with
a tinted filter field.

**The air is a single `gap`**, the same measurement as the shell's own margin,
so the space between the components and the space around them are one number. No
rule, no shadow, no third colour.

**Pages that are one component did not have to change.** `PageCard` wraps
`toolbar` and `children` in a panel unless the page passes `split`, so Issues,
Tests, Runs and Audits became header-on-ground plus one card for free.

### What sticks, and it reversed

The question scrolls away — you stop needing the filter once you are reading
results, which is the argument its own collapse is built on — and the two things
you never stop needing hold their place: **the breakdown and the column titles.**

Three traps, all of which look like something else:

⚠ **`overflow: clip`, not `hidden`.** Both round the corners off a table; only
`hidden` makes the panel its own scroll container, and a sticky child then
sticks to a box that never scrolls. A sticky head that silently does nothing.

⚠ **The question panel must not be clipped at all.** Its catalogue grows out of
a button and extends past the card's bottom edge. A clipped menu is worse than
it sounds: still laid out, so it still answers hit-testing as *visible*, but
painted nowhere — so every click on it lands on whatever is behind. It took a
Playwright log naming the element underneath to see it.

⚠ **The head's height is published as a variable.** The panel head and the
table's column titles are sticky against the same scrollport, so at the same
offset the titles pin *behind* the head — which reads as the titles not sticking.
A `ResizeObserver` writes `--m-panel-head-h`, because the head wraps and its
height depends on the plane's width.

### And one that only appeared on a short window

`flex: 1` on the last panel — so a short list would reach the bottom of the
plane rather than leaving ground showing — plus `overflow: clip` is a box that
cuts its own overflow and cannot scroll it. On a 560px window the pagination was
inside the card, below its bottom edge, and unreachable by any means. **A card
ends where its content ends;** ground under a short list is what a card layout
looks like, and the page body is the thing that scrolls.

## §40 — Ten Placeholders, and what production actually has (2026-09-04)

Mehdi's 09-03 review, the instruction that outlived the layout work it came
attached to: *"bring in as many other pages as possible; Product Analytics and
Data Management are tables and stuff."* The 09-04 menu already gave CoBrowse,
Spot, Product Analytics (Dashboards / Cards / Alerts) and Data Management
(Activity / People / Events / Properties / Features) their rows — every one of
them rendered `<Placeholder>`. This round replaces all ten with the real page,
built the way Tests and Audits were in §12: read what production has, adapt it
into this library, subtract what a fixture-backed prototype does not need.

| Destination | Production source | Shape |
|---|---|---|
| CoBrowse | `Assist/AssistView` + `shared/LiveSessionList` + `Assist/RecordingsList` | one page, two in-page tabs |
| Spot | `Spots/SpotsList` | a card grid, not a table |
| Dashboards | `Dashboard/components/DashboardList` | `Table`: Title, Owner, Last Modified, Visibility |
| Cards | `Dashboard/components/MetricsList/ListView` | `Table`: Title + type icon, Owner, Last Modified |
| Alerts | `Dashboard/components/Alerts/AlertsList` | a hand-rolled grid in production, ported as a `Table` |
| Activity | `DataManagement/Activity/ActivityPage` | the heaviest page: two filter dimensions, a date window |
| People | `DataManagement/UsersEvents/UsersList` | `Table`: Name, User ID, Location, Last Seen, Created |
| Events | `DataManagement/Events/EventsList` | `Table`: Event Name, Display Name, Description, volume |
| Properties | `DataManagement/Properties/ListPage` | two in-page tabs: User / Event |
| Features | `DataManagement/Tags` | `Table`: Name, Location, Selector, Users, Interactions |

### Two judgment calls, made once and not re-argued

**Spot stays a card grid.** Every other page here is a `Table` because Mehdi's
own words were "tables and stuff" — but a Spot's thumbnail *is* the scannable
fact, the way a session's journey strip would be if the payload carried one.
Forcing it into a text row would answer "what is this clip called" and lose
"is this the one I am looking for," which is the only question a library of
clips actually gets asked. The card's seeded tint reuses `hueIndexFor` from
`shared/avatar.ts` — the session avatar's own twelve-hues idiom — rather than
inventing a second colour system, tuned with its own light/dark pair for a
full-size surface instead of a 24px chip's near-invisible wash.

**Alerts becomes a real `Table`.** Production draws it as a hand-rolled
`grid-cols-12` row; ported here as a `Table` to match its two Product
Analytics siblings, on the same reasoning the 09-02 Audits reversal used —
consistency is not a reason on its own, but Title, Type and Modified already
map onto columns cleanly, and nothing was invented to force it. The rule
itself — *"when the error rate is above 5% over the past hour, notify via
Slack"* — survives as a second line under the name, the same way an audit's
scope line is what its name means.

### A label that means something else in production

⚠ **"Features" is not a feature-flag catalogue.** Grepped `routes`/`layout`
for one and found none — production's own sidebar item labelled "Features"
points at `DataManagement/Tags`, which watches one DOM element, tagged from a
session recording, for adoption: does anyone use this button. Gabriel's
`tree.ts` already committed to the label "Features" on 09-04, so this page
ports Tags under that name rather than renaming the nav or inventing a flag
list that does not exist upstream. Written down once, at the top of
`shared/features-data.ts`, so the mismatch is not re-derived as confusion the
next time someone opens that file expecting LaunchDarkly.

### What every page kept from the Tests/Audits port, and what changed

**Kept:** the three-file shape (`shared/<x>-data.ts` for fixtures and pure
helpers, `state/use<X>.ts` for the controller, `<x>/<X>Page.tsx` for the
composition), `PageCard` + `FilterStrip`/`SearchField`/`ListFooter`, a
`StubDrawer` on every row rather than a click that does nothing, and reusing
`DataState`/`FilterDimension`/`ActiveFilterChip` from `shared/issues-logic.ts`
instead of re-deriving them per page.

**Changed:** most of these ten pages have exactly ONE real filterable
dimension (Dashboards' owner, Cards' type, Events' autocaptured/custom), so
they get a `FilterStrip` and nothing else — no `DateRange`, no `FilterMenu`,
no `DisplayShell` invented to look consistent with pages that have five real
dimensions. Only Activity earns the full cluster, because it is the one page
whose fixture genuinely has an event name, an environment and a date to ask
about. The §22 lesson holds: *consistency is not a reason on its own.*

**The Subitem rule stays intact (§30).** Dashboards/Cards/Alerts and
Activity/People/Events/Properties/Features are menu Subitems, so none of them
draw an in-page tab strip — each is its own page. The one place an in-page
`Tabs` legitimately appears is **one level below** a Subitem or a single-row
destination: Properties' User/Event split, and CoBrowse's Live/Recordings
split (CoBrowse has no Subitems at all — it is one row). Same shape
`TestsPage`'s own section tabs already use.

### Deliberately not built, same tier as the Tests/Audits detail panels

`AssistStats` (the enterprise "Co-Browsing Reports" drawer nested inside
CoBrowse), every creation flow (a dashboard canvas, a card builder, an alert
builder, Spot's recorder), Activity's draggable/hideable columns and its live
new-events poll, and `DataManagement/Segments` (not one of Gabriel's five).
A stub column picker over five fixed columns is a control that changes
nothing anyone would notice, which is the same reasoning that kept it out of
Tests and Audits.

### One class-prefix collision, caught before it shipped

`.m-dm__*` already belongs to `DisplayMenu` (`.m-dm__row`, among others) —
the exact shape of bug §12 shipped once with `.m-strip`/`.m-seg`. Grepped
before naming the Data Management pages' shared stylesheet and renamed to
`m-dmg__`. **Grep the prefix before naming one** stays the habit.

Verification: `tools/other-pages-check.mjs`, modeled on `agents-check.mjs` —
navigates to all ten destinations by clicking (never `goto`, since state is
in-memory), asserts each table or grid renders its fixture rows, that
search/filter/sort narrow the visible set, that a `StubDrawer` opens and
closes on a row, and reads computed dark-mode styles rather than trusting
class presence.

## §41 — The inspector under the recording (2026-09-04)

Mehdi asked for the replay's dev tools three times (08-26, 08-27, 09-01) as
*the one addition anywhere* to the scope. The first cut put Console and
Network in the journey side panel as two more tabs; Gabriel sent
production's own screenshots the same afternoon and set the shape: **"a
bottom collapse/expand section, just like the inspecting tool of Chrome …
using exactly the capabilities of OpenReplay, don't bring data we don't
have."**

**What production has, read out of the player code** (`Controls.tsx`,
`shared/DevTools/*`, `Session_/OverviewPanel`, `Session_/Performance`,
`Session_/Storage`): seven tabs in the transport bar — X-Ray, Console,
Network, Performance, State, Events, Traces — a red dot on the ones with
errors, a panel that grows above the bar with a resize handle, a 40px header
of sub-tabs on the left and filters on the right, rows that carry their time,
fade once they are ahead of the playhead, and jump when clicked. State only
exists when a store is detected, Events when `tracker.event()` or an
integration posted something, Traces when a backend-log integration is
connected.

**What was built** (`src/replay/devtools/`): the strip is its own thin row
between the stage and the transport — Chrome's shape, tabs on the lid of the
thing they open — so the track keeps its width. The panel is one box the tabs
swap the inside of; height persists across tabs; the open tab closes on a
second click. X-Ray, Console, Network and Performance are drawn in full from
data the tracker sends (`sessionLogs`, `sessionRequests`,
`sessionPerformance` in `shared/replay.ts`, all read off `replayMarkers`, so
a failed request, a red console line and the danger ring on the journey are
one moment). State, Events and Traces show production's own empty states,
because this fixture has no store, no custom events and no log integration —
a true thing about the session rather than an invented one.

Deliberate departures from production, each for a reason: a request opens
inline rather than into a 500px drawer (the panel already is the drawer, and
only what this project captures — facts and timings — is shown; "headers and
bodies are not captured" is production's own line); "All tabs / Current tab"
is not drawn on a single-tab session (a control whose click changes nothing);
X-Ray's Hide/Show menu is a strip (a strip shows what is hidden too).

Not done, on purpose: the Synthetics run drawer keeps its own
console/network (Gabriel: "run flows network and console its still
pending"); player fullscreen; autoscroll. Mehdi still owes the list of which
of the seven to keep.

## §42 — Six things before the push (2026-09-04, the last review before the break)

Mehdi's review of the shells, the merged filter, the table and the menu
(Fathom, 30 min) accepted all four and asked for six changes **before the
branch is deployed**, because Nikita starts from that deploy. All six are in,
each with the reason he gave.

**1. The date window came down.** *"The past 30 days, I would probably push it
down... save as segment doesn't have the same height as past seven days, so it
looks a little bit weird."* The window left the filter's row - where it had
been since 09-02 on the argument that the filter is what sticks - for the
answer's own head, beside the display menu, which is where Issues, Runs and
Audits already keep theirs. That head sticks too, so the original argument is
still honoured. `SearchCard` lost its `trailing` slot with it: the filter no
longer knows a list has a period.

**2. The bar is back, and it is a field.** He killed the full-width bar on
09-03 (*"people type into the bar, they're expecting to see results"*) and
described a different one on 09-04: *"if we can reduce its height, and remove
that turning stuff... if I can search in it, instead of having a second line
below it, then it might have a purpose. Thinner, smaller... probably a little
bit wider... maybe that's much better than having a button there."* So the
bar is now the **button's height (26px) and type size, wider than the button
(up to 32rem), with an `<input>` where the button has a word**. Typing opens
the catalogue under it and narrows it; the catalogue has **no search row of
its own** while the bar is open (`PickerBody.hideSearch`, controlled `query`),
so there is one place to type. Enter takes the first match through
`commitRef`; Escape closes. The rotating examples are gone in both shapes,
this time on his word (*"remove that turning stuff"*). The bar is the default
(`DEFAULTS.trigger = 'bar'`); the button is the one you have to ask for. His
09-03 objection is answered rather than argued with: people type into a bar
expecting something to happen, and now something does.

**3. Agents is Armada.** *"Instead of agents, I would call it Armada. OpenReplay
Armada - a fleet of agents that are going to do stuff."* The label only; the
`agents` key is a route and stays. The robot glyph stays - *"makes a ton of
sense"* - and he may colour it later.

**4. No dot on a session row.** The one exception to the app's dot-means-new
convention, and it is an exception of scale: *"the real case scenario, it's
always going to be active most of the time... it's hundreds of thousands, and
it's all going to look like this whenever you open your front end, so that dot
doesn't bring anything."* Issues and Synthetics keep theirs (dozens of rows).
Viewed rows are still the 70% row and the "Last viewed" chip (§38).

**5. The collapse is in the foot again.** *"That button to close the menu, can
we put it down on top of this 50K?"* First of the six foot tools, directly over
the credits meter, so narrow it is the top of the stack. The brand row stopped
being a toggle when narrow; the mark alone sits on it.

**6. The logo is the title's size.** *"Make the OpenReplay logo bigger, like
Sessions, almost the same ratios as the title."* The wordmark uses
`.m-page__title`'s own size arithmetic (22px at the default scale), the mark
went 16 → 22 to keep up. Medium weight rather than the display weight: a
wordmark is a name, not a heading.

**Deferred by him, explicitly:** the popover's content and spacing, the
replay's network tab order and a floating right-side detail panel, tabs for
multiple open sessions, Preferences, Onboarding, and click-through on the
shell pages. Next review Monday 14 September.
