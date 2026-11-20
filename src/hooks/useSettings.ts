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
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (!error) setSettings(data);
    setLoading(false);
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

  return { settings: settings ?? null, fallback: FALLBACK, loading, save, reload: load };
}
