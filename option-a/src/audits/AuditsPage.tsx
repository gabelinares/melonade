import { App, Button, Dropdown, Table, Tooltip } from 'antd';
import type { TableColumnsType } from 'antd';
import { BookOpen, FileText, MoreHorizontal, Plus, Presentation, Settings2, Trash2 } from 'lucide-react';
import { type Audit, type AuditTab, samplePercent } from '@shared/audits-data.ts';
import type { DataState } from '@shared/issues-logic.ts';
import { minutesSince } from '@shared/tests-data.ts';
import type { AuditsController } from '../state/useAudits.ts';
import { Chip } from '../components/Chip.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { FilterStrip } from '../components/FilterStrip.tsx';
import { HealthScore } from '../components/HealthScore.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { PageCard } from '../components/PageCard.tsx';
import { ProgressBar } from '../components/ProgressBar.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import { SearchField } from '../components/SearchField.tsx';
import { SkeletonRows } from '../components/SkeletonRows.tsx';
import { StubDrawer } from '../components/StubDrawer.tsx';
import './audits-page.css';

export interface AuditsPageProps {
  model: AuditsController;
  dataState: DataState;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE AUDITS LIST, and the shortest page in the app on purpose.
 *
 * An audit is a JOB, not a finding: the agent reads a sample of sessions in a
 * scope you set and produces a consulting-style report you present or export.
 * The report is the product, so this page has one job - tell you which audits
 * exist, which are still working, and how each one came out - and it should not
 * grow a workflow around a thing whose whole workflow is "start it and wait".
 *
 * Which is why there is no filter menu here and no display menu. Three tabs and
 * a search is not a smaller version of the tests toolbar; it is the whole
 * toolbar this page needs, and adding the others to look consistent would be
 * adding controls that filter nothing.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function AuditsPage({ model, dataState }: AuditsPageProps) {
  const { message } = App.useApp();

  /* Exports leave by email rather than downloading, because a slide deck built
     from a 2,000-session sample is not ready the moment you ask for it. */
  const download = (kind: 'PDF' | 'slides') =>
    message.success(`Export started — the ${kind} will be emailed to you.`);

  const openReport = (a: Audit) => {
    if (a.status !== 'ready') {
      message.info('This audit is still reading sessions — the report opens when it is ready.');
      return;
    }
    model.openAudit(a.id);
  };

  const columns: TableColumnsType<Audit> = [
    {
      title: 'Audit',
      key: 'name',
      /* PERCENTAGES, NOT PIXELS, on this table alone. Three rows and seven
         columns on a 1450px plane leaves ~800px of slack, and antd gives all of
         it to the one column without a width - so the name sat alone at the far
         left and four numbers crowded the right edge with a corridor of white
         between them. Percentages share the slack out, so the columns keep
         their proportions at every plane width and the eye never crosses an
         empty half-table to read a row. */
      width: '30%',
      render: (_: unknown, a) => (
        <div className="m-audits__name-cell">
          <span className="m-audits__name m-truncate">{a.name}</span>
          {/* The scope belongs under the name and not in a column of its own:
              it is what the name MEANS - two audits called "July" over
              different traffic are two different documents. */}
          <span className="m-audits__scope m-truncate">{a.scope.join(' · ')}</span>
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: '16%',
      render: (_: unknown, a) =>
        a.status === 'running' ? (
          <ProgressBar value={a.progress} label={`${a.name} is still running`} />
        ) : (
          <Chip kind="status">Ready</Chip>
        ),
    },
    {
      title: 'Health',
      key: 'health',
      width: '11%',
      render: (_: unknown, a) =>
        a.healthScore != null ? <HealthScore score={a.healthScore} /> : <span className="m-audits__none">—</span>,
    },
    {
      title: 'Sample',
      key: 'sample',
      width: '11%',
      render: (_: unknown, a) => (
        <Tooltip
          title={`${a.sampleSize.toLocaleString()} of ${a.matched.toLocaleString()} matched sessions`}
          mouseEnterDelay={0.2}
        >
          {/* A share, not a pair of numbers: nobody should have to work out
              that 1,000 of 5,320 is a fifth. The pair stays on hover. */}
          <span className="m-audits__sample">~{samplePercent(a)}%</span>
        </Tooltip>
      ),
    },
    {
      title: 'Created',
      key: 'created',
      width: '16%',
      render: (_: unknown, a) => (
        <span className="m-audits__by">
          <span className="m-truncate">{a.createdBy}</span>
          <span className="m-audits__dot" aria-hidden="true">·</span>
          <RelativeTime minutesAgo={minutesSince(a.createdAt)} />
        </span>
      ),
    },
    {
      title: 'Artifacts',
      key: 'artifacts',
      width: '11%',
      render: (_: unknown, a) => (
        <div className="m-audits__artifacts" onClick={(e) => e.stopPropagation()}>
          {/* Both exports are here on every row, disabled while the job runs,
              rather than appearing when it finishes: a control that materialises
              is a control nobody knew to wait for. */}
          <Tooltip title={a.status === 'ready' ? 'Download the PDF' : 'Ready when the audit is'}>
            <span>
              <Button
                type="text"
                size="small"
                disabled={a.status !== 'ready'}
                aria-label="Download the PDF"
                icon={<FileText size={14} />}
                onClick={() => download('PDF')}
              />
            </span>
          </Tooltip>
          <Tooltip title={a.status === 'ready' ? 'Download the slides' : 'Ready when the audit is'}>
            <span>
              <Button
                type="text"
                size="small"
                disabled={a.status !== 'ready'}
                aria-label="Download the slides"
                icon={<Presentation size={14} />}
                onClick={() => download('slides')}
              />
            </span>
          </Tooltip>
        </div>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: '5%',
      align: 'right',
      render: (_: unknown, a) =>
        /* Somebody else's audit is readable, not disposable. No menu at all
           beats a menu holding one greyed-out item. */
        a.mine ? (
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              items: [{ key: 'delete', icon: <Trash2 size={13} />, label: 'Delete', danger: true }],
              onClick: ({ domEvent }) => {
                domEvent.stopPropagation();
                model.remove(a.id);
              },
            }}
          >
            <Button
              type="text"
              size="small"
              aria-label={`Actions for ${a.name}`}
              icon={<MoreHorizontal size={15} />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        ) : null,
    },
  ];

  const firstRun = (
    <EmptyState
      title="No audits yet"
      hint="An audit reads a sample of your sessions for behavioural friction — hesitation, repeated actions, abandoned steps — and writes it up as a report you can present."
      action={
        <Button icon={<Plus size={14} />} onClick={() => message.info('Scoping an audit is the next piece.')}>
          New audit
        </Button>
      }
    />
  );

  const empty =
    model.query || model.tab !== 'all' ? (
      <EmptyState
        title={model.query ? 'No audits match your search' : `No audits are ${model.tab}`}
        hint="Clear the search, or pick another tab."
        action={
          <Button
            onClick={() => {
              model.setQuery('');
              model.setTab('all');
            }}
          >
            Show all audits
          </Button>
        }
      />
    ) : (
      firstRun
    );

  return (
    <PageCard
      title="Audits"
      subtitle="A read of a slice of your traffic for behavioural friction, written up as a report you can present."
      actions={
        <>
          <SearchField placeholder="Search audits" value={model.query} onChange={model.setQuery} />
          <Button
            type="primary"
            size="small"
            icon={<Plus size={14} />}
            onClick={() => message.info('Scoping an audit is the next piece.')}
          >
            New audit
          </Button>
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              items: [
                { key: 'settings', icon: <Settings2 size={13} />, label: 'Audits settings' },
                { key: 'docs', icon: <BookOpen size={13} />, label: 'Documentation' },
              ],
            }}
          >
            <IconButton icon={<MoreHorizontal size={15} />} label="More" variant="ghost" />
          </Dropdown>
        </>
      }
      toolbar={
        <FilterStrip
          label="Filter by status"
          items={model.counts.map((c) => ({ key: c.key, label: c.label, count: c.count }))}
          selected={[model.tab]}
          onSelect={(key) => model.setTab(key as AuditTab)}
        />
      }
    >
      {dataState === 'loading' ? (
        <SkeletonRows rows={4} columns={[38, 16, 8, 8, 16, 10]} />
      ) : dataState === 'empty' ? (
        firstRun
      ) : model.visible.length === 0 ? (
        empty
      ) : (
        <>
          <Table<Audit>
            className="m-audits__table"
            rowKey="id"
            columns={columns}
            dataSource={model.visible}
            pagination={false}
            rowClassName="m-audits__row"
            onRow={(a) => ({
              onClick: (e) => {
                const el = e.target as HTMLElement;
                if (el.closest('button') || el.closest('.ant-dropdown')) return;
                openReport(a);
              },
            })}
          />
          <footer className="m-audits__foot">
            <span className="m-audits__range">
              {model.visible.length} {model.visible.length === 1 ? 'audit' : 'audits'}
            </span>
          </footer>
        </>
      )}

      <StubDrawer
        open={model.open != null}
        onClose={model.closeAudit}
        title={model.open?.name ?? ''}
        meta={
          model.open && (
            <>
              {model.open.healthScore != null && <HealthScore score={model.open.healthScore} />}
              <span>{model.open.scope.join(' · ')}</span>
              <span>~{samplePercent(model.open)}% of matched sessions read</span>
            </>
          )
        }
        note="The report itself — the cover, the health breakdown, the findings and the sessions behind each one — is a full screen rather than a panel, and it is the next piece. This round is the shelf: which audits exist, which are still reading, and how each one came out."
      />
    </PageCard>
  );
}
