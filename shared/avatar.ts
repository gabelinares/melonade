/* ══════════════════════════════════════════════════════════════════════════
   THE SESSION AVATAR.

   Mehdi, 2026-09-02, on the avatar he had asked to remove and then asked back:
   bring it back smaller, but *"not a face at 16px"* - and try a different
   library. Gabriel, 2026-09-03: DiceBear's **pixelbot**, and *"I want the
   avatar to be exactly the same when the user is the same, of course, when I
   filter by user."*

   ── WHY A ROBOT AND NOT A FACE ────────────────────────────────────────────
   A generated face at 16px is a smear that reads as a photograph of nobody,
   and it makes a claim the data cannot support: these are user IDs and email
   addresses, not people who chose a picture. A pixel robot is legibly
   synthetic. It says "this is a token standing for an identity", which is
   exactly what it is, and pixel art is the one illustration style that gets
   MORE readable as it gets smaller because it was drawn on a grid.

   ── THE SEED IS THE IDENTITY, WHICH IS THE WHOLE REQUIREMENT ──────────────
   DiceBear is a pure function of its seed, so "the same user gets the same
   avatar" needs no cache, no store and no id map - it needs the seed to be the
   identity and nothing else. ⚠ Not the row, not the index, not the session id:
   those change per session, and a person with eleven sessions would get eleven
   robots. `seedFor` takes the user id when there is one and the anonymous id
   when there is not, so an identified person is one robot across every session
   they appear in and an anonymous visit is its own.

   ⚠ This turned up a real defect in the fixture, which is worth knowing
   because it is the shape of defect a generated identity always finds: the
   name and the id were derived from two different formulas, so one person
   owned eleven ids. Nothing rendered the id, so nothing had ever disagreed.
   See the note in `sessions-data.ts`.

   ── WHY THE HTTP API AND NOT THE PACKAGE ──────────────────────────────────
   `@dicebear/collection` stops at 9.4.3 and **pixelbot is a 10.x style**, so
   there is no local generator for it. Measured before choosing:

       svg                      995 bytes over the wire (20.9 kB raw, gzipped)
       png?size=40            2,856 bytes
       webp?size=48           4,140 bytes

   So the SVG, which is also the only resolution-independent one - a raster
   sized for a 20px avatar is wrong the moment the avatar changes size. The
   responses carry `cache-control: public, max-age=31919000`, about a year, and
   `access-control-allow-origin: *`. The fixture holds roughly fifty distinct
   identities, so a full browse of every page is about 50 kB, once.

   ⚠ IT IS A NETWORK DEPENDENCY, and the component treats it as one: the
   avatar has a ground of its own that is drawn first and stays drawn if the
   request never lands. See SessionAvatar.tsx.
   ══════════════════════════════════════════════════════════════════════════ */

/** DiceBear's style and version, in one place. Bumping the version changes
 *  every avatar in the product, which is a decision and not a detail. */
const DICEBEAR = 'https://api.dicebear.com/10.x/pixelbot/svg';

/**
 * What identifies the person on a row. The user id when the session is
 * identified, the anonymous id when it is not.
 *
 * ⚠ Deliberately NOT `numericHash`, even though the fixture carries one and
 * production has a `userNumericHash` beside it. A hash is a lossy copy of the
 * thing it hashes: two identities can collide into one robot, and the field can
 * drift from the id it was meant to summarise, which is exactly what had
 * happened here. The id is already unique and already a string.
 */
export const seedFor = (identity: { userId?: string; userAnonymousId: string }): string =>
  identity.userId ?? identity.userAnonymousId;

