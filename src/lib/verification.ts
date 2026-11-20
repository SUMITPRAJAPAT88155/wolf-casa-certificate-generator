export function verificationBaseUrl(): string {
  const configuredBaseUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  const baseUrl = configuredBaseUrl || window.location.origin;
  const parsedUrl = new URL(baseUrl);
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    throw new Error('VITE_PUBLIC_APP_URL must use HTTP or HTTPS.');
  }
  return `${parsedUrl.origin}${parsedUrl.pathname.replace(/\/+$/, '')}/verify`;
}

export function buildVerificationUrl(certificateId: string): string {
  return `${verificationBaseUrl()}/${encodeURIComponent(certificateId)}`;
}
