import { MongoClient, ServerApiVersion, type MongoClientOptions } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI belum dikonfigurasi di .env.local');
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const OPTIONS: MongoClientOptions = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  // Gagal cepat agar UI tidak menunggu lama bila database tidak terjangkau
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  maxPoolSize: 10,
};

const IS_DEV = process.env.NODE_ENV === 'development';

let clientPromise: Promise<MongoClient> | undefined = IS_DEV
  ? global._mongoClientPromise
  : undefined;

function ensureClient(): Promise<MongoClient> {
  if (!clientPromise) {
    clientPromise = new MongoClient(uri!, OPTIONS).connect();
    // Tambahkan handler agar kegagalan koneksi tidak memicu unhandled rejection
    clientPromise.catch(() => undefined);
    if (IS_DEV) global._mongoClientPromise = clientPromise;
  }
  return clientPromise;
}

export async function getClient(): Promise<MongoClient> {
  const pending = ensureClient();
  try {
    return await pending;
  } catch (err) {
    // Koneksi gagal -> lepas cache supaya request berikutnya mencoba ulang
    // (mencegah status "database mati" menempel selamanya saat koneksi pulih)
    if (clientPromise === pending) {
      clientPromise = undefined;
      if (IS_DEV) global._mongoClientPromise = undefined;
    }
    throw err;
  }
}

export async function getDb() {
  const client = await getClient();
  return client.db(process.env.MONGODB_DB || 'koinku');
}
