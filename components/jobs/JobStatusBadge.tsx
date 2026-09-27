import { JOB_STATUS_LABELS, type JobStatus } from '@/lib/constants';

type Props = {
  status: JobStatus | null | undefined;
  /** Optional expiry override — an expired-but-active post reads "Berakhir". */
  expired?: boolean;
};

const STATUS_CLASS: Record<JobStatus, string> = {
  pending: 'badge-pending',
  active: 'badge-active',
  hidden: 'badge-hidden',
  rejected: 'badge-rejected',
};

/**
 * Status is conveyed by TEXT first, colour second — colour alone would fail
 * WCAG 1.4.1. An expired active post is visually distinct from a live one.
 */
export default function JobStatusBadge({ status, expired = false }: Props) {
  if (expired && status === 'active') {
    return <span className="badge-hidden">Berakhir</span>;
  }

  const key: JobStatus = status && status in STATUS_CLASS ? status : 'hidden';
  return (
    <span className={STATUS_CLASS[key]} data-testid="job-status-badge" data-status={key}>
      {JOB_STATUS_LABELS[key]}
    </span>
  );
}
