import { BrandMark } from '../nav/BrandMark.tsx';
import './brand-loader.css';

export interface BrandLoaderProps {
  /** What is being fetched, said in words for the reader and for the screen
   *  reader. Kept short: this sits on a header line, not in the middle of a
   *  pane. */
  label: string;
  size?: number;
}

/**
 * The loader, and it is the Melonade mark rather than a spinner.
 *
 * The mark already has one honest piece of motion in it - the disc and the
 * small square trading places - and it is the only watermelon thing in this
 * app, so it is the one element that can move without competing with anything.
 * A ring spinner beside it would have been a second animation saying the same
 * word.
 *
 * IT DOES NOT COVER ANYTHING. A loader laid over the content it is replacing
 * has to be positioned, has to have a backdrop, and hides the skeletons that
 * are doing the more useful half of the job. This one sits on the section's own
 * header line, in the slot the hint text occupies the rest of the time, so
 * nothing moves when it appears and nothing moves when it goes.
 */
export function BrandLoader({ label, size = 16 }: BrandLoaderProps) {
  return (
    <p className="b-loader" role="status">
      <BrandMark size={size} loop />
      <span>{label}</span>
    </p>
  );
}