/**
 * The avatar's URL for one seed. Same seed in, same URL out, forever.
 *
 * ⚠ `backgroundColor=transparent` BECAUSE PIXELBOT SHIPS ITS OWN, and it is a
 * near-black teal (`#042f2e`) drawn as a full-bleed rect whatever the robot's
 * colour is. In a light list that is a black square per row - Gabriel: *"in
 * light mode it's horrible, the background of the avatar is super dark"* - and
 * in either mode it is a colour that belongs to neither the robot nor the
 * theme. Turning it off is what lets the row's own ground show through, which
 * is what `SessionAvatar` was written for in the first place.
 *
 * ⚠ AND IT IS AN 8-DIGIT HEX, NOT THE WORD "transparent". The API validates
 * this parameter against `^#?([0-9a-f]{3,4,6,8})$` and answers 400 to anything
 * else - which the browser then reports as `ERR_BLOCKED_BY_ORB` on the `<img>`,
 * a message that says nothing about the real cause. `ffffff00` is white at zero
 * alpha: the rect is still drawn and paints nothing.
 */
const TRANSPARENT = 'ffffff00';
export const avatarUrl = (seed: string): string =>
  `${DICEBEAR}?seed=${encodeURIComponent(seed)}&backgroundColor=${TRANSPARENT}`;

/* ── THE GROUND, WHICH IS ALSO A PER-IDENTITY HUE ──────────────────────────
   pixelbot arrives with a transparent background, so something has to sit
   behind it or the robot's own outline is all there is on a white row. That
   something may as well carry information, and Mehdi's own resolution to his
   twenty-colours objection was *one hue per row, used twice* - once at the
   avatar on the left and once at the play on the right, so the two ends of a
   row are visibly the same row.

   ⚠ TWELVE HUES AND NOT MORE. The number is the point of the objection: a
   column of a hundred and thirty-four distinct colours is a colour per row,
   which is noise. Twelve means colours repeat down the list - and repeating is
   fine, because the hue is not an identifier. It is a tint that makes one row
   cohere across a wide table. The identifier is the robot. */
export const AVATAR_HUES = 12;

/**
 * Which of the twelve, for a seed. FNV-1a over the characters, then a
 * finalising avalanche before the modulo.
 *
 * ⚠ THE AVALANCHE IS NOT OPTIONAL, and leaving it out is the mistake this
 * function was written with. `% 12` reads the LOW bits, and FNV-1a's low bits
 * barely move for short similar strings - which is every seed here: `u-1187`
 * and `a-8801` landed on the same hue, adjacent in the list, and twelve rows
 * produced six distinct grounds instead of ten or eleven. The three
 * xor-shift-multiply rounds below are the `lowbias32` finaliser; they cost
 * nothing and they are what makes the modulo mean anything.
 */
export function hueIndexFor(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) % AVATAR_HUES;
}

/* ── THE ROBOT'S OWN COLOUR ────────────────────────────────────────────────
   ⚠ `hueIndexFor` ABOVE IS A FALLBACK, NOT THE ANSWER, and it took a round of
   review to see why. It hashes the seed into twelve hues - and DiceBear hashes
   the SAME seed into its own palette by its own function, so the two never
   agree. The robot for `ravi.patel@vantage.io` is pink (#f9a8d4); the hash put
   his row on green. Gabriel, looking at it: *"the colour of the play when
   hovered is still not connected to the pixelrobot, what is going on?"*

   Nothing can be done from this side: pixelbot takes no colour parameter (every
   plausible one was tried against the API and ignored), and reproducing its
   choice would mean reproducing its PRNG. So the colour is READ OFF THE AVATAR
   ITSELF - one flat fill dominates a pixelbot, and that fill is the robot.

   The reading happens in the app layer (`useAvatarHue`), because it needs a
   fetch and a cache. What is here is the two pure parts of it. */

/** The most-used real fill in a DiceBear SVG, which for a pixelbot is the robot.
 *  Black and the near-black outline are skipped - every robot has those, so they
 *  identify nobody. */
export function dominantFill(svg: string): string | null {
  const counts = new Map<string, number>();
  for (const m of svg.matchAll(/fill="(#[0-9a-fA-F]{6})"/g)) {
    const hex = m[1]!.toLowerCase();
    /* Skip the ink: pure black, and anything under 12% lightness, which is the
       dark outline every one of them is drawn with. */
    if (hex === '#000000' || luminance(hex) < 0.12) continue;
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }
  let best: string | null = null;
  let most = 0;
  for (const [hex, n] of counts) if (n > most) { most = n; best = hex; }
  return best;
}

