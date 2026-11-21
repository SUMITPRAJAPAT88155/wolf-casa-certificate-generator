import { useEffect, useRef, useState } from 'react';
import { Upload, Loader2, CheckCircle2, AlertCircle, Trash2, Building2, UserRound, ImageIcon, PenLine, CalendarDays, GraduationCap } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { todayISO } from '@/lib/date';

const inputCls =
  'w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:border-amber-200/60 focus:ring-1 focus:ring-amber-200/40';

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export default function SettingsPage() {
  const { settings, loading, loadError, save } = useSettings();
  const [companyName, setCompanyName] = useState('Wolf Casa');
  const [directorName, setDirectorName] = useState('');
  const [courseName, setCourseName] = useState('');
  const [defaultIssueDate, setDefaultIssueDate] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!settings) return;
    setCompanyName(settings.company_name);
    setDirectorName(settings.director_name);
    setCourseName(settings.course_name);
    setDefaultIssueDate(settings.default_issue_date ?? '');
    setLogoUrl(settings.logo_url);
    setSignatureUrl(settings.signature_url);
  }, [settings]);

  async function handleSave() {
    setBusy(true);
    setMessage(null);
    try {
      const err = await save({
        company_name: companyName.trim() || 'Wolf Casa',
        director_name: directorName.trim(),
        course_name: courseName.trim(),
        default_issue_date: defaultIssueDate || null,
        logo_url: logoUrl,
        signature_url: signatureUrl,
      });
      setMessage(
        err
          ? { type: 'error', text: `Could not save settings: ${err}` }
          : { type: 'success', text: 'Settings saved. New certificates will use these details.' }
      );
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Could not save settings: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleImage(file: File, kind: 'logo' | 'signature') {
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please choose an image file (PNG or JPG).' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image is too large. Please use an image under 2 MB.' });
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      if (kind === 'logo') setLogoUrl(dataUrl);
      else setSignatureUrl(dataUrl);
      setMessage({ type: 'success', text: `${kind === 'logo' ? 'Logo' : 'Signature'} ready — click Save Settings to apply.` });
    } catch {
      setMessage({ type: 'error', text: 'Could not read that image.' });
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 text-neutral-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-white">Settings</h1>
      <p className="text-neutral-500 text-sm mt-1 mb-8">
        These details are used as defaults on new certificates.
      </p>

      {loadError && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-4 py-3 mb-5" role="alert">
          Could not load settings from the app_settings table: {loadError}. Confirm the Supabase migrations have been applied and try again.
        </p>
      )}

      <div className="space-y-5">
        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <Building2 className="w-4.5 h-4.5 w-[18px] h-[18px] text-amber-200" />
            <h2 className="text-white font-medium">Company</h2>
          </div>
          <label className="block">
            <span className="block text-sm text-neutral-400 mb-1.5">Company name</span>
            <input className={inputCls} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Wolf Casa" />
          </label>
        </section>

        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <UserRound className="w-[18px] h-[18px] text-amber-200" />
            <h2 className="text-white font-medium">People & Courses</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm text-neutral-400 mb-1.5 flex items-center gap-1.5">
                <PenLine className="w-3.5 h-3.5" /> Director name
              </span>
              <input className={inputCls} value={directorName} onChange={(e) => setDirectorName(e.target.value)} placeholder="Director signature name" />
            </label>
            <label className="block">
              <span className="block text-sm text-neutral-400 mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" /> Default course name
              </span>
              <input className={inputCls} value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="Pre-fills the course field" />
            </label>
            <label className="block">
              <span className="block text-sm text-neutral-400 mb-1.5 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" /> Default issue date
              </span>
              <input type="date" className={inputCls} value={defaultIssueDate} onChange={(e) => setDefaultIssueDate(e.target.value)} />
              <button
                type="button"
                onClick={() => setDefaultIssueDate(todayISO())}
                className="text-xs text-amber-200 hover:text-amber-100 mt-1.5"
              >
                Use today
              </button>
            </label>
          </div>
        </section>

        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <ImageIcon className="w-[18px] h-[18px] text-amber-200" />
            <h2 className="text-white font-medium">Logo & Signature</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['logo', 'signature'] as const).map((kind) => {
              const url = kind === 'logo' ? logoUrl : signatureUrl;
              const ref = kind === 'logo' ? logoInputRef : signatureInputRef;
              return (
                <div key={kind} className="border border-neutral-800 rounded-lg p-4 bg-neutral-950/50">
                  <p className="text-sm text-neutral-400 capitalize mb-3">{kind}</p>
                  <div className="h-20 flex items-center justify-center bg-black/40 rounded-md mb-3 overflow-hidden">
                    {url ? (
                      <img src={url} alt={`${kind} preview`} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-xs text-neutral-600">No image uploaded</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => ref.current?.click()}
                      className="inline-flex items-center gap-1.5 text-xs border border-neutral-700 hover:border-neutral-500 text-neutral-200 rounded-md px-3 py-1.5 transition-colors"
                    >
                      <Upload className="w-3 h-3" /> Upload
                    </button>
                    {url && (
                      <button
                        type="button"
                        onClick={() => (kind === 'logo' ? setLogoUrl(null) : setSignatureUrl(null))}
                        className="inline-flex items-center gap-1.5 text-xs border border-red-900/50 hover:border-red-700 text-red-400 rounded-md px-3 py-1.5 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    )}
                    <input
                      ref={ref}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImage(f, kind);
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-neutral-600 mt-3">
            Upload a PNG with a transparent background for best results. Images under 2 MB.
          </p>
        </section>

        {message && (
          <div
            className={`flex items-start gap-2 text-sm rounded-lg px-4 py-3 border ${
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

        <button
          onClick={handleSave}
          disabled={busy}
          className="inline-flex items-center gap-2 bg-amber-200 hover:bg-amber-100 disabled:opacity-60 text-neutral-950 font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Settings
        </button>
      </div>
    </div>
  );
}
