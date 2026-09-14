/* The React binding over the properties domain: two scopes sharing one list,
 * a search, a show-hidden toggle, and one open row for the StubDrawer. */

import { useCallback, useMemo, useState } from 'react';
import {
  PROPERTIES,
  INITIAL_PROPERTIES_STATE,
  type Property,
  type PropertyScope,
  type PropertiesState,
  filterProperties,
} from '@shared/properties-data.ts';

export function useProperties() {
  const [properties, setProperties] = useState<Property[]>(() => [...PROPERTIES]);
  const [state, setState] = useState<PropertiesState>(INITIAL_PROPERTIES_STATE);
  const [openId, setOpenId] = useState<string | null>(null);

  const patch = useCallback((fn: (s: PropertiesState) => PropertiesState) => setState(fn), []);

  const visible = useMemo(() => filterProperties(properties, state), [properties, state]);
  const open = properties.find((p) => p.id === openId) ?? null;

  return {
    properties,
    visible,
    open,
    scope: state.scope,
    query: state.query,
    showHidden: state.showHidden,

    setScope: (scope: PropertyScope) => patch((s) => ({ ...s, scope })),
    setQuery: (query: string) => patch((s) => ({ ...s, query })),
    setShowHidden: (showHidden: boolean) => patch((s) => ({ ...s, showHidden })),

    openProperty: (id: string) => setOpenId(id),
    /* Reached from another page - an event's property list - by name and
       scope, which is how production's `?view=events&property=` link works. */
    openByName: (scope: PropertyScope, name: string) => {
      const hit = properties.find((p) => p.scope === scope && p.name === name);
      if (!hit) return false;
      patch((s) => ({ ...s, scope }));
      setOpenId(hit.id);
      return true;
    },
    closeProperty: () => setOpenId(null),
    updateProperty: (id: string, patchP: Partial<Pick<Property, 'displayName' | 'description' | 'hidden'>>) =>
      setProperties((all) => all.map((p) => (p.id === id ? { ...p, ...patchP } : p))),
  };
}

export type PropertiesController = ReturnType<typeof useProperties>;
