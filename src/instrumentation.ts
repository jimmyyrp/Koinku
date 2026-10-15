export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      // Migrasi otomatis: seed & index MongoDB berjalan saat server pertama kali start.
      const { runMigrations } = await import('./lib/schema');
      const result = await runMigrations();
      console.log('[Migration] Database MongoDB siap:', JSON.stringify(result));
    } catch (err) {
      console.error('[Migration] Gagal menjalankan migrasi otomatis:', err);
    }
  }
}