import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Seal, SealKind } from '@/lib/types';

export const SEAL_BUCKET = 'seals';
export const MAX_SEAL_SIZE = 2 * 1024 * 1024;

export function publicSealUrl(storagePath: string): string {
  const { data } = supabase.storage.from(SEAL_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function uploadSealImage(file: File): Promise<{ path: string } | { error: string }> {
  if (!file.type.startsWith('image/')) {
    return { error: 'Please choose an image file (PNG or JPG).' };
  }
  if (file.size > MAX_SEAL_SIZE) {
    return { error: 'Image is too large. Please use an image under 2 MB.' };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in to upload.' };

  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'png';
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(SEAL_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '3600',
  });
  if (error) return { error: 'Upload failed. Please try again.' };
  return { path };
}

export async function deleteSealImage(storagePath: string): Promise<string | null> {
  const { error } = await supabase.storage.from(SEAL_BUCKET).remove([storagePath]);
  return error ? 'Could not delete the image file.' : null;
}

export function useSeals() {
  const [seals, setSeals] = useState<Seal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('seals')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setSeals(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { seals, loading, reload: load };
}

export const SEAL_KIND_LABELS: Record<SealKind, string> = {
  company_seal: 'Company Seal',
  signatory_stamp: 'Signatory Stamp',
  director_signature: 'Director Signature',
};
