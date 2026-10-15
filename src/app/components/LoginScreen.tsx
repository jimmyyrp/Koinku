"use client"

import React, { useState, FormEvent } from 'react';
import { Lock, Loader2, CreditCard, User as UserIcon, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface LoginScreenProps {
  onLogin: (username: string, password: string) => Promise<{ ok: boolean; message?: string }>;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('koinku_db_user');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Username dan password wajib diisi');
      return;
    }
    setIsLoading(true);
    setError('');
    const result = await onLogin(username, password);
    setIsLoading(false);
    if (!result.ok) setError(result.message || 'Username atau password salah');
  };

  return (
    <div className="h-[100dvh] w-full bg-background flex items-center justify-center overflow-y-auto no-scrollbar p-4 sm:p-6 relative">
      <div className="fixed -top-20 -left-20 h-72 w-72 bg-secondary rounded-full opacity-30 blur-2xl pointer-events-none" />
      <div className="fixed -bottom-24 -right-16 h-80 w-80 bg-primary rounded-full opacity-20 blur-2xl pointer-events-none" />

      <div className="w-full max-w-md relative py-4">
        <form onSubmit={handleSubmit} className="neo-card p-6 sm:p-8 md:p-10 space-y-5 sm:space-y-6 animate-in fade-in zoom-in-95">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="h-16 w-16 sm:h-20 sm:w-20 bg-black neo-border border-white rounded-[28px] flex items-center justify-center neo-shadow-sm animate-float">
              <CreditCard className="text-white h-8 w-8 sm:h-10 sm:w-10" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter">KOIN KU</h1>
              <p className="text-[10px] font-black uppercase opacity-40 mt-2 tracking-widest italic">Secure Financial Vault</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="koinku-username" className="text-[10px] font-black uppercase opacity-40 tracking-widest flex items-center gap-2">
                <UserIcon className="h-3.5 w-3.5" /> Username Database
              </label>
              <Input
                id="koinku-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="koinku_db_user"
                autoComplete="username"
                className="neo-border h-14 rounded-2xl font-black px-5 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="koinku-password" className="text-[10px] font-black uppercase opacity-40 tracking-widest flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5" /> Password Database
              </label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 opacity-30" />
                <Input
                  id="koinku-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="neo-border h-14 rounded-2xl font-black pl-12 pr-5 text-sm"
                />
              </div>
            </div>

            {error && (
              <p className="text-[11px] font-bold text-red-600 bg-red-50 border-2 border-red-200 rounded-xl px-4 py-3">
                {error}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className={cn(
              "w-full h-14 sm:h-16 neo-border bg-black text-white hover:bg-primary font-black uppercase text-[12px] rounded-[24px] flex gap-3 transition-all neo-interactive",
              isLoading && "opacity-70 pointer-events-none"
            )}
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
            {isLoading ? 'Memverifikasi...' : 'Masuk'}
          </Button>

          <p className="text-center text-[9px] font-black uppercase opacity-30 tracking-widest">
            Solo Edition · MongoDB Atlas Secure Access
          </p>
        </form>
      </div>
    </div>
  );
}
