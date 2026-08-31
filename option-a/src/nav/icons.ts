import {
  Accessibility,
  Bell,
  Bug,
  CircleHelp,
  ClipboardCheck,
  FlaskConical,
  Gauge,
  History,
  House,
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

/** The destinations that are not agents. */
export const PAGE_ICONS: Record<string, LucideIcon> = {
  home: House,
  sessions: PlayCircle,
  preferences: Settings2,
  support: CircleHelp,
  notifications: Bell,
  search: Search,
};
