import { formatSalaryRange, hasSalary } from '@/lib/jobs/format';
import type { SalaryPeriod } from '@/lib/constants';

type Props = {
  min?: number | null;
  max?: number | null;
  period?: SalaryPeriod | null;
};

/**
 * Salary display. Falls back to "Negosiasi" when nothing is disclosed so the
 * card keeps a stable shape regardless of what the poster supplied.
 */
export default function SalaryRange({ min, max, period }: Props) {
  const disclosed = hasSalary(min, max);
  return (
    <span
      className={disclosed ? 'salary-range' : 'meta-line'}
      data-testid="salary-range"
      data-disclosed={disclosed ? 'true' : 'false'}
    >
      {formatSalaryRange(min, max, period ?? 'monthly')}
    </span>
  );
}
