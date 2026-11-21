import { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, Package, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import type { BulkRow } from '@/lib/types';
import { generateUniqueCertificateId } from '@/lib/certificateId';
import { buildVerificationUrl } from '@/lib/verification';
import { excelDateToISO } from '@/lib/date';
import { downloadCertificatesZip } from '@/lib/pdf';
import { useSettings } from '@/hooks/useSettings';
import { CertificateView } from '@/components/CertificateView';

const inputCls =
  'w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:border-amber-200/60 focus:ring-1 focus:ring-amber-200/40';

export default function BulkGeneratorPage() {
  const { settings } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [courseOverride, setCourseOverride] = useState('');
  const [issueOverride, setIssueOverride] = useState('');
  const [directorName, setDirectorName] = useState('');
  const [fileName, setFileName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const hiddenCertsRef = useRef<HTMLDivElement>(null);

  const validRows = rows.filter((r) => r.valid);

  function handleFile(file: File) {
    setMessage(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: true });
        const parsed: BulkRow[] = json
          .map((r) => {
            const pick = (...keys: string[]) => {
              for (const k of keys) {
                const found = Object.keys(r).find((rk) => rk.toLowerCase().trim() === k);
                if (found !== undefined && r[found] !== undefined && r[found] !== '') return r[found];
              }
              return '';
            };
            const name = String(pick('name', 'recipient name', 'full name')).trim();
            const course = String(pick('course name', 'course')).trim();
            const start = excelDateToISO(pick('start date', 'startdate'));
            const completion = excelDateToISO(pick('completion date', 'completiondate', 'end date'));
            const issue = excelDateToISO(pick('issue date', 'issuedate'));
            return {
              name,
              certificateId: '',
              courseName: course,
              startDate: start,
              completionDate: completion,
              issueDate: issue,
              valid: true,
            };
          })
          .map((r) => {
            if (!r.name) return { ...r, valid: false, error: 'Missing name' };
            if (!r.courseName && !courseOverride) return { ...r, valid: false, error: 'Missing course name' };
            return r;
          })
          .filter((r) => r.name || r.courseName);
        if (parsed.length === 0) {
          setMessage({ type: 'error', text: 'No rows found. Make sure the first sheet has columns: Name, Course Name, Start Date, Completion Date, Issue Date.' });
          return;
        }
        const reservedIds = new Set<string>();
        for (const row of parsed) {
          row.certificateId = await generateUniqueCertificateId(reservedIds);
          reservedIds.add(row.certificateId);
        }
        setRows(parsed);
        setFileName(file.name.replace(/\.[^.]+$/, ''));
        setPreviewIndex(0);
      } catch (error) {
        setMessage({
          type: 'error',
          text: error instanceof Error
            ? `Could not prepare certificates: ${error.message}`
            : 'Could not read that file. Please upload a valid .xlsx or .csv file.',
        });
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function reset() {
    setRows([]);
    setFileName('');
    setMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function generateAll() {
    setGenerating(true);
    setMessage(null);
    let ok = 0;
    let fail = 0;
    for (let i = 0; i < validRows.length; i++) {
      const r = validRows[i];
      const { error } = await supabase.from('certificates').insert({
        certificate_id: r.certificateId,
        recipient_name: r.name,
        course_name: r.courseName || courseOverride,
        organization_name: settings?.company_name || 'Wolf Casa',
        start_date: r.startDate || null,
        completion_date: r.completionDate || null,
        issue_date: r.issueDate || issueOverride || null,
        director_name: directorName || settings?.director_name || null,
        barcode_value: r.certificateId,
        verification_url: buildVerificationUrl(r.certificateId),
      });
      if (error) fail++;
      else ok++;
      setProgress(`Generating ${i + 1} of ${validRows.length}...`);
    }
    setGenerating(false);
    setProgress(null);
    if (fail === 0) {
      setMessage({ type: 'success', text: `All ${ok} certificates generated and saved. Scroll down to download them.` });
    } else {
      setMessage({ type: 'error', text: `${ok} generated, ${fail} failed (duplicate or invalid rows). Try downloading below for the ones saved.` });
    }
  }

  async function downloadZip() {
    const container = hiddenCertsRef.current;
    if (!container || validRows.length === 0) return;
    setZipping(true);
    setMessage(null);
    try {
      const items = Array.from(container.querySelectorAll('[data-cert]')).map((el, i) => ({
        element: el as HTMLElement,
        fileName: `Certificate-${validRows[i]?.name.replace(/[^a-zA-Z0-9]+/g, '-') || i + 1}`,
      }));
      await downloadCertificatesZip(items, `Wolf-Casa-Certificates-${fileName || 'bulk'}`, (done, total) =>
        setProgress(`Preparing PDF ${done} of ${total}...`)
      );
      setMessage({ type: 'success', text: `ZIP with ${items.length} certificates downloaded.` });
    } catch (error) {
      setMessage({
        type: 'error',
        text: `ZIP download failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setZipping(false);
      setProgress(null);
    }
  }

  function exportRecordsExcel() {
    const data = effectiveRows.map((r) => ({
      'Certificate ID': r.certificateId,
      Name: r.name,
      'Course Name': r.courseName || courseOverride,
      'Start Date': r.startDate,
      'Completion Date': r.completionDate,
      'Issue Date': r.issueDate || issueOverride,
      Status: 'valid',
      'Verification URL': buildVerificationUrl(r.certificateId),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Certificates');
    XLSX.writeFile(wb, `Wolf-Casa-Certificate-Records-${fileName || 'bulk'}.xlsx`);
  }

  const effectiveRows = validRows.map((r) => ({
    ...r,
    courseName: r.courseName || courseOverride,
    issueDate: r.issueDate || issueOverride,
  }));
  const previewRow = rows[previewIndex] && rows[previewIndex].valid
    ? {
        ...rows[previewIndex],
        courseName: rows[previewIndex].courseName || courseOverride,
        issueDate: rows[previewIndex].issueDate || issueOverride,
      }
    : effectiveRows[0] ?? null;
  const previewData = previewRow
    ? {
        recipientName: previewRow.name,
        courseName: previewRow.courseName,
        organizationName: settings?.company_name || 'Wolf Casa',
        startDate: previewRow.startDate,
        completionDate: previewRow.completionDate,
        issueDate: previewRow.issueDate,
        directorName: directorName || settings?.director_name || '',
        certificateId: previewRow.certificateId,
        verificationUrl: buildVerificationUrl(previewRow.certificateId),
        barcodeValue: previewRow.certificateId,
        logoUrl: settings?.logo_url ?? null,
        signatureUrl: settings?.signature_url ?? null,
      }
    : null;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Bulk Certificate Generator</h1>
      <p className="text-neutral-500 text-sm mt-1 mb-8">
        Upload an Excel file with one row per person and generate every certificate at once.
      </p>

      {/* Upload area */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-6">
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          className="border-2 border-dashed border-neutral-700 hover:border-amber-200/50 rounded-xl p-10 text-center cursor-pointer transition-colors"
        >
          <FileSpreadsheet className="w-10 h-10 text-amber-200/70 mx-auto mb-3" />
          <p className="text-white font-medium">Click to upload or drag your Excel file here</p>
          <p className="text-neutral-500 text-sm mt-1">
            .xlsx or .csv — columns: Name, Course Name, Start Date, Completion Date, Issue Date
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>
        {fileName && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-neutral-300">Loaded: {fileName}</span>
            <button onClick={reset} className="inline-flex items-center gap-1 text-neutral-400 hover:text-white">
              <X className="w-4 h-4" /> Clear
            </button>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <>
          {/* Shared defaults */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block">
              <span className="block text-sm text-neutral-400 mb-1.5">Default course (for rows without one)</span>
              <input className={inputCls} value={courseOverride} onChange={(e) => setCourseOverride(e.target.value)} placeholder="Course name" />
            </label>
            <label className="block">
              <span className="block text-sm text-neutral-400 mb-1.5">Default issue date</span>
              <input type="date" className={inputCls} value={issueOverride} onChange={(e) => setIssueOverride(e.target.value)} />
            </label>
            <label className="block">
              <span className="block text-sm text-neutral-400 mb-1.5">Director name</span>
              <input className={inputCls} value={directorName} onChange={(e) => setDirectorName(e.target.value)} placeholder={settings?.director_name || 'Director'} />
            </label>
          </div>

          {/* Preview table */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-white font-medium">Preview ({validRows.length} valid of {rows.length} rows)</h2>
                <p className="text-neutral-500 text-xs mt-0.5">Click a row to preview its certificate on the right.</p>
              </div>
            </div>
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-sm">
                <thead className="bg-neutral-950/60 text-neutral-500 text-xs uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="text-left px-5 py-2.5 font-medium">Name</th>
                    <th className="text-left px-5 py-2.5 font-medium">Course</th>
                    <th className="text-left px-5 py-2.5 font-medium">Dates</th>
                    <th className="text-left px-5 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {rows.map((r, i) => (
                    <tr
                      key={i}
                      onClick={() => r.valid && setPreviewIndex(i)}
                      className={`cursor-pointer hover:bg-neutral-800/40 ${r.valid ? '' : 'opacity-60'}`}
                    >
                      <td className="px-5 py-2.5 text-white">{r.name || <span className="text-neutral-600">—</span>}</td>
                      <td className="px-5 py-2.5 text-neutral-300">{r.courseName || courseOverride || <span className="text-neutral-600">—</span>}</td>
                      <td className="px-5 py-2.5 text-neutral-400 text-xs">
                        {[r.startDate, r.completionDate].filter(Boolean).join(' → ') || '—'}
                      </td>
                      <td className="px-5 py-2.5">
                        {r.valid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-400 text-xs">
                            <AlertCircle className="w-3.5 h-3.5" /> {r.error}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <button
              onClick={generateAll}
              disabled={generating || validRows.length === 0}
              className="inline-flex items-center gap-2 bg-amber-200 hover:bg-amber-100 disabled:opacity-60 text-neutral-950 font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Generate All ({validRows.length})
            </button>
            <button
              onClick={downloadZip}
              disabled={zipping || validRows.length === 0}
              className="inline-flex items-center gap-2 border border-neutral-700 hover:border-neutral-500 disabled:opacity-40 text-neutral-200 rounded-lg px-5 py-2.5 text-sm transition-colors"
            >
              {zipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
              Download All as ZIP
            </button>
            <button
              onClick={exportRecordsExcel}
              disabled={validRows.length === 0}
              className="inline-flex items-center gap-2 border border-neutral-700 hover:border-neutral-500 disabled:opacity-40 text-neutral-200 rounded-lg px-5 py-2.5 text-sm transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Records to Excel
            </button>
            {progress && <span className="text-amber-200 text-sm">{progress}</span>}
          </div>

          {message && (
            <div
              className={`flex items-start gap-2 text-sm rounded-lg px-4 py-3 border mb-6 ${
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

          {/* Certificate preview */}
          {previewData && (
            <div className="rounded-xl overflow-hidden border border-neutral-800 shadow-2xl">
              <CertificateView data={previewData} />
            </div>
          )}
        </>
      )}

      {/* Off-screen render farm for ZIP generation */}
      <div
        ref={hiddenCertsRef}
        aria-hidden
        style={{ position: 'fixed', left: -10000, top: 0, width: 1122, pointerEvents: 'none', opacity: 0.01 }}
      >
        {effectiveRows.map((r, i) => (
          <div key={i} data-cert={i}>
            <CertificateView
              data={{
                recipientName: r.name,
                courseName: r.courseName,
                organizationName: settings?.company_name || 'Wolf Casa',
                startDate: r.startDate,
                completionDate: r.completionDate,
                issueDate: r.issueDate,
                directorName: directorName || settings?.director_name || '',
                certificateId: r.certificateId,
                verificationUrl: buildVerificationUrl(r.certificateId),
                barcodeValue: r.certificateId,
                logoUrl: settings?.logo_url ?? null,
                signatureUrl: settings?.signature_url ?? null,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