const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (hex: string) =>
  0.2126 * toLinear(channel(hex, 0)) + 0.7152 * toLinear(channel(hex, 1)) + 0.0722 * toLinear(channel(hex, 2));

/**
 * A hex colour's OKLCH hue, in degrees.
 *
 * ⚠ THE HUE ONLY. The robot's own colour is a pastel - #f9a8d4 is Tailwind's
 * pink-300 - and a pastel is unusable as ink: at 14px on a white plane it is
 * about 1.9:1. So the row borrows the ANGLE and supplies its own lightness and
 * chroma for each job: a tint behind the avatar, ink for the play glyph. Same
 * colour, two readings of it, which is the only way "the same colour as the
 * pixelbot" can be true of a background and a 14px stroke at once.
 */
export function hueOf(hex: string): number {
  const [r, g, b] = [0, 1, 2].map((i) => toLinear(channel(hex, i))) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return (Math.atan2(bb, a) * 180) / Math.PI;
}

/* ── REWRITING THE ROBOT FOR A LIGHT GROUND ────────────────────────────────
   ⚠ A CSS FILTER CANNOT FIX THIS ONE, and three rounds of trying is what
   established it. A pixelbot has two layers: a BODY drawn as `#000000` at 40%
   opacity, and a FACE in a bright pastel. On a dark chip that is exactly right -
   the body sinks in, the face glows. On a light chip the body composites to a
   mid grey and becomes the loudest thing in the tile, a heavy checkerboard with
   a small dark spot in it.

   Filters multiply RGB. The body's weight comes from its ALPHA, so no
   combination of brightness, contrast or saturate moves it: black times
   anything is black, and 40% of it over white is grey whatever you do. And
   anything that fades the body (`opacity()`) fades the face with it.

   So the SVG is rewritten instead: the body's opacity comes down and the face's
   colour is replaced outright with a deep version of its own hue. Two layers,
   two edits, no filter - and the result is what Gabriel described: *"pastel in
   light mode, the background super pale, low opacity, giving space to the
   contrastly saturated darker face."*

   ⚠ IT IS STILL NEVER PARSED INTO THE DOM. Two string replacements on text we
   already fetched, handed back to an `<img>` as a data URI. */

/** How much of the body's 40% survives on a light ground. Enough to read as a
 *  silhouette, not enough to be the subject. */
const LIGHT_BODY_OPACITY = 0.14;
/** Where the face lands: deep enough to carry on near-white, saturated enough
 *  to still be its own colour rather than a dark grey. */
const LIGHT_FACE = { l: 0.46, c: 0.17 };

/** OKLCH to a `#rrggbb`, clamped into sRGB. */
export function oklchToHex(l: number, c: number, hueDeg: number): string {
  const h = (hueDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const l3 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m3 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s3 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const gamma = (v: number) => {
    const x = Math.min(1, Math.max(0, v));
    const g = x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
    return Math.round(g * 255).toString(16).padStart(2, '0');
  };
  return `#${gamma(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3)}${gamma(
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
  )}${gamma(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3)}`;
}

/**
 * The same robot, redrawn for a pale chip: body faded, face deepened into its
 * own hue. Returns a `data:` URI ready for an `<img>`, or null if the SVG is
 * not the shape this expects - in which case the caller keeps the original,
 * which is the right failure.
 */
export function lightVariant(svg: string): string | null {
  const face = dominantFill(svg);
  if (face == null) return null;
  const deep = oklchToHex(LIGHT_FACE.l, LIGHT_FACE.c, hueOf(face));
  const out = svg
    /* The body. DiceBear writes it as `fill-opacity=".4"`; matched loosely so a
       formatting change upstream does not silently stop this working. */
    .replace(/fill-opacity="0?\.4"/g, `fill-opacity="${LIGHT_BODY_OPACITY}"`)
    /* The face, everywhere it appears - eyes and mouth are separate groups. */
    .replaceAll(face, deep);
  return `data:image/svg+xml;utf8,${encodeURIComponent(out)}`;
}
