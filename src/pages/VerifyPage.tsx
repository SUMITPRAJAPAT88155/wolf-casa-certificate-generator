import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldX,
  SearchX,
  Loader2,
  FileDown,
  Printer,
  BadgeCheck,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/date';
import { downloadCertificatePdf, printElement } from '@/lib/pdf';
import { CertificateView } from '@/components/CertificateView';
import { WolfLogo } from '@/components/WolfLogo';

interface VerifyResult {
  found: boolean;
  status: string | null;
  certificate_id: string | null;
  recipient_name: string | null;
  course_name: string | null;
  organization_name: string | null;
  start_date: string | null;
  completion_date: string | null;
  issue_date: string | null;
  director_name: string | null;
  verification_url: string | null;
  allow_public_download: boolean | null;
}

type VerifyState =
  | { kind: 'loading' }
  | { kind: 'notfound' }
  | { kind: 'error' }
  | { kind: 'result'; data: VerifyResult };

export default function VerifyPage() {
  const { certificateId } = useParams<{ certificateId: string }>();
  const [state, setState] = useState<VerifyState>({ kind: 'loading' });
  const [busy, setBusy] = useState<'download' | 'print' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const certRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function verify() {
      setState({ kind: 'loading' });
      const { data, error } = await supabase.rpc('verify_certificate', {
        p_certificate_id: certificateId ?? '',
      });
      if (cancelled) return;
      if (error) {
        setState({ kind: 'error' });
        return;
      }
      const rows = (data ?? []) as VerifyResult[];
      if (rows.length === 0 || !rows[0].found) setState({ kind: 'notfound' });
      else setState({ kind: 'result', data: rows[0] });
    }
    verify();
    return () => {
      cancelled = true;
    };
  }, [certificateId]);

  function certData(data: VerifyResult) {
    return {
      recipientName: data.recipient_name ?? '',
      courseName: data.course_name ?? '',
      organizationName: data.organization_name ?? '',
      startDate: data.start_date ?? '',
      completionDate: data.completion_date ?? '',
      issueDate: data.issue_date ?? '',
      directorName: data.director_name ?? '',
      certificateId: data.certificate_id ?? '',
      verificationUrl: data.verification_url ?? undefined,
      barcodeValue: data.certificate_id ?? '',
    };
  }

  async function handleDownload() {
    if (!certRef.current || state.kind !== 'result') return;
    setBusy('download');
    setActionError(null);
    try {
      await downloadCertificatePdf(
        certRef.current,
        `Certificate-${(state.data.recipient_name ?? 'recipient').replace(/[^a-zA-Z0-9]+/g, '-')}-${state.data.certificate_id ?? ''}`
      );
    } catch {
      setActionError('PDF download failed. Please try again.');
    }
    setBusy(null);
  }

  async function handlePrint() {
    if (!certRef.current || state.kind !== 'result') return;
    setBusy('print');
    setActionError(null);
    try {
      await printElement(certRef.current);
    } catch {
      setActionError('Print failed. Please allow popups for this page.');
    }
    setBusy(null);
  }

  const statusBadge =
    state.kind === 'result' && state.data.status === 'valid' ? (
      <div className="inline-flex items-center gap-2.5 bg-emerald-950/60 border border-emerald-700/60 rounded-full px-5 py-2.5">
        <ShieldCheck className="w-5 h-5 text-emerald-400" />
        <span className="text-emerald-300 font-semibold tracking-wide">CERTIFICATE STATUS: VALID</span>
      </div>
    ) : state.kind === 'result' ? (
      <div className="inline-flex items-center gap-2.5 bg-red-950/60 border border-red-700/60 rounded-full px-5 py-2.5">
        <ShieldX className="w-5 h-5 text-red-400" />
        <span className="text-red-300 font-semibold tracking-wide">CERTIFICATE STATUS: INVALID</span>
      </div>
    ) : null;

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <WolfLogo className="h-8" />
          <Link
            to="/"
            className="text-xs tracking-[0.25em] uppercase text-neutral-500 hover:text-amber-200 transition-colors"
          >
            Admin Portal
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {state.kind === 'loading' && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-neutral-600 animate-spin mb-4" />
            <p className="text-neutral-500">Verifying certificate...</p>
          </div>
        )}

        {state.kind === 'notfound' && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-950/60 border border-red-800/60 mb-6">
              <SearchX className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-wide">
              CERTIFICATE NOT FOUND
            </h1>
            <p className="mt-3 text-neutral-400">
              This certificate could not be verified.
            </p>
            <p className="mt-1 text-neutral-600 text-sm font-mono break-all">
              {certificateId}
            </p>
          </div>
        )}

        {state.kind === 'error' && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 mb-6">
              <AlertCircle className="w-8 h-8 text-amber-200" />
            </div>
            <h1 className="text-2xl font-semibold text-white">Verification Unavailable</h1>
            <p className="mt-3 text-neutral-400">
              Something went wrong while checking this certificate. Please try again later.
            </p>
          </div>
        )}

        {state.kind === 'result' && (
          <div>
            <div className="text-center mb-8">{statusBadge}</div>

            {/* Details card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-neutral-800 flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-amber-200" />
                <h2 className="text-sm font-medium tracking-[0.2em] uppercase text-neutral-300">
                  Certificate Details
                </h2>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                <Detail label="Recipient Full Name" value={state.data.recipient_name} />
                <Detail label="Certificate ID" value={state.data.certificate_id} mono />
                <Detail label="Course Name" value={state.data.course_name} />
                <Detail label="Organization" value={state.data.organization_name} />
                <Detail label="Course Start Date" value={formatDate(state.data.start_date)} />
                <Detail label="Completion Date" value={formatDate(state.data.completion_date)} />
                <Detail label="Issue Date" value={formatDate(state.data.issue_date)} />
                <Detail label="Director Name" value={state.data.director_name} />
              </dl>
            </div>

            {actionError && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2 mb-4 text-center">
                {actionError}
              </p>
            )}

            {/* Original certificate preview */}
            <div className="rounded-xl overflow-hidden border border-neutral-800 shadow-2xl mb-6">
              <div ref={certRef}>
                <CertificateView data={certData(state.data)} />
              </div>
            </div>

            {state.data.status === 'valid' && state.data.allow_public_download !== false && (
              <div className="flex flex-wrap justify-center gap-3 pb-4">
                <button
                  onClick={handleDownload}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-2 bg-amber-200 hover:bg-amber-100 disabled:opacity-60 text-neutral-950 font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors"
                >
                  {busy === 'download' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  Download PDF
                </button>
                <button
                  onClick={handlePrint}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-2 border border-neutral-700 hover:border-neutral-500 disabled:opacity-60 text-neutral-200 rounded-lg px-5 py-2.5 text-sm transition-colors"
                >
                  {busy === 'print' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                  Print Certificate
                </button>
              </div>
            )}

            {state.data.status !== 'valid' && (
              <p className="text-center text-neutral-500 text-sm pb-4">
                This certificate is invalid and cannot be downloaded.
              </p>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-neutral-800 py-6">
        <p className="text-center text-xs text-neutral-600">
          Wolf Casa — Official Certificate Verification
        </p>
      </footer>
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="px-6 py-4 border-b border-neutral-800/60">
      <dt className="text-xs uppercase tracking-wider text-neutral-500 mb-1">{label}</dt>
      <dd className={`text-white ${mono ? 'font-mono text-sm' : ''} break-words`}>
        {value?.trim() ? value : '—'}
      </dd>
    </div>
  );
}
