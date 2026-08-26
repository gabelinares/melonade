export interface JiraIconProps {
  size?: number;
}

/**
 * The Jira mark, geometry taken byte-for-byte from the app this replaces:
 * `app/components/ui/Icons/integrations_jira.tsx`. Not redrawn, not traced, not
 * approximated - a brand mark that is nearly right is wrong, and there is a
 * standing rule in this codebase against building a lookalike when the real
 * thing is sitting in the repo.
 *
 * ONE thing was changed, and only because the destination changed. The shipped
 * icon is greyscaled (#777 to #999 across two gradients) because it sits in a
 * light integrations list. This one goes on a filled primary button, where a
 * mid-grey mark on plum is muddy at 15px. So the three fills are rebound to
 * `currentColor` at the three opacities the greyscale was expressing, which
 * keeps the mark's own internal light-and-shade and lets it read on any ground
 * the button takes. The paths are untouched.
 */
export function JiraIcon({ size = 14 }: JiraIconProps) {
  return (
    <svg viewBox="0 0 74 76" width={size} height={size} aria-hidden="true" focusable="false">
      <g fill="none">
        <path
          d="M72.4 35.76 39.8 3.16 36.64 0 12.1 24.54.88 35.76a3 3 0 0 0 0 4.24L23.3 62.42l13.34 13.34 24.54-24.54.38-.38L72.4 40a3 3 0 0 0 0-4.24ZM36.64 49.08l-11.2-11.2 11.2-11.2 11.2 11.2-11.2 11.2Z"
          fill="currentColor"
        />
        <path
          d="M36.64 26.68c-7.333-7.334-7.369-19.212-.08-26.59l-24.51 24.5 13.34 13.34 11.25-11.25Z"
          fill="currentColor"
          opacity="0.72"
        />
        <path
          d="M47.87 37.85 36.64 49.08a18.86 18.86 0 0 1 0 26.68l24.57-24.57-13.34-13.34Z"
          fill="currentColor"
          opacity="0.72"
        />
      </g>
    </svg>
  );
}
