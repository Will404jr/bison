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

type User = {
  id: string;
  email: string;
  username: string;
  active: boolean;
  createdAt: string;
};

export default function DashboardUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  function loadUsers() {
    fetch("/api/users")
      .then((res) => (res.ok ? res.json() : []))
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (editUser) {
      setEmail(editUser.email);
      setUsername(editUser.username);
      setPassword("");
    }
  }, [editUser]);

  function resetForm() {
    setEmail("");
    setUsername("");
    setPassword("");
    setError(null);
  }

  function openAdd() {
    resetForm();
    setAddOpen(true);
  }

  function openEdit(user: User) {
    setEditUser(user);
  }

  async function confirmDeleteUser() {
    if (!deleteUser) return;
    const { id } = deleteUser;
    setDeleteUser(null);
    setError(null);
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to delete user");
      else {
        setSuccess("User deleted.");
        loadUsers();
      }
    } catch {
      setError("Something went wrong");
    }
  }

  async function handleToggleActive(user: User) {
    setTogglingId(user.id);
    setError(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !user.active }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update status");
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, active: data.active } : u))
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
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add user");
        return;
      }
      setSuccess("User added successfully");
      setAddOpen(false);
      resetForm();
      loadUsers();
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setError(null);
    setSubmitting(true);
    try {
      const body: { email: string; username: string; password?: string } = {
        email: email.trim(),
        username: username.trim(),
      };
      if (password.trim()) body.password = password;
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update user");
        return;
      }
      setSuccess("User updated successfully");
      setEditUser(null);
      resetForm();
      loadUsers();
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-muted-foreground text-sm">
            Add and manage dashboard users (email, username, password)
          </p>
        </div>
        <Button onClick={openAdd}>Add user</Button>
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
          <CardTitle>All users</CardTitle>
          <CardDescription>Users that can access the dashboard. Toggle status to set active or inactive.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground text-sm">No users yet. Click “Add user” to create one.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 font-medium">Username</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium">{u.username}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={u.active}
                            onCheckedChange={() => handleToggleActive(u)}
                            disabled={togglingId === u.id}
                            aria-label={u.active ? "Active" : "Inactive"}
                          />
                          <span className="text-muted-foreground text-xs">
                            {u.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => openEdit(u)}>
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeleteUser(u)}
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
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>
              Enter email, username and password. Password must be at least 6 characters.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            {error && addOpen && (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="add-user-email">Email</Label>
              <Input
                id="add-user-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-user-username">Username</Label>
              <Input
                id="add-user-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="johndoe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-user-password">Password</Label>
              <Input
                id="add-user-password"
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Adding…" : "Add user"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>
              Update email or username. Leave password blank to keep the current one.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            {error && editUser && (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-user-email">Email</Label>
              <Input
                id="edit-user-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-username">Username</Label>
              <Input
                id="edit-user-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="johndoe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-password">New password (optional)</Label>
              <Input
                id="edit-user-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                minLength={6}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditUser(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user</AlertDialogTitle>
            <AlertDialogDescription>
              Delete user “{deleteUser?.username}” ({deleteUser?.email})? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
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
