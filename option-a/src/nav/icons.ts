import {
  Accessibility,
  Activity,
  Bell,
  Bug,
  ChartColumn,
  CircleHelp,
  ClipboardCheck,
  Database,
  FlaskConical,
  Gauge,
  Highlighter,
  History,
  House,
  LayoutDashboard,
  Languages,
  type LucideIcon,
  PlayCircle,
  Route,
  Search,
  Settings2,
  Shield,
  Type,
} from 'lucide-react';
import type { AgentIconName } from './agents.ts';

/** One glyph per agent, resolved in one place. The menu draws it in a 15px row
 *  and an unbuilt page draws it at 22px in the middle of the plane; two maps
 *  would let those disagree about what a Tests agent looks like. */
export const AGENT_ICONS: Record<AgentIconName, LucideIcon> = {
  bug: Bug,
  flask: FlaskConical,
  clipboard: ClipboardCheck,
  accessibility: Accessibility,
  gauge: Gauge,
  route: Route,
  type: Type,
  history: History,
  shield: Shield,
  search: Search,
  languages: Languages,
};

/** The destinations that are not agents. Keyed by `NavIconName` for the ones
 *  in the tree, plus the foot's own glyphs, which are named there. */
export const PAGE_ICONS: Record<string, LucideIcon> = {
  home: House,
  search: Search,
  sessions: PlayCircle,
  /* A highlight is a passage somebody marked, so the glyph is the marker
     rather than a star: a star means favourite, and Bookmarked is already a
     tab on Sessions. Two rows meaning "saved" in one column is the confusion
     worth avoiding here. */
  highlights: Highlighter,
  analytics: ChartColumn,
  dataManagement: Database,
  dashboards: LayoutDashboard,
  activity: Activity,
  preferences: Settings2,
  support: CircleHelp,
  notifications: Bell,
};
