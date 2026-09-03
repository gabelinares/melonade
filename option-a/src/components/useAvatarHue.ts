import { useEffect, useSyncExternalStore } from 'react';
import { avatarUrl, dominantFill, hueOf } from '@shared/avatar.ts';

/* ══════════════════════════════════════════════════════════════════════════
   THE ROW'S HUE, READ OFF THE ROBOT.

   ⚠ WHY THIS EXISTS AT ALL. "One hue per row, used twice" was built on a hash
   of the seed, and DiceBear hashes THE SAME SEED by its own function into its
   own palette - so the tint and the robot never agreed. Gabriel: *"the colour
   of the play when hovered is still not connected to the pixelrobot, what is
   going on?"* Nothing could be done from our side: pixelbot takes no colour
   parameter, and matching its choice would mean reproducing its PRNG.

   So the colour is read off the avatar. One flat fill dominates a pixelbot and
   that fill IS the robot; `dominantFill` finds it and `hueOf` turns it into an
   angle the row can build both of its colours from.

   ── WHAT IT COSTS, WHICH IS ALMOST NOTHING ────────────────────────────────
   One `fetch` per identity, to the URL the `<img>` on that row already asked
   for - so it is an HTTP cache hit in every case but the first, and the first
   is 995 bytes. Results are cached for the life of the page in a module Map,
   because a seed's hue cannot change.

   ⚠ IT PARSES WITH A REGEX AND NEVER TOUCHES THE DOM. The obvious version
   inlines the SVG and reads the fill off the elements; that means injecting
   third-party markup into the page, which is not a thing to do for a colour.
   ══════════════════════════════════════════════════════════════════════════ */

const hues = new Map<string, number>();
const inflight = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const getVersion = () => version;

function load(seed: string) {
  if (hues.has(seed) || inflight.has(seed)) return;
  inflight.add(seed);
  fetch(avatarUrl(seed))
    .then((r) => (r.ok ? r.text() : null))
    .then((text) => {
      const hex = text ? dominantFill(text) : null;
      if (hex == null) return;
      hues.set(seed, hueOf(hex));
      version += 1;
      listeners.forEach((fn) => fn());
    })
    /* A hue nobody could read is not an error worth showing. The row keeps the
       hashed fallback, which is a colour - just not the robot's. */
    .catch(() => {})
    .finally(() => inflight.delete(seed));
}

/**
 * The hues for a page of rows. Missing until the fetch lands, which is what the
 * CSS fallback is for - see `--m-row-hue` in sessions-page.css.
 */
export function useAvatarHues(seeds: readonly string[]): ReadonlyMap<string, number> {
  /* The store is a counter. Every row on the page reads the same Map, so one
     bump re-renders all of them and none of them holds a copy. */
  useSyncExternalStore(subscribe, getVersion, getVersion);
  const key = seeds.join('|');
  useEffect(() => {
    for (const s of seeds) load(s);
    /* `key` is the dependency, deliberately: `seeds` is a fresh array every
       render and would fetch on every one. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return hues;
}
