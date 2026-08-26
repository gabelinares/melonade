import { BrandMark } from '../nav/BrandMark.tsx';
import './brand-loader.css';

export interface BrandLoaderProps {
  label: string;
  size?: number;
}

/**
 * The loader, and it is the Melonade mark rather than a spinner.
 *
 * The mark already has one honest piece of motion in it - the disc and the
 * small square trading places - so a ring spinner beside it would be a second
 * animation saying the same word. It is also the one element in either option
 * allowed to carry the brand hue, which is what lets it move in a system that
 * rations colour this hard.
 */
export function BrandLoader({ label, size = 15 }: BrandLoaderProps) {
  return (
    <p className="m-loader" role="status">
      <BrandMark size={size} loop />
      <span>{label}</span>
    </p>
  );
}
