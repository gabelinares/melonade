/* ═══════════════════════════════════════════════════════════════════════════
   DATA MANAGEMENT — FEATURES.

   ⚠ NOT a feature-flag catalogue. Production has no such page - grepped for
   one and found none. The sidebar item labelled "Features" in production's
   own nav points at `DataManagement/Tags`: from a session recording, someone
   tags a DOM element to watch it for adoption - does anyone use this button,
   this menu, this new field. This page ports THAT, under the label Gabriel's
   own tree.ts already committed to, so what "Features" means here is
   `production/Tags`, not a LaunchDarkly-style flag list. Worth one line in
   DESIGN.md so nobody re-derives the confusion.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface Feature {
  id: number;
  name: string;
  location: string | null;
  selector: string;
  users: number;
  interactions: number;
}

export const FEATURES: readonly Feature[] = [
  { id: 1, name: 'New checkout button', location: '/checkout', selector: 'button.checkout-cta', users: 8420, interactions: 15200 },
  { id: 2, name: 'Pricing toggle', location: '/pricing', selector: '.billing-toggle', users: 3110, interactions: 5890 },
  { id: 3, name: 'Onboarding skip link', location: '/onboarding/step-2', selector: 'a[data-action="skip"]', users: 1204, interactions: 1340 },
  { id: 4, name: 'AI summary panel', location: '/sessions/:id', selector: '.ai-summary-panel', users: 640, interactions: 2980 },
  { id: 5, name: 'Invite teammate modal', location: '/settings/team', selector: '.invite-modal button.primary', users: 512, interactions: 780 },
  { id: 6, name: 'Dark mode switch', location: null, selector: '[data-testid="theme-toggle"]', users: 2890, interactions: 3410 },
  { id: 7, name: 'Export report menu', location: '/audits/:id', selector: '.export-menu-trigger', users: 318, interactions: 402 },
  { id: 8, name: 'Segment save button', location: '/sessions', selector: 'button.save-segment', users: 190, interactions: 214 },
];

export interface FeaturesState {
  query: string;
}

export const INITIAL_FEATURES_STATE: FeaturesState = { query: '' };

export const matchesFeatureQuery = (f: Feature, query: string): boolean => {
  const q = query.trim().toLowerCase();
  return !q || f.name.toLowerCase().includes(q) || f.selector.toLowerCase().includes(q);
};

export function filterFeatures(features: readonly Feature[], state: FeaturesState): Feature[] {
  return features.filter((f) => matchesFeatureQuery(f, state.query));
}
