import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AppSettings } from '@/lib/types';

const FALLBACK: Omit<AppSettings, 'id' | 'user_id' | 'updated_at'> = {
  company_name: 'Wolf Casa',
  director_name: '',
  course_name: '',
  default_issue_date: null,
  logo_url: null,
  signature_url: null,
  allow_public_download: true,
  seal_enabled: true,
  seal_size: 110,
  seal_position: 'bottom_left',
  selected_seal_id: null,
  selected_stamp_id: null,
  selected_signature_id: null,
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      setSettings(data);
    } catch (error) {
      setSettings(null);
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(patch: Partial<AppSettings>): Promise<string | null> {
    if (!settings) {
      const { data, error } = await supabase
        .from('app_settings')
        .insert({ ...FALLBACK, ...patch })
        .select()
        .single();
      if (error) return error.message;
      setSettings(data);
      return null;
    }
    const { data, error } = await supabase
      .from('app_settings')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', settings.id)
      .select()
      .single();
    if (error) return error.message;
    setSettings(data);
    return null;
  }

  return { settings: settings ?? null, fallback: FALLBACK, loading, loadError, save, reload: load };
}
