/* The React binding over the people domain: a list, a search, and one open
 * row for the StubDrawer. */

import { useCallback, useMemo, useState } from 'react';
import { PEOPLE, INITIAL_PEOPLE_STATE, type Person, type PeopleState, filterPeople } from '@shared/people-data.ts';
import type { ActivityEvent } from '@shared/activity-data.ts';
import type { SessionRow } from '@shared/sessions-data.ts';
import { withinRange, type DateRangeValue } from '@shared/date-range.ts';
import { personEvents, personPropertiesOf, type PersonProperty } from '@shared/data-management-logic.ts';

export function usePeople() {
  const [people, setPeople] = useState<Person[]>(() => [...PEOPLE]);
  const [state, setState] = useState<PeopleState>(INITIAL_PEOPLE_STATE);
  const [openId, setOpenId] = useState<string | null>(null);

  const patch = useCallback((fn: (s: PeopleState) => PeopleState) => setState(fn), []);

  const visible = useMemo(() => filterPeople(people, state), [people, state]);
  const open = people.find((p) => p.userId === openId) ?? null;

  /* ── THE PERSON PAGE'S OWN STATE (2026-09-14) ─────────────────────────────
     Production's UserPage holds: a date window over the timeline (default the
     last 7 days), a set of hidden event types, the event you clicked into, the
     sessions drawer, the properties drawer, and property edits. All of it is
     per-person and resets when you open someone else. */
  const [range, setRange] = useState<DateRangeValue>({ preset: '7d' });
  const [hiddenTypes, setHiddenTypes] = useState<string[]>([]);
  const [openEvent, setOpenEvent] = useState<ActivityEvent | null>(null);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [propsOpen, setPropsOpen] = useState(false);
  const [watching, setWatching] = useState<SessionRow | null>(null);
  const [propertyEdits, setPropertyEdits] = useState<Record<string, Record<string, string>>>({});

  const allEvents = useMemo(() => (open ? personEvents(open) : []), [open]);
  const eventTypes = useMemo(() => Array.from(new Set(allEvents.map((e) => e.eventName))).sort(), [allEvents]);
  const timeline = useMemo(
    () => allEvents.filter((e) => withinRange(e.at, range) && !hiddenTypes.includes(e.eventName)),
    [allEvents, range, hiddenTypes],
  );
  const properties: PersonProperty[] = useMemo(() => {
    if (!open) return [];
    const edits = propertyEdits[open.userId] ?? {};
    return personPropertiesOf(open).map((p) => (p.name in edits ? { ...p, value: edits[p.name]! } : p));
  }, [open, propertyEdits]);

  const openPerson = (userId: string) => {
    setOpenId(userId);
    setRange({ preset: '7d' });
    setHiddenTypes([]);
    setOpenEvent(null);
    setSessionsOpen(false);
    setPropsOpen(false);
    setWatching(null);
  };

  return {
    people,
    visible,
    open,
    total: people.length,
    query: state.query,

    setQuery: (query: string) => patch((s) => ({ ...s, query })),

    openPerson,
    closePerson: () => setOpenId(null),
    removePerson: (userId: string) => {
      setPeople((all) => all.filter((p) => p.userId !== userId));
      setOpenId(null);
    },

    range,
    setRange,
    eventTypes,
    hiddenTypes,
    toggleType: (name: string) =>
      setHiddenTypes((h) => (h.includes(name) ? h.filter((x) => x !== name) : [...h, name])),
    showAllTypes: () => setHiddenTypes([]),
    timeline,
    totalEvents: allEvents.length,

    openEvent,
    openTimelineEvent: (e: ActivityEvent) => setOpenEvent(e),
    closeTimelineEvent: () => setOpenEvent(null),

    sessionsOpen,
    setSessionsOpen,
    watching,
    watch: (s: SessionRow) => {
      setSessionsOpen(false);
      setOpenEvent(null);
      setWatching(s);
    },
    closeSession: () => setWatching(null),

    propsOpen,
    setPropsOpen,
    properties,
    setProperty: (name: string, value: string) => {
      if (!open) return;
      setPropertyEdits((all) => ({ ...all, [open.userId]: { ...(all[open.userId] ?? {}), [name]: value } }));
    },
  };
}

export type PeopleController = ReturnType<typeof usePeople>;
