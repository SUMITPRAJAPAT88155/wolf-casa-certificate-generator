import { useLayoutEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { WolfIcon } from '@/components/WolfLogo';
import wolfCasaEmblem from '@/assets/wolf-casa-gold-emblem.png';
import type { CertificateData } from '@/lib/types';
import { buildVerificationUrl } from '@/lib/verification';

const CERTIFICATE_WIDTH = 1122;

function formatDisplay(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value + (value.length === 10 ? 'T00:00:00' : ''));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatCourseDates(startDate?: string | null, completionDate?: string | null): string {
  const start = formatDisplay(startDate);
  const completion = formatDisplay(completionDate);
  if (start && completion) return `${start} – ${completion}`;
  return start || completion || '—';
}

function formatCourseName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/(^|[\s-])(\p{L})/gu, (_match, separator: string, letter: string) => `${separator}${letter.toLocaleUpperCase()}`);
}

function fitFontSize(value: string, maximum: number, minimum: number, maxWidth: number): number {
  const estimatedWidth = Math.max(value.length * 0.72, 1);
  return Math.max(minimum, Math.min(maximum, maxWidth / estimatedWidth));
}

function Laurel({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 92 112" fill="none" className={className} aria-hidden="true">
      <path d="M73 101C37 81 20 48 20 12" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M63 93c-15 0-23-8-23-19 13 0 21 6 23 19Zm-19-17c-15-3-21-13-18-24 13 3 19 11 18 24ZM31 55C18 49 14 38 20 28c11 6 15 15 11 27ZM23 35C14 26 14 15 23 8c8 9 9 19 0 27Z"
        fill="currentColor"
        fillOpacity=".75"
      />
    </svg>
  );
}

function CertificateSeal() {
  return (
    <div className="certificate-seal" aria-label="Wolf Casa official certificate seal">
      <div className="certificate-seal-ring">
        <img className="certificate-seal-logo" src={wolfCasaEmblem} alt="WOLF CASA gold emblem" />
      </div>
    </div>
  );
}

interface CertificateViewProps {
  data: CertificateData;
}

export function CertificateView({ data }: CertificateViewProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const recipientName = data.recipientName.trim();
  const recipient = recipientName.toLocaleUpperCase();
  const course = formatCourseName(data.courseName || 'Course Name');

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const updateScale = () => setScale(Math.min(1, frame.clientWidth / CERTIFICATE_WIDTH));
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frameRef} className="certificate-preview-frame">
      <div
        id="certificate-view"
        className="certificate-canvas"
        data-recipient-name={recipientName}
        style={{ transform: `scale(${scale})` }}
      >
        <div className="certificate-background" />
        <div className="certificate-grain" />
        <img className="certificate-watermark-wolf" src={wolfCasaEmblem} alt="" aria-hidden="true" />
        <div className="certificate-watermark-text">WOLF CASA</div>

        <div className="certificate-border certificate-border-outer" />
        <div className="certificate-border certificate-border-inner" />
        <div className="certificate-corner certificate-corner-tl" />
        <div className="certificate-corner certificate-corner-tr" />
        <div className="certificate-corner certificate-corner-bl" />
        <div className="certificate-corner certificate-corner-br" />

        <header className="certificate-header">
          {data.logoUrl ? (
            <img className="certificate-brand-image" src={data.logoUrl} alt="Wolf Casa logo" crossOrigin="anonymous" />
          ) : (
            <WolfIcon className="certificate-brand-mark" />
          )}
          <div className="certificate-brand-name">WOLF CASA<sup>®</sup></div>
          <div className="certificate-brand-tagline">TRAINING <i /> CERTIFICATION</div>
        </header>

        <main className="certificate-main">
          <div className="certificate-title-row">
            <Laurel className="certificate-laurel certificate-laurel-left" />
            <div className="certificate-title-block">
              <h1>CERTIFICATE</h1>
              <p>OF COMPLETION</p>
            </div>
            <Laurel className="certificate-laurel certificate-laurel-right" />
          </div>
          <div className="certificate-divider"><span /></div>
          <p className="certificate-intro">This is to certify that</p>
          <p
            className="certificate-recipient"
            style={{ fontSize: fitFontSize(recipient, 46, 18, 860) }}
          >
            {recipient}
          </p>
          <p className="certificate-completion">has successfully completed the course</p>
          <p
            className="certificate-course"
            style={{ fontSize: fitFontSize(course, 32, 18, 780) }}
          >
            {course}
          </p>
          <p className="certificate-organization">
            conducted by <strong>{data.organizationName || 'WOLF CASA INDORE'}</strong>
          </p>
          <p className="certificate-dates">
            {formatCourseDates(data.startDate, data.completionDate)}
          </p>
        </main>

        <footer className="certificate-footer">
          <div className="certificate-footer-column certificate-director">
            <div className="certificate-signature">
              {data.signatureUrl ? (
                <img src={data.signatureUrl} alt="Director signature" crossOrigin="anonymous" />
              ) : (
                <span>{data.directorName || 'Director'}</span>
              )}
            </div>
            <div className="certificate-director-name">{data.directorName || 'Director'}</div>
            <div className="certificate-footer-rule" />
            <div className="certificate-designation">DIRECTOR</div>
          </div>

          <div className="certificate-footer-column certificate-seal-column">
            <CertificateSeal />
            <div className="certificate-id">{data.certificateId || '—'}</div>
          </div>

          <div className="certificate-footer-column certificate-issue">
            <div className="certificate-issue-date">
              <span>ISSUED ON</span>
              <strong>{formatDisplay(data.issueDate) || '—'}</strong>
            </div>
            <div className="certificate-qr">
              <div className="certificate-qr-frame">
                <QRCodeCanvas
                  value={data.certificateId ? buildVerificationUrl(data.certificateId) : ''}
                  size={96}
                  level="H"
                  includeMargin
                />
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
