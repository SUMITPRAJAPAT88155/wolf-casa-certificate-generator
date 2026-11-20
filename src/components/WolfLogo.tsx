import { useId } from 'react';

interface WolfLogoProps {
  className?: string;
}

interface WolfIconProps {
  className?: string;
  metallic?: boolean;
}

export function WolfIcon({ className = '', metallic = false }: WolfIconProps) {
  const gradientId = `wolf-gold-${useId().replace(/:/g, '')}`;
  const stroke = metallic ? `url(#${gradientId})` : 'currentColor';

  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      {metallic && (
        <defs>
          <linearGradient id={gradientId} x1="8" y1="8" x2="40" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff2c2" />
            <stop offset=".48" stopColor="#d2ad55" />
            <stop offset="1" stopColor="#8e6d2d" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M6 14l8 6 10-8 10 8 8-6-4 20c-1 5-5 9-14 9s-13-4-14-9L6 14z"
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="18" cy="24" r="1.8" fill={stroke} />
      <circle cx="30" cy="24" r="1.8" fill={stroke} />
      <path
        d="M21 31c1 1.2 4.9 1.2 6 0"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Wolf Casa wordmark logo, monochrome white. */
export function WolfLogo({ className = '' }: WolfLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <WolfIcon className="h-full w-auto text-white" />
      <span className="font-serif tracking-[0.3em] text-white uppercase" style={{ fontSize: '0.9em' }}>
        Wolf&nbsp;Casa
      </span>
    </div>
  );
}
