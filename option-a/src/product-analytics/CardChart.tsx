import { useMemo } from 'react';
import type { Card } from '@shared/cards-data.ts';
import { funnelOf, heatOf, pathsOf, seriesOf, tableOf } from '@shared/analytics-logic.ts';
import { BarList, HeatGrid, LineChart, PathList } from '../components/MiniChart.tsx';

/** One card, drawn by its type. The dashboard widget and the builder's
 *  preview both call this, so a card looks the same in both places. */
export function CardChart({ card, height = 140 }: { card: Card; height?: number }) {
  const data = useMemo(() => {
    switch (card.type) {
      case 'timeseries': return { kind: 'line' as const, points: seriesOf(card) };
      case 'funnel': return { kind: 'funnel' as const, rows: funnelOf(card) };
      case 'table': return { kind: 'table' as const, rows: tableOf(card) };
      case 'heatmap': return { kind: 'heat' as const, heat: heatOf(card) };
      case 'pathAnalysis': return { kind: 'paths' as const, paths: pathsOf(card) };
    }
  }, [card]);
  switch (data.kind) {
    case 'line': return <LineChart points={data.points} height={height} />;
    case 'funnel': return <BarList rows={data.rows} funnel />;
    case 'table': return <BarList rows={data.rows} />;
    case 'heat': return <HeatGrid heat={data.heat} />;
    case 'paths': return <PathList paths={data.paths} />;
  }
}
