/** Public site URL for QR codes and links (set in production: NEXT_PUBLIC_SITE_URL). */
export function getConfiguredSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return 'http://localhost:3000';
}

/** Best URL for table menu links — uses current browser origin when available. */
export function getTableMenuUrl(tableNumber: number, origin?: string): string {
  const base = (origin ?? getConfiguredSiteUrl()).replace(/\/$/, '');
  return `${base}/table/${tableNumber}`;
}

export function getQrImageUrl(tableMenuUrl: string, size = 250): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(tableMenuUrl)}`;
}
