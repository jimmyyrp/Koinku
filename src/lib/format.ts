const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('id-ID');

export const WIB_TIMEZONE = 'Asia/Jakarta';

export function formatCurrency(value: number): string {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatCompactCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} M`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} jt`;
  if (abs >= 1_000) return `${Math.round(value / 1_000)} rb`;
  return String(Math.round(value));
}

export function formatDate(value: string | number | Date): string {
  return new Date(value).toLocaleDateString('id-ID', {
    timeZone: WIB_TIMEZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatShortDate(value: string | number | Date): string {
  return new Date(value).toLocaleDateString('id-ID', { timeZone: WIB_TIMEZONE });
}

export function formatTime(value: string | number | Date): string {
  const time = new Date(value).toLocaleTimeString('id-ID', {
    timeZone: WIB_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${time} WIB`;
}

export function dateKeyWIB(value: string | number | Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: WIB_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

export function nowWIBParts(): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: WIB_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  return { year: get('year'), month: get('month') - 1, day: get('day') };
}
