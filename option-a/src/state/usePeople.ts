/* The React binding over the people domain: a list, a search, and one open
 * row for the StubDrawer. */

import { useCallback, useMemo, useState } from 'react';
import { PEOPLE, INITIAL_PEOPLE_STATE, type Person, type PeopleState, filterPeople } from '@shared/people-data.ts';

export function usePeople() {
  const [people] = useState<Person[]>(() => [...PEOPLE]);
  const [state, setState] = useState<PeopleState>(INITIAL_PEOPLE_STATE);
  const [openId, setOpenId] = useState<string | null>(null);

  const patch = useCallback((fn: (s: PeopleState) => PeopleState) => setState(fn), []);

  const visible = useMemo(() => filterPeople(people, state), [people, state]);
  const open = people.find((p) => p.userId === openId) ?? null;

  return {
    people,
    visible,
    open,
    total: people.length,
    query: state.query,

    setQuery: (query: string) => patch((s) => ({ ...s, query })),

    openPerson: (userId: string) => setOpenId(userId),
    closePerson: () => setOpenId(null),
  };
}

export type PeopleController = ReturnType<typeof usePeople>;
