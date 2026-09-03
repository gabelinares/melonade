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

/** The avatar's URL for one seed. Same seed in, same URL out, forever. */
export const avatarUrl = (seed: string): string =>
  `${DICEBEAR}?seed=${encodeURIComponent(seed)}`;

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
