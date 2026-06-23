"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function KioskLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    fetch("/api/auth/branch/me")
      .then((res) => {
        if (res.ok) router.replace("/kiosk");
      })
      .catch(() => {})
      .finally(() => setCheckingAuth(false));
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/branch/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      router.replace("/menu");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="glass-panel-strong rounded-2xl px-10 py-8">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 overflow-hidden bg-blend-void sm:block">
        <Image
          src="/market.jpg"
          alt=""
          fill
          className="object-cover"
          priority
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-blend-void/80 via-blend-void/15 to-background/40" />
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 bg-card/45 px-8 py-5 text-foreground backdrop-blur-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Menu
          </p>
          <p className="text-lg font-semibold leading-snug">Customer self-service</p>
        </div>
      </div>

      <div className="glass-panel flex w-full flex-col justify-center rounded-none px-8 py-12 sm:w-1/2 sm:max-w-md sm:rounded-l-3xl sm:border-l sm:px-12 lg:px-16">
        <div className="w-full">
          <Image
            src="/logo.png"
            alt="Company logo"
            width={200}
            height={91}
            className="mb-6 h-16 w-auto object-contain"
            priority
          />
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Sign in
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Menu sign in
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to open the customer menu
          </p>

          <form onSubmit={handleLogin} className="mt-8 flex flex-col gap-4">
            {error && (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="branch1"
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-11"
              />
            </div>
            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
