/**
 * Iconos de línea del sistema Constelación.
 * Heredan el color con `currentColor` y se dimensionan por `className`.
 */

interface IconProps {
  className?: string;
}

export const CalendarIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
    <rect x="2.2" y="3.4" width="11.6" height="10.2" rx="2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M2.2 6.4h11.6M5.4 2.2v2.4M10.6 2.2v2.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const VideoIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
    <rect x="1.6" y="3.4" width="9" height="9.2" rx="2.2" stroke="currentColor" strokeWidth="1.3" />
    <path d="m10.6 7 3-1.8v5.6l-3-1.8V7Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);

export const CloseIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
    <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const ArrowIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CheckIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
    <path d="m3.5 8.4 3 3 6-6.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ClockIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M8 4.6V8l2.2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const InfoIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M8 7.2v4M8 4.8v.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const SearchIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
    <circle cx="7" cy="7" r="4.6" stroke="currentColor" strokeWidth="1.3" />
    <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const ChevronRightIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
    <path d="m6 3.5 4.5 4.5L6 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const LayersIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
    <path d="m8 2.2 5.4 2.9L8 8 2.6 5.1 8 2.2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="m2.6 8 5.4 2.9L13.4 8M2.6 10.9 8 13.8l5.4-2.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const UserIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
    <circle cx="8" cy="5.2" r="2.7" stroke="currentColor" strokeWidth="1.3" />
    <path d="M2.8 13.4c.5-2.4 2.5-3.9 5.2-3.9s4.7 1.5 5.2 3.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const UsersIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
    <circle cx="6" cy="5.4" r="2.4" stroke="currentColor" strokeWidth="1.3" />
    <path d="M1.8 13.2c.4-2.1 2.1-3.4 4.2-3.4s3.8 1.3 4.2 3.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M10.6 3.4a2.2 2.2 0 0 1 0 4.3M11.6 9.9c1.5.2 2.6 1.3 3 2.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const HistoryIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
    <path d="M2.6 8a5.4 5.4 0 1 0 1.6-3.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M2.2 2.6v3.2h3.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 5.2V8l2 1.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ListIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
    <path d="M6 4.2h7.2M6 8h7.2M6 11.8h7.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="3" cy="4.2" r="0.9" fill="currentColor" />
    <circle cx="3" cy="8" r="0.9" fill="currentColor" />
    <circle cx="3" cy="11.8" r="0.9" fill="currentColor" />
  </svg>
);

export const EyeIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
    <path d="M1.6 8s2.4-4.6 6.4-4.6S14.4 8 14.4 8s-2.4 4.6-6.4 4.6S1.6 8 1.6 8Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

export const EyeOffIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
    <path d="M6.3 3.6A6.6 6.6 0 0 1 8 3.4c4 0 6.4 4.6 6.4 4.6a11 11 0 0 1-1.8 2.3M4.1 4.9C2.5 6 1.6 8 1.6 8s2.4 4.6 6.4 4.6c1.2 0 2.2-.4 3.1-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6.6 6.6a2 2 0 0 0 2.8 2.8M2.4 2.4l11.2 11.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);
