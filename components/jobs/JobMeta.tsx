import { GraduationCap, Briefcase, Home, MapPin, Clock } from 'lucide-react';
import {
  experienceLabel,
  formatExpiry,
  jobTypeLabel,
  machineDate,
  workModeLabel,
} from '@/lib/jobs/format';

type Props = {
  lokasi?: string | null;
  jobType?: string | null;
  workMode?: string | null;
  experience?: string | null;
  education?: string | null;
  expiredAt?: string | null;
};

/**
 * Icon + label row for a vacancy card. Each item is omitted when the poster
 * left it blank, so a sparse posting stays readable instead of showing a
 * column of dashes.
 */
export default function JobMeta({
  lokasi,
  jobType,
  workMode,
  experience,
  education,
  expiredAt,
}: Props) {
  const items: { key: string; icon: React.ReactNode; text: string }[] = [];

  if (lokasi) {
    items.push({
      key: 'lokasi',
      icon: <MapPin className="h-4 w-4" aria-hidden="true" />,
      text: lokasi,
    });
  }

  const typeText = jobTypeLabel(jobType);
  if (typeText !== '-') {
    items.push({
      key: 'type',
      icon: <Briefcase className="h-4 w-4" aria-hidden="true" />,
      text: typeText,
    });
  }

  const modeText = workModeLabel(workMode);
  if (modeText !== '-') {
    items.push({
      key: 'mode',
      icon: <Home className="h-4 w-4" aria-hidden="true" />,
      text: modeText,
    });
  }

  const expText = experienceLabel(experience);
  if (expText !== '-') {
    items.push({
      key: 'exp',
      icon: <GraduationCap className="h-4 w-4" aria-hidden="true" />,
      text: expText,
    });
  }

  if (education) {
    items.push({
      key: 'edu',
      icon: <GraduationCap className="h-4 w-4" aria-hidden="true" />,
      text: education,
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-on-surface-variant">
      {items.map((item) => (
        <span key={item.key} className="flex items-center gap-1">
          {item.icon}
          {item.text}
        </span>
      ))}

      <span className="flex items-center gap-1">
        <Clock className="h-4 w-4" aria-hidden="true" />
        <time dateTime={machineDate(expiredAt)}>{formatExpiry(expiredAt)}</time>
      </span>
    </div>
  );
}
