/* ══════════════════════════════════════════════════════════════════════════
   THE ACCOUNT, AS DATA.

   The switcher at the top of the menu used to be a constant in SideNav and a
   control that did nothing when clicked. Mehdi, 2026-09-02: "nothing happens
   when clicking, think about that, it should be as simple as possible, but all
   the account feature should work with mock data."

   So: the organisation, its plan, and the projects in it. Switching is real -
   the menu holds which one is current and the tile redraws - and it is the
   whole feature, because a switcher's only job is to switch. There is no
   invite, no billing and no second organisation in here, since none of those
   exist anywhere else in this build and a menu row that opens nothing is worse
   than a control that did nothing to begin with.

   ⚠ The PAGES do not read this yet. Every list in the prototype is the same
   fixture whichever project is current, so this is honest about what it is: the
   switcher works, the data behind it is one set. When the pages take a project,
   they take it from here.
   ══════════════════════════════════════════════════════════════════════════ */

export interface ProjectEntry {
  key: string;
  /** A domain, which is why the open menu is 256px wide. */
  name: string;
}

export interface OrgEntry {
  name: string;
  /** What the badge draws. One letter, because two is a person's initials and
   *  the foot of the menu already has a pair of those. */
  initial: string;
  plan: string;
  projects: readonly ProjectEntry[];
}

export const ORG: OrgEntry = {
  name: 'Acme, Inc.',
  initial: 'A',
  plan: 'Team plan',
  projects: [
    { key: 'frontend', name: 'frontend.acme.com' },
    { key: 'app', name: 'app.acme.com' },
    { key: 'marketing', name: 'marketing.acme.com' },
    { key: 'docs', name: 'docs.acme.com' },
  ],
};

/** Where the menu starts. The first project, not a fourth constant to keep in
 *  agreement with the list. */
export const DEFAULT_PROJECT = ORG.projects[0]!.key;

export const projectName = (key: string) =>
  ORG.projects.find((p) => p.key === key)?.name ?? ORG.projects[0]!.name;
