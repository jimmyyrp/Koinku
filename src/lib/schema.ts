import { getDb } from './mongodb';
import { ObjectId } from 'mongodb';
import { INITIAL_CATEGORIES } from '../app/lib/types';
import { normalizeCategoryId, seedCounter, toIntId } from './id';

export const COLLECTIONS = ['profiles', 'categories', 'transactions', 'counters'] as const;

export const DEFAULT_PROFILE = {
  _id: 'global',
  initialBalance: 0,
  emergencyFundTarget: 20000000,
  updatedAt: '',
};

export interface MigrationResult {
  ok: boolean;
  collections: string[];
  indexesCreated: string[];
  profilesUpserted: number;
  categoriesSeeded: number;
  legacyMigrated: { categories: number; transactions: number };
}

async function migrateLegacyIds(db: Awaited<ReturnType<typeof getDb>>) {
  const migrated = { categories: 0, transactions: 0 };

  // Koleksi ini masih memakai id string (misal `cat-3`, `TX-xxx`).
  // Lepas dulu index unik agar proses konversi tidak terblokir.
  for (const name of ['categories', 'transactions'] as const) {
    try {
      await db.collection(name).dropIndex('id_1');
    } catch {
      // index belum ada — abaikan
    }
  }

  // ---- Kategori: string id -> int ----
  const catColl = db.collection('categories');
  const catDocs = await catColl.find({}).toArray();
  let maxCatId = 0;
  for (const d of catDocs) {
    if (typeof d.id === 'number') maxCatId = Math.max(maxCatId, d.id);
  }
  let nextFreeCat = maxCatId + 1;
  const takenCat = new Set<number>();
  const catIdMap = new Map<string, number>();
  const catChanges: Array<{ _id: ObjectId; id: number }> = [];

  for (const d of catDocs) {
    const raw = d.id;
    let newId: number | null = typeof raw === 'number' ? raw : null;
    if (newId == null && typeof raw === 'string') {
      const n = toIntId(raw);
      const legacy = /^cat-(\d+)$/.exec(raw);
      newId = n ?? (legacy ? Number(legacy[1]) : null);
    }
    if (newId == null || takenCat.has(newId)) {
      newId = nextFreeCat;
      while (takenCat.has(newId)) newId++;
      nextFreeCat = newId + 1;
    }
    takenCat.add(newId);
    catIdMap.set(String(raw), newId);
    if (typeof raw !== 'number' || raw !== newId) {
      catChanges.push({ _id: d._id as ObjectId, id: newId });
    }
  }
  for (const c of catChanges) {
    await catColl.updateOne({ _id: c._id }, { $set: { id: c.id } });
  }
  migrated.categories = catChanges.length;

  // ---- Transaksi: string id -> int, category_id -> int ----
  const txColl = db.collection('transactions');
  const txDocs = await txColl.find({}).sort({ date: 1, _id: 1 }).toArray();
  let maxTxId = 0;
  for (const d of txDocs) {
    if (typeof d.id === 'number') maxTxId = Math.max(maxTxId, d.id);
  }
  let nextFreeTx = maxTxId + 1;
  const takenTx = new Set<number>();
  const txChanges: Array<{ _id: ObjectId; id: number; categoryId: number | null }> = [];

  for (const d of txDocs) {
    const raw = d.id;
    let newId = typeof raw === 'number' ? raw : null;
    if (newId == null && typeof raw === 'string') {
      newId = toIntId(raw);
    }
    if (newId == null || takenTx.has(newId)) {
      newId = nextFreeTx;
      while (takenTx.has(newId)) newId++;
      nextFreeTx = newId + 1;
    }
    takenTx.add(newId);

    let catId = normalizeCategoryId(d.category_id ?? d.categoryId);
    if (catId == null) {
      catId = catIdMap.get(String(d.category_id ?? d.categoryId)) ?? null;
    }
    const oldCatId = d.category_id ?? d.categoryId ?? null;
    if (typeof raw !== 'number' || raw !== newId || oldCatId !== catId) {
      txChanges.push({ _id: d._id as ObjectId, id: newId, categoryId: catId });
    }
  }
  for (const c of txChanges) {
    await txColl.updateOne(
      { _id: c._id },
      { $set: { id: c.id, category_id: c.categoryId, categoryId: c.categoryId } }
    );
  }
  migrated.transactions = txChanges.length;

  return migrated;
}

