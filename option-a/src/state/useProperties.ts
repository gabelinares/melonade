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
  const [properties] = useState<Property[]>(() => [...PROPERTIES]);
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
    closeProperty: () => setOpenId(null),
  };
}

export type PropertiesController = ReturnType<typeof useProperties>;
