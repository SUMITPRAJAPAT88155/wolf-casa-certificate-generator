import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Eye, FileDown, Printer, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Certificate } from '@/lib/types';
import { generateUniqueCertificateId } from '@/lib/certificateId';
import { buildVerificationUrl } from '@/lib/verification';
import { todayISO } from '@/lib/date';
import { downloadCertificatePdf, printElement } from '@/lib/pdf';
import { useSettings } from '@/hooks/useSettings';
import { CertificateView } from '@/components/CertificateView';

const inputCls =
  'w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:border-amber-200/60 focus:ring-1 focus:ring-amber-200/40';

export default function CreateCertificatePage() {
  const { settings, fallback, loading: settingsLoading } = useSettings();
  const [recipientName, setRecipientName] = useState('');
  const [courseName, setCourseName] = useState('');
  const [organizationName, setOrganizationName] = useState('Wolf Casa');
  const [startDate, setStartDate] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [issueDate, setIssueDate] = useState(todayISO());
  const [directorName, setDirectorName] = useState('');
  const [certificateId, setCertificateId] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const certRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (settingsLoading || !settings) return;
    setOrganizationName(settings.company_name || 'Wolf Casa');
    if (settings.course_name && !courseName) setCourseName(settings.course_name);
    if (settings.director_name && !directorName) setDirectorName(settings.director_name);
    if (settings.default_issue_date && issueDate === todayISO()) setIssueDate(settings.default_issue_date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoading, settings]);

  function preview() {
    if (!recipientName.trim() || !courseName.trim()) {
      setMessage({ type: 'error', text: 'Please enter the recipient name and course name first.' });
      return;
    }
    setMessage(null);
    setShowPreview(true);
    setTimeout(() => certRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
  }

  async function saveCertificate(id: string): Promise<Certificate | null> {
    const payload = {
      certificate_id: id,
      recipient_name: recipientName.trim(),
      course_name: courseName.trim(),
      organization_name: organizationName.trim() || 'Wolf Casa',
      start_date: startDate || null,
      completion_date: completionDate || null,
      issue_date: issueDate || null,
      director_name: directorName.trim() || null,
      barcode_value: id,
      verification_url: buildVerificationUrl(id),
    };
    const { data, error } = await supabase.from('certificates').insert(payload).select().single();
    if (error) {
      setMessage({ type: 'error', text: `Could not save the certificate: ${error.message}` });
      return null;
    }
    return data;
  }

  async function handleGenerate() {
    if (!recipientName.trim() || !courseName.trim()) {
      setMessage({ type: 'error', text: 'Please enter the recipient name and course name.' });
      return;
    }
    setBusy('generate');
    setMessage(null);
    try {
      const id = await generateUniqueCertificateId();
      setCertificateId(id);
      setShowPreview(true);
      const saved = await saveCertificate(id);
      if (saved) {
        setMessage({ type: 'success', text: `Certificate saved with ID ${id}. You can now download or print it.` });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Could not generate the certificate: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleDownload() {
    if (!certRef.current) return;
    setBusy('download');
    setMessage(null);
    try {
      await downloadCertificatePdf(
        certRef.current,
        `Certificate-${(recipientName || 'recipient').replace(/[^a-zA-Z0-9]+/g, '-')}${certificateId ? `-${certificateId}` : ''}`
      );
      setMessage({ type: 'success', text: 'PDF downloaded.' });
    } catch {
      setMessage({ type: 'error', text: 'PDF download failed. Please try again.' });
    }
    setBusy(null);
  }

  async function handlePrint() {
    if (!certRef.current) return;
    setBusy('print');
    setMessage(null);
    try {
      await printElement(certRef.current);
    } catch {
      setMessage({ type: 'error', text: 'Print failed. Please allow popups for this page.' });
    }
    setBusy(null);
  }

  const certData = {
    recipientName,
    courseName,
    organizationName,
    startDate,
    completionDate,
    issueDate,
    directorName: directorName || fallback.director_name,
    certificateId,
    logoUrl: settings?.logo_url ?? null,
    signatureUrl: settings?.signature_url ?? null,
    verificationUrl: buildVerificationUrl(certificateId),
    barcodeValue: certificateId,
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Create Certificate</h1>
      <p className="text-neutral-500 text-sm mt-1 mb-8">Fill in the details, preview, then generate.</p>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            handleGenerate();
          }}
          className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4"
        >
          <Field label="Recipient Full Name" required>
            <input className={inputCls} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="e.g. Jane Maria Doe" required />
          </Field>
          <Field label="Course Name" required>
            <input className={inputCls} value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="e.g. Advanced Culinary Arts" required />
          </Field>
          <Field label="Organization Name">
            <input className={inputCls} value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Course Start Date">
              <input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <Field label="Completion Date">
              <input type="date" className={inputCls} value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} />
            </Field>
            <Field label="Issue Date">
              <input type="date" className={inputCls} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </Field>
          </div>
          <Field label="Director Name">
            <input className={inputCls} value={directorName} onChange={(e) => setDirectorName(e.target.value)} placeholder="Director signature name" />
          </Field>
          <Field label="Certificate ID">
            <div className="flex gap-2">
              <input className={`${inputCls} font-mono`} value={certificateId} placeholder="Auto-generated when you generate" readOnly />
              <button
                type="button"
                onClick={() => setCertificateId(certificateId)}
                className="hidden"
                aria-hidden
              />
            </div>
          </Field>

          {message && (
            <div
              className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2.5 border ${
                message.type === 'success'
                  ? 'text-emerald-400 bg-emerald-950/40 border-emerald-900/50'
                  : 'text-red-400 bg-red-950/40 border-red-900/50'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              )}
              {message.text}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={preview}
              className="inline-flex items-center gap-2 border border-neutral-700 hover:border-neutral-500 text-neutral-200 rounded-lg px-4 py-2.5 text-sm transition-colors"
            >
              <Eye className="w-4 h-4" />
              Preview Certificate
            </button>
            <button
              type="submit"
              disabled={busy !== null}
              className="inline-flex items-center gap-2 bg-amber-200 hover:bg-amber-100 disabled:opacity-60 text-neutral-950 font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors"
            >
              {busy === 'generate' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Generate Certificate
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={busy !== null || !certificateId}
              className="inline-flex items-center gap-2 border border-neutral-700 hover:border-neutral-500 disabled:opacity-40 text-neutral-200 rounded-lg px-4 py-2.5 text-sm transition-colors"
            >
              {busy === 'download' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              Download PDF
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={busy !== null || !certificateId}
              className="inline-flex items-center gap-2 border border-neutral-700 hover:border-neutral-500 disabled:opacity-40 text-neutral-200 rounded-lg px-4 py-2.5 text-sm transition-colors"
            >
              {busy === 'print' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              Print Certificate
            </button>
          </div>
          <p className="text-xs text-neutral-600">
            Generate first to create the record and enable Download / Print.
          </p>
        </form>

        <div className="xl:sticky xl:top-8">
          {showPreview ? (
            <div className="rounded-xl overflow-hidden border border-neutral-800 shadow-2xl">
              <div className="origin-top scale-100">
                <div ref={certRef} className="[transform:none]">
                  <CertificateView data={certData} />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-900/50 p-10 text-center">
              <Eye className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
              <p className="text-neutral-500 text-sm">
                Fill in the form and click Preview Certificate to see it here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm text-neutral-400 mb-1.5">
        {label}
        {required && <span className="text-amber-200 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
