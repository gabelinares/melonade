/* The React binding over the features (production: Tags) domain: a list, a
 * search, and one open row for the edit-form StubDrawer. */

import { useCallback, useMemo, useState } from 'react';
import {
  FEATURES,
  INITIAL_FEATURES_STATE,
  type Feature,
  type FeaturesState,
  filterFeatures,
} from '@shared/features-data.ts';

export function useFeatures() {
  const [features, setFeatures] = useState<Feature[]>(() => [...FEATURES]);
  const [state, setState] = useState<FeaturesState>(INITIAL_FEATURES_STATE);
  const [openId, setOpenId] = useState<number | null>(null);

  const patch = useCallback((fn: (s: FeaturesState) => FeaturesState) => setState(fn), []);

  const visible = useMemo(() => filterFeatures(features, state), [features, state]);
  const open = features.find((f) => f.id === openId) ?? null;

  return {
    features,
    visible,
    open,
    total: features.length,
    query: state.query,

    setQuery: (query: string) => patch((s) => ({ ...s, query })),

    openFeature: (id: number) => setOpenId(id),
    closeFeature: () => setOpenId(null),
    updateFeature: (id: number, patchF: Pick<Feature, 'name' | 'location'>) =>
      setFeatures((all) => all.map((f) => (f.id === id ? { ...f, ...patchF } : f))),
    removeFeature: (id: number) => {
      setFeatures((all) => all.filter((f) => f.id !== id));
      setOpenId((cur) => (cur === id ? null : cur));
    },
  };
}

export type FeaturesController = ReturnType<typeof useFeatures>;
