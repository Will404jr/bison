"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Category = { id: string; name: string };

export default function TellerLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tillNumber, setTillNumber] = useState<string>("1");
  const [categoryId, setCategoryId] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    fetch("/api/auth/teller/me")
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data?.needsSetup === false) {
          router.replace("/teller");
          return;
        }
        if (data?.needsSetup === true) {
          setStep(2);
        }
      })
      .catch(() => {})
      .finally(() => setCheckingAuth(false));
  }, [router]);

  useEffect(() => {
    if (step === 2) {
      fetch("/api/categories")
        .then((r) => (r.ok ? r.json() : []))
        .then((cats: { id: string; name: string }[]) => setCategories(cats))
        .catch(() => setCategories([]));
    }
  }, [step]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/teller/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrUsername: emailOrUsername.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      setStep(2);
      setPassword("");
      if (step === 2) {
        const r2 = await fetch("/api/categories");
        if (r2.ok) {
          const cats = await r2.json();
          setCategories(cats);
        }
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/teller/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tillNumber: parseInt(tillNumber, 10),
          categoryId: categoryId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Setup failed");
        return;
      }
      router.replace("/teller");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 overflow-hidden bg-muted sm:block">
        <Image
          src="/market.jpg"
          alt=""
          fill
          className="object-cover"
          priority
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
      </div>

      <div className="flex w-full flex-col justify-center px-8 py-12 sm:w-1/2 sm:max-w-md sm:px-12 lg:px-16">
        <div className="w-full">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Teller sign in
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === 1
              ? "Enter your email or username and password"
              : "Choose your till and the category you will serve"}
          </p>

          {step === 1 ? (
            <form onSubmit={handleLogin} className="mt-8 flex flex-col gap-4">
              {error && (
                <p className="text-destructive text-sm" role="alert">
                  {error}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="emailOrUsername">Email or username</Label>
                <Input
                  id="emailOrUsername"
                  type="text"
                  autoComplete="username"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="you@example.com or johndoe"
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
          ) : (
            <form onSubmit={handleSetup} className="mt-8 flex flex-col gap-4">
              {error && (
                <p className="text-destructive text-sm" role="alert">
                  {error}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="till">Till number</Label>
                <Input
                  id="till"
                  type="number"
                  min={1}
                  step={1}
                  value={tillNumber}
                  onChange={(e) => setTillNumber(e.target.value)}
                  required
                  aria-label="Till number"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category you will serve</Label>
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="border-input h-11 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Category"
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-muted-foreground text-xs">
                  You will only receive tickets from this category until you change it.
                </p>
              </div>
              <Button type="submit" className="h-11 w-full" disabled={loading}>
                {loading ? "Starting…" : "Start serving"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={async () => {
                  await fetch("/api/auth/teller/logout", { method: "POST" });
                  setStep(1);
                  setError(null);
                }}
              >
                Back to sign in
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
