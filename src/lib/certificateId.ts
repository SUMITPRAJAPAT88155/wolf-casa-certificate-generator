import { supabase } from '@/lib/supabase';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateCertificateId(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let suffix = '';
  for (const b of bytes) suffix += ALPHABET[b % ALPHABET.length];
  return `WC-${new Date().getFullYear()}-${suffix}`;
}

export async function generateUniqueCertificateId(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const certificateId = generateCertificateId();
    const { data, error } = await supabase
      .from('certificates')
      .select('id')
      .eq('certificate_id', certificateId)
      .maybeSingle();

    if (error) throw new Error(`Could not check certificate ID uniqueness: ${error.message}`);
    if (!data) return certificateId;
  }

  throw new Error('Could not generate an unused certificate ID. Please try again.');
}
