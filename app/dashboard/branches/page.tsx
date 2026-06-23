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
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Branch = {
  id: string;
  name: string;
  location: string;
  username: string;
  active: boolean;
  createdAt: string;
};

export default function DashboardBranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteBranch, setDeleteBranch] = useState<Branch | null>(null);

  function loadBranches() {
    fetch("/api/branches")
      .then((res) => (res.ok ? res.json() : []))
      .then(setBranches)
      .catch(() => setBranches([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (editBranch) {
      setName(editBranch.name);
      setLocation(editBranch.location);
      setUsername(editBranch.username);
      setPassword("");
    }
  }, [editBranch]);

  function resetForm() {
    setName("");
    setLocation("");
    setUsername("");
    setPassword("");
    setError(null);
  }

  function openAdd() {
    resetForm();
    setAddOpen(true);
  }

  function openEdit(branch: Branch) {
    setEditBranch(branch);
  }

  async function confirmDeleteBranch() {
    if (!deleteBranch) return;
    const { id } = deleteBranch;
    setDeleteBranch(null);
    setError(null);
    try {
      const res = await fetch(`/api/branches/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to delete branch");
      else {
        setSuccess("Branch deleted.");
        loadBranches();
      }
    } catch {
      setError("Something went wrong");
    }
  }

  async function handleToggleActive(branch: Branch) {
    setTogglingId(branch.id);
    setError(null);
    try {
      const res = await fetch(`/api/branches/${branch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !branch.active }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update status");
        return;
      }
      setBranches((prev) =>
        prev.map((b) => (b.id === branch.id ? { ...b, active: data.active } : b))
      );
    } catch {
      setError("Something went wrong");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, location, username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add branch");
        return;
      }
      setSuccess("Branch added successfully");
      setAddOpen(false);
      resetForm();
      loadBranches();
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editBranch) return;
    setError(null);
    setSubmitting(true);
    try {
      const body: {
        name: string;
        location: string;
        username: string;
        password?: string;
      } = {
        name: name.trim(),
        location: location.trim(),
        username: username.trim(),
      };
      if (password.trim()) body.password = password;
      const res = await fetch(`/api/branches/${editBranch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update branch");
        return;
      }
      setSuccess("Branch updated successfully");
      setEditBranch(null);
      resetForm();
      loadBranches();
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6">
      <header className="glass-panel-strong mb-8 flex flex-col gap-4 rounded-2xl px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Dashboard
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Branches
          </h1>
          <p className="text-sm text-foreground/70">
            Add and manage branches (name, location, kiosk and display login)
          </p>
        </div>
        <Button onClick={openAdd} variant="outline" className="h-11 shrink-0">
          Add branch
        </Button>
      </header>

      {(error || success) && (
        <div className="mb-4">
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="text-primary text-sm" role="status">
              {success}
            </p>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All branches</CardTitle>
          <CardDescription>
            Branches with separate kiosk and display queues. Toggle status to set active or inactive.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-foreground/55">Loading…</p>
          ) : branches.length === 0 ? (
            <p className="text-sm text-foreground/55">
              No branches yet. Click “Add branch” to create one.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-card/40 backdrop-blur-sm">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Username</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((b) => (
                    <tr key={b.id} className="border-b border-white/10 last:border-0">
                      <td className="px-4 py-3 font-medium">{b.name}</td>
                      <td className="px-4 py-3 text-foreground/55">{b.location}</td>
                      <td className="px-4 py-3 text-foreground/55">{b.username}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={b.active}
                            onCheckedChange={() => handleToggleActive(b)}
                            disabled={togglingId === b.id}
                            aria-label={b.active ? "Active" : "Inactive"}
                          />
                          <span className="text-xs text-foreground/55">
                            {b.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground/55">
                        {new Date(b.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => openEdit(b)}>
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeleteBranch(b)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add branch</DialogTitle>
            <DialogDescription>
              Enter branch details and login credentials. Password must be at least 6 characters.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            {error && addOpen && (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="add-branch-name">Branch name</Label>
              <Input
                id="add-branch-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Main Branch"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-branch-location">Location</Label>
              <Input
                id="add-branch-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Kampala"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-branch-username">Username</Label>
              <Input
                id="add-branch-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="branch1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-branch-password">Password</Label>
              <Input
                id="add-branch-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Adding…" : "Add branch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editBranch} onOpenChange={(open) => !open && setEditBranch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit branch</DialogTitle>
            <DialogDescription>
              Update branch details. Leave password blank to keep the current one.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            {error && editBranch && (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-branch-name">Branch name</Label>
              <Input
                id="edit-branch-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Main Branch"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-branch-location">Location</Label>
              <Input
                id="edit-branch-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Kampala"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-branch-username">Username</Label>
              <Input
                id="edit-branch-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="branch1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-branch-password">New password (optional)</Label>
              <Input
                id="edit-branch-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                minLength={6}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditBranch(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteBranch} onOpenChange={(open) => !open && setDeleteBranch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete branch</AlertDialogTitle>
            <AlertDialogDescription>
              Delete branch “{deleteBranch?.name}” ({deleteBranch?.location})? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteBranch}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
