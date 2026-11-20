import { useRef, useState } from 'react';
import {
  Upload,
  Loader2,
  Trash2,
  Star,
  Edit3,
  Check,
  X,
  Stamp,
  Award,
  PenLine,
  AlertCircle,
} from 'lucide-react';
import type { Seal, SealKind } from '@/lib/types';
import {
  useSeals,
  uploadSealImage,
  deleteSealImage,
  publicSealUrl,
  SEAL_KIND_LABELS,
} from '@/lib/seals';
import { supabase } from '@/lib/supabase';

const KIND_ICONS: Record<SealKind, typeof Stamp> = {
  company_seal: Stamp,
  signatory_stamp: Award,
  director_signature: PenLine,
};

export default function SealManagementPage() {
  const { seals, loading, reload } = useSeals();
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editing, setEditing] = useState<Seal | null>(null);
  const [editName, setEditName] = useState('');
  const [editKind, setEditKind] = useState<SealKind>('company_seal');
  const [pendingUpload, setPendingUpload] = useState<{ file: File; path: string } | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadKind, setUploadKind] = useState<SealKind>('company_seal');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setMessage(null);
    setUploading(true);
    const result = await uploadSealImage(file);
    setUploading(false);
    if ('error' in result) {
      setMessage({ type: 'error', text: result.error });
      return;
    }
    setPendingUpload({ file, path: result.path });
    setUploadName(file.name.replace(/\.[^.]+$/, ''));
    setUploadKind('company_seal');
  }

  async function confirmUpload() {
    if (!pendingUpload) return;
    if (!uploadName.trim()) {
      setMessage({ type: 'error', text: 'Please give this seal a name.' });
      return;
    }
    setBusyId('upload');
    const { error } = await supabase.from('seals').insert({
      name: uploadName.trim(),
      kind: uploadKind,
      storage_path: pendingUpload.path,
      is_default: seals.length === 0,
    });
    setBusyId(null);
    if (error) {
      setMessage({ type: 'error', text: 'Could not save the seal. Please try again.' });
      return;
    }
    setPendingUpload(null);
    setMessage({ type: 'success', text: 'Seal added.' });
    reload();
  }

  async function handleDelete(seal: Seal) {
    if (!window.confirm(`Delete "${seal.name}"? This cannot be undone.`)) return;
    setBusyId(seal.id);
    const fileErr = await deleteSealImage(seal.storage_path);
    const { error } = await supabase.from('seals').delete().eq('id', seal.id);
    setBusyId(null);
    if (fileErr || error) {
      setMessage({ type: 'error', text: 'Could not delete this seal. Please try again.' });
      return;
    }
    setMessage({ type: 'success', text: `"${seal.name}" deleted.` });
    reload();
  }

  async function handleSetDefault(seal: Seal) {
    setBusyId(seal.id);
    const { error } = await supabase.rpc('set_default_seal', { p_seal_id: seal.id });
    setBusyId(null);
    if (error) {
      setMessage({ type: 'error', text: 'Could not set the default seal. Please try again.' });
      return;
    }
    setMessage({ type: 'success', text: `"${seal.name}" is now the default seal.` });
    reload();
  }

  function startEdit(seal: Seal) {
    setEditing(seal);
    setEditName(seal.name);
    setEditKind(seal.kind);
    setMessage(null);
  }

  async function saveEdit() {
    if (!editing) return;
    if (!editName.trim()) {
      setMessage({ type: 'error', text: 'Name cannot be empty.' });
      return;
    }
    setBusyId(editing.id);
    const { error } = await supabase
      .from('seals')
      .update({ name: editName.trim(), kind: editKind })
      .eq('id', editing.id);
    setBusyId(null);
    if (error) {
      setMessage({ type: 'error', text: 'Could not update this seal. Please try again.' });
      return;
    }
    setEditing(null);
    setMessage({ type: 'success', text: 'Seal updated.' });
    reload();
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold text-white">Seal Management</h1>
      <p className="text-neutral-500 text-sm mt-1 mb-8">
        Upload and manage company seals, signatory stamps and director signatures used on certificates.
      </p>

      {message && (
        <div
          className={`flex items-start gap-2 text-sm rounded-lg px-4 py-3 border mb-6 ${
            message.type === 'success'
              ? 'text-emerald-400 bg-emerald-950/40 border-emerald-900/50'
              : 'text-red-400 bg-red-950/40 border-red-900/50'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Upload area */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-8">
        {pendingUpload ? (
          <div>
            <div className="flex items-center gap-5 mb-5">
              <div className="w-24 h-24 bg-black/50 border border-neutral-800 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={URL.createObjectURL(pendingUpload.file)}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-sm text-neutral-400 mb-1.5">Seal name</label>
                <input
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="e.g. Official Round Seal"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:border-amber-200/60 focus:ring-1 focus:ring-amber-200/40"
                />
                <label className="block text-sm text-neutral-400 mb-1.5 mt-3">Type</label>
                <select
                  value={uploadKind}
                  onChange={(e) => setUploadKind(e.target.value as SealKind)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-amber-200/60"
                >
                  {(Object.keys(SEAL_KIND_LABELS) as SealKind[]).map((k) => (
                    <option key={k} value={k}>
                      {SEAL_KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={confirmUpload}
                disabled={busyId === 'upload'}
                className="inline-flex items-center gap-2 bg-amber-200 hover:bg-amber-100 disabled:opacity-60 text-neutral-950 font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors"
              >
                {busyId === 'upload' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Seal
              </button>
              <button
                onClick={() => setPendingUpload(null)}
                className="inline-flex items-center gap-2 border border-neutral-700 hover:border-neutral-500 text-neutral-200 rounded-lg px-5 py-2.5 text-sm transition-colors"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          </div>
        ) : (
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
            {uploading ? (
              <Loader2 className="w-10 h-10 text-amber-200/70 mx-auto mb-3 animate-spin" />
            ) : (
              <Upload className="w-10 h-10 text-amber-200/70 mx-auto mb-3" />
            )}
            <p className="text-white font-medium">Click to upload or drag a seal image here</p>
            <p className="text-neutral-500 text-sm mt-1">
              PNG or JPG, transparent PNG preferred, under 2 MB. You can add multiple seals.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = '';
              }}
            />
          </div>
        )}
      </div>

      {/* Seal cards */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-neutral-600 animate-spin" />
        </div>
      ) : seals.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center">
          <Stamp className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
          <p className="text-neutral-500">No seals uploaded yet. Upload your first seal above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {seals.map((seal) => {
            const Icon = KIND_ICONS[seal.kind];
            return (
              <div
                key={seal.id}
                className={`bg-neutral-900 border rounded-xl overflow-hidden transition-colors ${
                  seal.is_default ? 'border-amber-200/50' : 'border-neutral-800'
                }`}
              >
                <div className="h-36 bg-black/50 flex items-center justify-center p-4 border-b border-neutral-800">
                  <img
                    src={publicSealUrl(seal.storage_path)}
                    alt={seal.name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="p-4">
                  {editing?.id === seal.id ? (
                    <div className="space-y-3">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-200/60"
                      />
                      <select
                        value={editKind}
                        onChange={(e) => setEditKind(e.target.value as SealKind)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-200/60"
                      >
                        {(Object.keys(SEAL_KIND_LABELS) as SealKind[]).map((k) => (
                          <option key={k} value={k}>
                            {SEAL_KIND_LABELS[k]}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          disabled={busyId === seal.id}
                          className="inline-flex items-center gap-1.5 bg-amber-200 hover:bg-amber-100 disabled:opacity-60 text-neutral-950 font-semibold rounded-md px-3 py-1.5 text-xs"
                        >
                          {busyId === seal.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Save
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="inline-flex items-center gap-1.5 border border-neutral-700 hover:border-neutral-500 text-neutral-200 rounded-md px-3 py-1.5 text-xs"
                        >
                          <X className="w-3 h-3" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate flex items-center gap-1.5">
                            {seal.name}
                            {seal.is_default && (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-amber-200 border border-amber-200/40 rounded-full px-2 py-0.5 shrink-0">
                                <Star className="w-2.5 h-2.5 fill-amber-200" /> Default
                              </span>
                            )}
                          </p>
                          <p className="text-neutral-500 text-xs mt-0.5 flex items-center gap-1.5">
                            <Icon className="w-3 h-3" />
                            {SEAL_KIND_LABELS[seal.kind]}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {!seal.is_default && (
                          <button
                            onClick={() => handleSetDefault(seal)}
                            disabled={busyId === seal.id}
                            title="Set as default"
                            className="inline-flex items-center gap-1.5 text-xs border border-neutral-700 hover:border-amber-200/60 hover:text-amber-200 text-neutral-300 rounded-md px-2.5 py-1.5 transition-colors disabled:opacity-50"
                          >
                            {busyId === seal.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}
                            Set Default
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(seal)}
                          title="Edit name and type"
                          className="inline-flex items-center gap-1.5 text-xs border border-neutral-700 hover:border-neutral-500 text-neutral-300 rounded-md px-2.5 py-1.5 transition-colors"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(seal)}
                          disabled={busyId === seal.id}
                          title="Delete seal"
                          className="inline-flex items-center gap-1.5 text-xs border border-red-900/50 hover:border-red-700 text-red-400 rounded-md px-2.5 py-1.5 transition-colors disabled:opacity-50"
                        >
                          {busyId === seal.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
