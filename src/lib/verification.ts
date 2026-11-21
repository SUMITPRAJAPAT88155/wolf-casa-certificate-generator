export function verificationBaseUrl(): string {
  const configuredBaseUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  const baseUrl = configuredBaseUrl || window.location.origin;
  const parsedUrl = new URL(baseUrl);
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    throw new Error('VITE_PUBLIC_APP_URL must use HTTP or HTTPS.');
  }
  if (
    import.meta.env.PROD &&
    (parsedUrl.hostname === 'localhost' ||
      parsedUrl.hostname === '127.0.0.1' ||
      parsedUrl.hostname === '0.0.0.0')
  ) {
    throw new Error('Certificate verification URLs must use the deployed public domain.');
  }
  return `${parsedUrl.origin}${parsedUrl.pathname.replace(/\/+$/, '')}/verify`;
}

export function buildVerificationUrl(certificateId: string | null | undefined): string | null {
  if (typeof certificateId !== 'string') return null;
  const normalizedId = certificateId.trim();
  if (!normalizedId) return null;
  return `${verificationBaseUrl()}/${encodeURIComponent(normalizedId)}`;
}
