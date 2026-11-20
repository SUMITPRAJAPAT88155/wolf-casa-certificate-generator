import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, FileDown, Printer, Eye, Loader2, X, FolderOpen, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Certificate } from '@/lib/types';
import { formatDate } from '@/lib/date';
import { downloadCertificatePdf, printElement } from '@/lib/pdf';
import { useSettings } from '@/hooks/useSettings';
import { CertificateView } from '@/components/CertificateView';

const inputCls =
  'w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:border-amber-200/60 focus:ring-1 focus:ring-amber-200/40';

export default function RecordsPage() {
  const { settings } = useSettings();
  const { user } = useAuth();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [viewCert, setViewCert] = useState<Certificate | null>(null);
  const [autoAction, setAutoAction] = useState<'download' | 'print' | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [deleteCert, setDeleteCert] = useState<Certificate | null>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const modalCertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('certificates')
      .select('*')
      .order('created_at', { ascending: false });
    if (err) setError(err.message);
    setCerts(data ?? []);
    setLoading(false);
  }

  async function handleDelete() {
    if (!deleteCert || busyKey) return;
    if (!user) {
      setError('You must be signed in to delete certificates.');
      return;
    }
    if (deleteCert.user_id !== user.id) {
      setError('You can only delete certificates belonging to your account.');
      setDeleteCert(null);
      return;
    }

    const certificate = deleteCert;
    setBusyKey(`del-${certificate.id}`);
    setError(null);
    setSuccess(null);
    try {
      const { data, error: deleteError } = await supabase.rpc('delete_certificate', {
        p_certificate_id: certificate.certificate_id,
      });

      if (deleteError) throw new Error(deleteError.message);
      if (!data) throw new Error('The certificate may already have been removed.');

      setCerts((current) => current.filter((item) => item.id !== certificate.id));
      setViewCert((current) => current?.id === certificate.id ? null : current);
      setDeleteCert(null);
      setSuccess(`Certificate ${certificate.certificate_id} deleted successfully.`);
      window.dispatchEvent(new Event('certificates:changed'));
    } catch (deleteError) {
      setError(`Could not delete the certificate: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`);
    } finally {
      setBusyKey(null);
    }
  }

  const courses = useMemo(
    () => Array.from(new Set(certs.map((c) => c.course_name))).sort(),
    [certs]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return certs.filter((c) => {
      const matchesSearch =
        !q ||
        c.recipient_name.toLowerCase().includes(q) ||
        c.certificate_id.toLowerCase().includes(q);
      const matchesCourse = !courseFilter || c.course_name === courseFilter;
      return matchesSearch && matchesCourse;
    });
  }, [certs, search, courseFilter]);

  async function handleDownload(c: Certificate) {
    if (!modalCertRef.current) return;
    setBusyKey(`dl-${c.id}`);
    setError(null);
    try {
      await downloadCertificatePdf(
        modalCertRef.current,
        `Certificate-${c.recipient_name.replace(/[^a-zA-Z0-9]+/g, '-')}-${c.certificate_id}`
      );
    } catch {
      setError('PDF download failed. Please try again.');
    }
    setBusyKey(null);
  }

  async function handlePrint(c: Certificate) {
    if (!modalCertRef.current) return;
    setBusyKey(`pr-${c.id}`);
    setError(null);
    try {
      await printElement(modalCertRef.current);
    } catch {
      setError('Print failed. Please allow popups for this page.');
    }
    setBusyKey(null);
  }

  useEffect(() => {
    if (!viewCert || !autoAction || !modalCertRef.current) return;
    const action = autoAction;
    setAutoAction(null);
    if (action === 'download') handleDownload(viewCert);
    else handlePrint(viewCert);
  }, [viewCert, autoAction]);

  useEffect(() => {
    if (viewCert) modalContentRef.current?.scrollTo({ top: 0, left: 0 });
  }, [viewCert]);

  function certData(c: Certificate) {
    return {
      recipientName: c.recipient_name,
      courseName: c.course_name,
      organizationName: c.organization_name,
      startDate: c.start_date ?? '',
      completionDate: c.completion_date ?? '',
      issueDate: c.issue_date ?? '',
      directorName: c.director_name ?? '',
      certificateId: c.certificate_id,
      logoUrl: settings?.logo_url ?? null,
      signatureUrl: settings?.signature_url ?? null,
    };
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Certificate Records</h1>
          <p className="text-neutral-500 text-sm mt-1">{certs.length} certificates saved</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:w-auto w-full">
          <div className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or certificate ID"
              className={`${inputCls} pl-10`}
            />
          </div>
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className={`${inputCls} sm:w-56`}
          >
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-300 bg-emerald-950/40 border border-emerald-900/50 rounded-lg px-3 py-2 mb-4" role="status">
          {success}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-neutral-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center">
          <FolderOpen className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
          <p className="text-neutral-500">
            {certs.length === 0 ? 'No certificates saved yet.' : 'No certificates match your search.'}
          </p>
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-neutral-950/60 text-neutral-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Certificate ID</th>
                  <th className="text-left px-5 py-3 font-medium">Recipient</th>
                  <th className="text-left px-5 py-3 font-medium">Course</th>
                  <th className="text-left px-5 py-3 font-medium">Issue Date</th>
                  <th className="text-left px-5 py-3 font-medium">Created</th>
                  <th className="text-right px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-800/30">
                    <td className="px-5 py-3 font-mono text-neutral-300">{c.certificate_id}</td>
                    <td className="px-5 py-3 text-white">{c.recipient_name}</td>
                    <td className="px-5 py-3 text-neutral-300">{c.course_name}</td>
                    <td className="px-5 py-3 text-neutral-400">{formatDate(c.issue_date)}</td>
                    <td className="px-5 py-3 text-neutral-500 text-xs">{formatDate(c.created_at.slice(0, 10))}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewCert(c)}
                          title="View certificate"
                          className="p-2 rounded-lg text-neutral-400 hover:text-amber-200 hover:bg-neutral-800 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setViewCert(c);
                            setAutoAction('download');
                          }}
                          title="Download PDF"
                          className="p-2 rounded-lg text-neutral-400 hover:text-amber-200 hover:bg-neutral-800 transition-colors"
                          disabled={busyKey !== null}
                        >
                          <FileDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setViewCert(c);
                            setAutoAction('print');
                          }}
                          title="Print again"
                          className="p-2 rounded-lg text-neutral-400 hover:text-amber-200 hover:bg-neutral-800 transition-colors"
                          disabled={busyKey !== null}
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setError(null);
                            setDeleteCert(c);
                          }}
                          title="Delete certificate"
                          aria-label={`Delete certificate ${c.certificate_id}`}
                          className="p-2 rounded-lg text-neutral-400 hover:text-red-300 hover:bg-red-950/40 transition-colors"
                          disabled={busyKey !== null || !user || c.user_id !== user.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Viewer modal */}
      {viewCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative flex w-full max-w-[1200px] max-h-[95vh] flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl">
            <div className="z-10 flex shrink-0 items-center justify-between gap-3 bg-neutral-950 border-b border-neutral-800 px-5 py-3">
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {viewCert.recipient_name} — <span className="font-mono text-neutral-400">{viewCert.certificate_id}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDownload(viewCert)}
                  disabled={busyKey !== null}
                  className="inline-flex items-center gap-1.5 bg-amber-200 hover:bg-amber-100 disabled:opacity-60 text-neutral-950 font-semibold rounded-lg px-3.5 py-2 text-xs transition-colors"
                >
                  {busyKey === `dl-${viewCert.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                  Download PDF
                </button>
                <button
                  onClick={() => handlePrint(viewCert)}
                  disabled={busyKey !== null}
                  className="inline-flex items-center gap-1.5 border border-neutral-700 hover:border-neutral-500 disabled:opacity-60 text-neutral-200 rounded-lg px-3.5 py-2 text-xs transition-colors"
                >
                  {busyKey === `pr-${viewCert.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                  Print
                </button>
                <button
                  onClick={() => {
                    setViewCert(null);
                    setError(null);
                  }}
                  className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div ref={modalContentRef} className="overflow-auto p-5">
              <div ref={modalCertRef}>
                <CertificateView data={certData(viewCert)} />
              </div>
              <p className="mt-3 text-xs text-neutral-600 text-center">
                Downloaded PDFs and prints match this preview exactly.
              </p>
            </div>
          </div>
        </div>
      )}

      {deleteCert && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="presentation"
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-certificate-title"
            aria-describedby="delete-certificate-description"
            className="w-full max-w-md rounded-xl border border-neutral-700 bg-neutral-950 p-6 shadow-2xl"
          >
            <h2 id="delete-certificate-title" className="text-lg font-semibold text-white">
              Delete certificate?
            </h2>
            <p id="delete-certificate-description" className="mt-2 text-sm text-neutral-400">
              Are you sure you want to delete this certificate? This action cannot be undone.
            </p>
            <p className="mt-3 truncate font-mono text-xs text-neutral-500">
              {deleteCert.certificate_id} · {deleteCert.recipient_name}
            </p>
            {error && (
              <p className="mt-3 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300" role="alert">
                {error}
              </p>
            )}
            {busyKey === `del-${deleteCert.id}` && (
              <p className="mt-3 flex items-center gap-2 text-sm text-neutral-400" role="status">
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting certificate…
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteCert(null)}
                disabled={busyKey !== null}
                className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-200 transition-colors hover:border-neutral-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busyKey !== null || !user || deleteCert.user_id !== user.id}
                className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                {busyKey === `del-${deleteCert.id}` && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
