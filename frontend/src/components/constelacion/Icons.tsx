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
