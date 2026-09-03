import {
  Accessibility,
  Activity,
  Bell,
  Bot,
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
  Video,
  LayoutDashboard,
  Languages,
  type LucideIcon,
  PlayCircle,
  Route,
  ScreenShare,
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
  /* ⚠ SIX GLYPHS FOR SIX ROWS, and after 09-04 that is the whole menu column -
     every other destination is a subitem and subitems carry no icon (tree.ts
     says why). So these six are doing more work than eleven were: they are the
     only marks in the rail when it is narrow, and the only thing distinguishing
     six closed parents when it is wide. */
  recordings: PlayCircle,
  agents: Bot,
  /* Co-browsing is two people on one screen, which is what this glyph is. */
  cobrowse: ScreenShare,
  /* Spot records a clip and sends it; the recorder, not another play button -
     Recordings already owns the triangle and two of those in one column would
     read as the same thing twice. */
  spot: Video,
  analytics: ChartColumn,
  dataManagement: Database,
  /* Still mapped though no row uses them: Placeholder resolves a destination's
     glyph through this map, and these are subitem keys that open real pages. */
  dashboards: LayoutDashboard,
  activity: Activity,
  highlights: Highlighter,
  sessions: PlayCircle,
  preferences: Settings2,
  support: CircleHelp,
  notifications: Bell,
};
