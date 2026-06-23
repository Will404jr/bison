"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Settings = {
  apiKey: string;
  apiUrl: string;
  adminUsername: string;
  hasAdminPassword: boolean;
};

export default function DashboardSettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Settings | null) => {
        if (data) {
          setApiKey(data.apiKey ?? "");
          setApiUrl(data.apiUrl ?? "");
          setAdminUsername(data.adminUsername ?? "");
        }
      })
      .catch(() => setError("Failed to load settings"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const body: { apiKey?: string; apiUrl?: string; adminUsername?: string; adminPassword?: string } = {
        apiKey: apiKey.trim() || undefined,
        apiUrl: apiUrl.trim() || undefined,
        adminUsername: adminUsername.trim() || undefined,
      };
      if (adminPassword.trim()) body.adminPassword = adminPassword.trim();
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
        return;
      }
      setSuccess("Settings saved.");
      setAdminPassword("");
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <header className="glass-panel-strong mb-8 rounded-2xl px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Dashboard
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-foreground/70">
          Edit API URL, API key, admin username and admin password.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>App settings</CardTitle>
          <CardDescription>
            API URL, API key and admin credentials. Leave password blank to keep the current one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-foreground/55">Loading…</p>
          ) : (
            <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
              {error && (
                <p className="text-destructive text-sm" role="alert">
                  {error}
                </p>
              )}
              {success && (
                <p className="text-sm text-primary" role="status">
                  {success}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="apiUrl">API URL</Label>
                <Input
                  id="apiUrl"
                  type="url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://api.example.com"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKey">API key</Label>
                <Input
                  id="apiKey"
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Your API key"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminUsername">Admin username</Label>
                <Input
                  id="adminUsername"
                  type="text"
                  autoComplete="username"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="Admin username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminPassword">Admin password</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  autoComplete="new-password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                />
                <p className="text-xs text-foreground/55">
                  Min 6 characters. Only change if you want to set a new password.
                </p>
              </div>
              <Button type="submit" disabled={saving} className="h-11 w-full sm:w-fit">
                {saving ? "Saving…" : "Save settings"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
