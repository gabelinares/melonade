import { useCallback, useMemo, useState } from 'react';
import {
  addManyToRules,
  addPropertyInRules,
  addToRules,
  moveEventInRules,
  removeFromRules,
  removePropertyInRules,
  replaceInRules,
  splitFilters,
  togglePropertyOrderInRules,
  updateInRules,
  updatePropertyInRules,
  type CatalogueEntry,
  type EventsOrder,
  type SearchFilter,
} from '@shared/sessions-logic.ts';

/**
 * ════════════════════════════════════════════════════════════════════════════
 * A LIST OF FILTER ROWS YOU CAN EDIT, kept somewhere other than the page.
 *
 * The segment drawer edits a search. The sessions page edits a search. They are
 * the same thing — Mehdi, 2026-09-02: *"remember, the segment is just one saved
 * search so the design should be really consistent"* — and the way to make that
 * true in the build rather than only in the drawing is for both to run the same
 * verbs over the same shape and hand the same props to the same component.
 *
 * So the verbs are pure transforms in `shared/sessions-logic.ts`, `useSessions`
 * binds them to the live search, and this binds them to a draft. What comes out
 * of here is exactly `SearchCard`'s props, which is the point: the drawer does
 * not get a smaller editor, it gets the editor.
 *
 * ⚠ IT IS A DRAFT. Nothing here touches the saved segment until the drawer's
 * Save is pressed. Editing a segment's rules and watching the list behind the
 * drawer change under you would be a preview nobody asked for, and there would
 * be no way to back out of it.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function useFilterDraft(initial: { filters: readonly SearchFilter[]; eventsOrder: EventsOrder }) {
  const [rules, setRules] = useState<SearchFilter[]>(() => initial.filters.map((f) => ({ ...f })));
  const [eventsOrder, setEventsOrder] = useState<EventsOrder>(initial.eventsOrder);

  const on = useCallback((fn: (r: readonly SearchFilter[]) => SearchFilter[]) => setRules((r) => fn(r)), []);

  const { events, properties } = useMemo(() => splitFilters(rules), [rules]);

  return {
    rules,
    events,
    properties,
    eventsOrder,
    /* The same names SearchCard takes, so the two callers of it read
       identically at the callsite. */
    onAdd: useCallback((e: CatalogueEntry) => on((r) => addToRules(r, e)), [on]),
    onAddMany: useCallback((rows: SearchFilter[]) => on((r) => addManyToRules(r, rows)), [on]),
    onUpdate: useCallback((k: string, p: Partial<SearchFilter>) => on((r) => updateInRules(r, k, p)), [on]),
    onReplace: useCallback((k: string, e: CatalogueEntry) => on((r) => replaceInRules(r, k, e)), [on]),
    onRemove: useCallback((k: string) => on((r) => removeFromRules(r, k)), [on]),
    onMoveEvent: useCallback((from: number, to: number) => on((r) => moveEventInRules(r, from, to)), [on]),
    onAddProperty: useCallback(
      (ek: string, e: CatalogueEntry) => on((r) => addPropertyInRules(r, ek, e)),
      [on],
    ),
    onUpdateProperty: useCallback(
      (ek: string, pk: string, p: Partial<SearchFilter>) => on((r) => updatePropertyInRules(r, ek, pk, p)),
      [on],
    ),
    onRemoveProperty: useCallback(
      (ek: string, pk: string) => on((r) => removePropertyInRules(r, ek, pk)),
      [on],
    ),
    onTogglePropertyOrder: useCallback((ek: string) => on((r) => togglePropertyOrderInRules(r, ek)), [on]),
    onEventsOrder: setEventsOrder,
    onClear: useCallback(() => setRules([]), []),
  };
}

export type FilterDraft = ReturnType<typeof useFilterDraft>;
