export function normalizeCategoryId(id: unknown): number | null {
  if (typeof id === 'number' && Number.isInteger(id)) return id;
  if (typeof id === 'string') {
    const numeric = Number(id);
    if (Number.isInteger(numeric)) return numeric;
    const legacy = /^cat-(\d+)$/.exec(id);
    if (legacy) return Number(legacy[1]);
  }
  return null;
}

export function toIntId(id: unknown): number | null {
  if (typeof id === 'number' && Number.isInteger(id)) return id;
  if (typeof id === 'string' && /^-?\d+$/.test(id)) return parseInt(id, 10);
  return null;
}