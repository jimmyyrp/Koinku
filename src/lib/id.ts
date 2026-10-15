import { Db } from 'mongodb';

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

export async function nextId(db: Db, collName: string): Promise<number> {
  const counters = db.collection<{ _id: string; seq: number }>('counters');
  for (let i = 0; i < 1000; i++) {
    const next = await counters.findOneAndUpdate(
      { _id: collName },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    const seq = next?.seq ?? 1;
    const taken = await db.collection(collName).findOne({ id: seq }, { projection: { _id: 1 } });
    if (!taken) return seq;
  }
  throw new Error(`Gagal mendapatkan ID unik untuk ${collName}`);
}

export async function seedCounter(db: Db, collName: string): Promise<number> {
  const max = await db
    .collection(collName)
    .find({ id: { $type: 'number' } })
    .sort({ id: -1 })
    .limit(1)
    .project({ id: 1, _id: 0 })
    .toArray();
  const highest = max.length > 0 && typeof max[0].id === 'number' ? max[0].id : 0;
  await db.collection<{ _id: string; seq: number }>('counters').updateOne(
    { _id: collName },
    { $max: { seq: highest } },
    { upsert: true }
  );
  return highest;
}