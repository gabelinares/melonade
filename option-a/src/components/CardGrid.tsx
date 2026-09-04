import type { ReactNode } from 'react';
import './card-grid.css';

export interface CardGridProps {
  children: ReactNode;
}

/**
 * A responsive grid of cards, for the one list in the app whose content is a
 * thumbnail rather than a row of text - Spot. Every other list here is a
 * `Table`; this exists because a video's thumbnail is the scannable fact and
 * a table row cannot hold one without becoming its own layout problem.
 */
export function CardGrid({ children }: CardGridProps) {
  return <div className="m-cgrid">{children}</div>;
}
