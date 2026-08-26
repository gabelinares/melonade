import { useEffect, useRef } from 'react';
import { Button, ScrollArea } from '@mantine/core';
import { Search } from 'lucide-react';
import { CAT_ORDER } from '@shared/issues-data.ts';
import { ActiveFilters } from '../components/ActiveFilters.tsx';
import { CapturePill } from '../components/CapturePill.tsx';
import { DisplayMenu } from '../components/DisplayMenu.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { FilterMenu } from '../components/FilterMenu.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { ListSkeleton } from '../components/ListSkeleton.tsx';
import { IssueRow } from './IssueRow.tsx';
import type { IssuesController } from '../state/useIssues.ts';
import './issue-list-column.css';

export interface IssueListColumnProps {
  model: IssuesController;
  onOpenCritical: (id: number) => void;
  onOpenSearch: () => void;
}

/**
 * The triage column: the queue, permanently on screen.
 *
 * Two structural decisions, unchanged by the filter rework:
 *
 * GROUPED, NOT SORTED BY DEFAULT. The rows sit under a sticky header per band. A
 * sortable table asks the reader to choose an order and then read a flat list; a
 * grouped list has already made the ordering decision and tells you where you are
 * in it while you scroll. The band is now a display CHOICE rather than a
 * hard-coded one, so grouping by category, or not at all, is one click away.
 *
 * NO PAGINATION. The column scrolls. Paging exists to keep a wide table from
 * running off a page, and there is no page here.
 *
 * The toolbar is two icons. It used to be a category strip plus one tall popover
 * holding every dimension stacked; stacking is not collapsing, and that popover
 * grew every time a filter was added.
 *
 * IT IS A TRIAGE INSTRUMENT AND IT ONLY EXISTS AT TRIAGE. The shell stops
 * rendering this column the moment a recording opens, so there is no compact
 * mode here and no narrowed copy of the queue beside a player. An issue and a
 * session inside it are two different things, and a list of the ten issues you
 * are NOT watching is the wrong thing to put next to the one you are. The rail
 * that takes its place is on the other side of the pane and is about the
 * session: see JourneyPanel. Everything here is back the instant you close the
 * session.
 */
export function IssueListColumn({ model, onOpenCritical, onOpenSearch }: IssueListColumnProps) {
  const { filters, counts } = model;
  const listRef = useRef<HTMLDivElement>(null);

  /* Keep the keyboard walk inside the viewport. Without this, J and K move the
     selection somewhere the reader cannot see, which makes the shortcut worse
     than not having one. */
  useEffect(() => {
    const el = listRef.current?.querySelector('[aria-current="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [model.selectedId]);

  return (
    <section className="b-list" aria-label="Issues">
      <header className="b-list__head">
        <div className="b-list__title-row">
          <h1 className="b-list__title">
            Issues
            <span className="b-list__count">{model.total}</span>
          </h1>
          <div className="b-list__controls">
            {/* Same component as the two menu triggers beside it. It used to be
                Mantine's ActionIcon at 34px next to two hand-rolled 28px buttons,
                which is three sizes in a group of three. */}
            <IconButton
              icon={<Search size={15} />}
              label="Search issues and agents (Cmd K)"
              onClick={onOpenSearch}
            />
            {/* Two controls, not one stacked popover. Filters narrow the set;
                display changes how it is drawn. */}
            <FilterMenu
              dimensions={model.dimensions}
              isActive={model.isFilterActive}
              onToggle={model.toggleValue}
              activeCount={model.activeFilterCount}
            />
            <DisplayMenu
              display={model.display}
              onSet={model.setDisplay}
              onToggleField={model.toggleField}
              onReset={model.resetDisplay}
              changeCount={model.displayChangeCount}
            />
            {/* What the agent COLLECTS, in the same toolbar as what this column
                shows. It had a wide pill on a row of its own reading "2
                segments ~8%", which is 40px of column height spent on a setting
                somebody touches once a month, and it read as a filter chip
                while being the opposite of one. Behind the glyph is the same
                panel it always had, and the count is on the badge. */}
            <CapturePill
              variant="icon"
              mode={model.captureMode}
              onModeChange={model.setCaptureMode}
              activeSegmentIds={model.activeSegmentIds}
              onToggleSegment={model.toggleSegment}
            />
          </div>
        </div>
      </header>

      {/* The category strip keeps its one click because it is the most common
          switch, but it is MULTI-select now, matching the filter menu that also
          offers it. Category was the one single-select dimension, which made it a
          radio in a menu of checkboxes and meant you could not ask for errors or
          slowness. "All" is not a fourth option, it is the empty selection. */}
      <div className="b-list__cats">
        <button
          type="button"
          aria-pressed={filters.cats.length === 0}
          className={`b-cat${filters.cats.length === 0 ? ' is-on' : ''}`}
          onClick={() => model.setFilter('cats', [])}
        >
          All<span className="b-cat__n">{counts.all}</span>
        </button>
        {CAT_ORDER.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={filters.cats.includes(c)}
            className={`b-cat${filters.cats.includes(c) ? ' is-on' : ''}`}
            onClick={() => model.toggleValue('cats', c)}
          >
            {c}<span className="b-cat__n">{model.categoryCount(c)}</span>
          </button>
        ))}
      </div>

      <ActiveFilters
        chips={model.activeFilters}
        onRemove={model.toggleValue}
        onClearAll={model.clearFilters}
        resultCount={model.total}
      />

      {model.dataState === 'loading' ? (
        <ListSkeleton />
      ) : model.groups.length === 0 ? (
        <EmptyReason model={model} />
      ) : (
        <ScrollArea className="b-list__scroll" viewportRef={listRef} type="hover">
          {model.groups.map((group) => (
            <div key={group.key}>
              {/* No grouping returns one unlabelled group, and an unlabelled
                  group draws no header rather than an empty one. */}
              {group.label && (
                <h2 className="b-list__group">
                  {group.label}
                  <span className="b-list__group-n">{group.issues.length}</span>
                </h2>
              )}
              {group.issues.map((issue) => (
                <IssueRow
                  key={issue.id}
                  issue={issue}
                  title={model.titleOf(issue)}
                  selected={model.selectedId === issue.id}
                  hidden={model.isHidden(issue.id)}
                  criticalState={model.criticalState(issue.id)}
                  matchedBy={model.matchedRules(issue.id).find((r) => !r.mine)?.createdBy}
                  fields={model.display.fields}
                  onSelect={() => model.select(issue.id)}
                  onOpenCritical={() => onOpenCritical(issue.id)}
                />
              ))}
            </div>
          ))}
          <p className="b-list__end">
            {model.total} issue{model.total === 1 ? '' : 's'} in this view
          </p>
        </ScrollArea>
      )}
    </section>
  );
}

function EmptyReason({ model }: { model: IssuesController }) {
  switch (model.emptyReason) {
    case 'filters':
      return (
        <EmptyState
          variant="inline"
          title="Nothing matches these filters"
          hint="Clear them to see the whole queue again."
          action={
            <Button variant="default" size="xs" onClick={model.clearFilters}>
              Clear filters
            </Button>
          }
        />
      );
    case 'mine':
      return (
        <EmptyState
          variant="inline"
          title="Nothing is critical to you yet"
          hint="Describe what matters to you on any issue, and everything like it lands here from then on."
        />
      );
    default:
      return (
        <EmptyState
          variant="inline"
          title="No issues found yet"
          hint="The agent is reading this project's sessions. The first finding usually lands within a day."
        />
      );
  }
}
