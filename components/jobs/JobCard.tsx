import Link from 'next/link';
import { Star, Building2 } from 'lucide-react';
import { JOB_CARD_SKILL_LIMIT } from '@/lib/constants';
import { isExpired, machineDate } from '@/lib/jobs/format';
import { timeAgo } from '@/lib/utils';
import type { JobPostingRow } from '@/lib/types';
import JobMeta from './JobMeta';
import JobStatusBadge from './JobStatusBadge';
import SalaryRange from './SalaryRange';

export type JobCardJob = JobPostingRow & {
  alumni: { nama: string } | null;
};

type Props = {
  job: JobCardJob;
  /** Currently selected skill filter, for chip highlighting. */
  activeSkill?: string | null;
  /** Builds a filter link for a skill chip. */
  skillHref?: (skill: string) => string;
  /** Renders the status badge (the public list hides it; author/admin views show it). */
  showStatus?: boolean;
  now?: number;
};

/**
 * Vacancy card. Anatomy is fixed (title → company → meta → salary → skills →
 * actions) so a column of cards can be scanned vertically without re-learning
 * the layout on each row.
 */
export default function JobCard({
  job,
  activeSkill,
  skillHref,
  showStatus = false,
  now,
}: Props) {
  const skills = job.skill_required ?? [];
  const visible = skills.slice(0, JOB_CARD_SKILL_LIMIT);
  const overflow = skills.length - visible.length;
  const expired = isExpired(job.expired_at, now);

  return (
    <article className="card-accent" data-testid="job-card">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-montserrat text-lg font-bold text-on-surface">
            <Link
              href={`/lowongan/${job.id}`}
              className="hover:text-primary-container hover:underline"
            >
              {job.judul}
            </Link>
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
            <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{job.perusahaan}</span>
            {job.alumni?.nama && <span className="chip">oleh {job.alumni.nama}</span>}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {job.is_featured && (
            <span className="badge-featured" data-testid="job-featured">
              <Star className="h-3 w-3" aria-hidden="true" />
              Unggulan
            </span>
          )}
          {showStatus && <JobStatusBadge status={job.status} expired={expired} />}
          {job.created_at && (
            <time
              dateTime={machineDate(job.created_at)}
              className="text-xs text-on-surface-variant"
            >
              {timeAgo(job.created_at)}
            </time>
          )}
        </div>
      </div>

      <div className="mb-3">
        <JobMeta
          lokasi={job.lokasi}
          jobType={job.job_type}
          workMode={job.work_mode}
          experience={job.experience}
          education={job.education}
          expiredAt={job.expired_at}
        />
      </div>

      <div className="mb-3">
        <SalaryRange
          min={job.salary_min}
          max={job.salary_max}
          period={job.salary_period}
        />
      </div>

      {skills.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {visible.map((s) =>
            skillHref ? (
              <Link
                key={s}
                href={skillHref(s)}
                className={activeSkill === s ? 'chip-active' : 'chip'}
                aria-current={activeSkill === s ? 'true' : undefined}
              >
                {s}
              </Link>
            ) : (
              <span key={s} className="chip">
                {s}
              </span>
            )
          )}
          {overflow > 0 && (
            <span className="chip" title={skills.join(', ')}>
              +{overflow}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-outline-variant pt-3">
        <Link
          href={`/lowongan/${job.id}`}
          className="text-sm font-medium text-primary-container hover:underline"
        >
          Lihat Detail
        </Link>
        <Link href={`/referral/baru?job=${job.id}`} className="btn-tertiary">
          Minta Referral
        </Link>
      </div>
    </article>
  );
}
