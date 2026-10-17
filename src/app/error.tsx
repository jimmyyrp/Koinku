"use client"

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Error:', error);
  }, [error]);

  return (
    <div className="min-h-[100dvh] w-full bg-background flex items-center justify-center p-6">
      <div className="soft-card max-w-md w-full text-center space-y-5">
        <div className="h-14 w-14 mx-auto rounded-2xl bg-rose-50 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-rose-500" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold tracking-tight">Terjadi kesalahan</h2>
          <p className="text-sm text-muted-foreground">
            Aplikasi mengalami masalah tak terduga. Coba muat ulang halaman ini.
          </p>
        </div>
        <Button
          onClick={reset}
          className="w-full h-12 bg-primary text-white hover:bg-primary/90 font-semibold rounded-2xl flex gap-2"
        >
          <RotateCcw className="h-4 w-4" /> Muat Ulang
        </Button>
      </div>
    </div>
  );
}