export async function runMigrations(): Promise<MigrationResult> {
  const db = await getDb();
  const result: MigrationResult = {
    ok: false,
    collections: [],
    indexesCreated: [],
    profilesUpserted: 0,
    categoriesSeeded: 0,
    legacyMigrated: { categories: 0, transactions: 0 },
  };

  // 1. Pastikan semua koleksi terdaftar (MongoDB membuat koleksi otomatis saat insert pertama)
  const existingCollections = await db.listCollections().toArray();
  const existingNames = new Set(existingCollections.map((c) => c.name));
  for (const name of COLLECTIONS) {
    result.collections.push(name);
    if (!existingNames.has(name)) {
      await db.createCollection(name);
    }
  }

  // 2. Konversi id string (legacy: `cat-3`, `TX-xxx`) menjadi int (efisiensi storage & query)
  result.legacyMigrated = await migrateLegacyIds(db);

  // 3. Index Unik untuk melindungi integritas data (hindari duplikat id)
  const indexTargets: Array<{ coll: string; spec: Record<string, number>; unique?: boolean }> = [
    { coll: 'categories', spec: { id: 1 }, unique: true },
    { coll: 'transactions', spec: { id: 1 }, unique: true },
    { coll: 'transactions', spec: { date: -1 } },
    { coll: 'profiles', spec: { _id: 1 } },
  ];

  for (const target of indexTargets) {
    try {
      await db.collection(target.coll).createIndex(target.spec, {
        ...(target.unique ? { unique: true } : {}),
      });
      result.indexesCreated.push(`${target.coll}:${JSON.stringify(target.spec)}`);
    } catch (err) {
      console.warn(`[Migration] Index gagal dibuat untuk ${target.coll}:`, err);
    }
  }

  // 4. Seed Profil default (hanya jika belum ada — tidak menimpa data user)
  const profileColl = db.collection<typeof DEFAULT_PROFILE>('profiles');
  const seeded = await profileColl.updateOne(
    { _id: 'global' },
    {
      $setOnInsert: {
        ...DEFAULT_PROFILE,
        updatedAt: new Date().toISOString(),
      },
    },
    { upsert: true }
  );
  if (seeded.upsertedCount > 0) result.profilesUpserted = seeded.upsertedCount;

  // 5. Seed Kategori sistem (id int 1..16, hanya yang belum ada — menghormati kategori yang dihapus user)
  const categoryColl = db.collection('categories');

  // 5a. Migrasi label lama: kategori lama bernuansa kuliah diubah ke versi profesional
  const legacyRename = await categoryColl.updateMany(
    { name: { $in: ['Kost & Sewa', 'Kost'] } },
    { $set: { name: 'Sewa Rumah / KPR' } }
  );
  if (legacyRename.modifiedCount > 0) {
    result.categoriesSeeded += legacyRename.modifiedCount;
  }

  for (const cat of INITIAL_CATEGORIES) {
    const res = await categoryColl.updateOne(
      { id: cat.id },
      {
        $setOnInsert: {
          id: cat.id,
          name: cat.name,
          type: cat.type,
          color: cat.color,
          budget: cat.budget ?? 0,
          createdAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
    if (res.upsertedCount > 0) result.categoriesSeeded += 1;
  }

  // 6. Sinkronkan counter auto-increment agar tidak menabrak id yang sudah ada
  await seedCounter(db, 'categories');
  await seedCounter(db, 'transactions');

  result.ok = true;
  return result;
}