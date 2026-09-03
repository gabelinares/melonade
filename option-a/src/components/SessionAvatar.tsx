import { useState, type CSSProperties } from 'react';
import { avatarUrl, hueIndexFor } from '@shared/avatar.ts';
import './session-avatar.css';

export interface SessionAvatarProps {
  /** The identity, not the row. See `seedFor` in shared/avatar.ts. */
  seed: string;
  /** Rendered edge in px. The sessions list uses 20. */
  size?: number;
  className?: string;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * ONE IDENTITY, ONE ROBOT.
 *
 * A DiceBear **pixelbot** seeded on the row's identity, on a tinted ground that
 * is also seeded on it. All of the reasoning - why a robot rather than a face,
 * why the HTTP API rather than the package, why the seed is the id and not the
 * hash - is in `shared/avatar.ts`, which is where the numbers that decided it
 * are written down too.
 *
 * ── THE GROUND IS DRAWN FIRST AND STAYS DRAWN ──────────────────────────────
 * ⚠ This is the only thing in the prototype that fetches from a third party at
 * render time, so it is built to survive the fetch not landing: an aeroplane, a
 * blocked domain, DiceBear having an afternoon. The tint is the element's own
 * background; the robot is an `<img>` on top of it. If the request fails the
 * row keeps a small coloured chip where an avatar goes, which is a degraded
 * avatar rather than a broken image - and because the tint is seeded too, it is
 * still the same chip for the same person.
 *
 * ── IT IS DECORATIVE, AND SAYS SO ──────────────────────────────────────────
 * `aria-hidden` on the wrapper and an empty `alt`. The name or the anonymous id
 * is printed immediately beside it, so anything here would be the identity read
 * out twice. An avatar is a thing you recognise at a glance while scanning; a
 * screen reader is not scanning.
 *
 * ── WHY IT IS A ROUNDED SQUARE AND NOT A CIRCLE ────────────────────────────
 * A circle clips a pixel grid on the diagonal, and at 20px that is two or three
 * pixels of the art bitten off each corner - the robot's own square silhouette
 * fights it. `--m-radius-control`, the same 4px every other small box in the
 * app uses, so it reads as a chip in a list of chips.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function SessionAvatar({ seed, size = 20, className }: SessionAvatarProps) {
  /* ⚠ Keyed on the seed by the caller, so this resets when the row's identity
     changes. Without that, a failed avatar would leave the NEXT person on that
     row without one - React keeps the state, not the person. */
  const [failed, setFailed] = useState(false);

  return (
    <span
      className={`m-savatar${className ? ` ${className}` : ''}`}
      /* The hue index rather than a colour: the stylesheet turns it into an
         angle, so twelve grounds are one declaration instead of twelve rules.
         See session-avatar.css. */
      style={{ '--m-avatar-i': hueIndexFor(seed), width: size, height: size } as CSSProperties}
      aria-hidden="true"
    >
      {!failed && (
        <img
          className="m-savatar__img"
          src={avatarUrl(seed)}
          alt=""
          width={size}
          height={size}
          /* ⚠ NOT `loading="lazy"`. It was, on the reasoning that a paged list
             need not fetch what is below the fold - and it fetched two of the
             twelve rows on screen and left ten grounds empty. Chrome defers on
             its own reading of the scrollport, and a table body inside a
             scroller is exactly the case it reads badly. At 995 bytes each,
             cached for a year, there is nothing to defer. */
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
