import wolfWatermark from '../assets/wolf-watermark.png';

interface WolfLogoProps {
  className?: string;
}

/** Wolf Casa wordmark logo. */
export function WolfLogo({ className = '' }: WolfLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src={wolfWatermark}
        alt=""
        aria-hidden="true"
        className="h-full w-auto max-w-[2.5rem] shrink-0 object-contain"
      />
      <span className="font-serif tracking-[0.3em] text-white uppercase" style={{ fontSize: '0.9em' }}>
        Wolf&nbsp;Casa
      </span>
    </div>
  );
}
