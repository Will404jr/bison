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

type Service = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
};

export default function DashboardQueuesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteService, setDeleteService] = useState<{ id: string; name: string } | null>(null);

  const [addQueueOpen, setAddQueueOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);

  const [serviceName, setServiceName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");

  function load() {
    setLoading(true);
    fetch("/api/services")
      .then((r) => (r.ok ? r.json() : []))
      .then((allServices: Service[]) => setServices(allServices))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (editService) {
      setServiceName(editService.name);
      setServiceDescription(editService.description || "");
    }
  }, [editService]);

  function resetQueueForm() {
    setServiceName("");
    setServiceDescription("");
    setError(null);
  }

  async function handleAddQueue(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: serviceName.trim(),
          description: serviceDescription.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add queue");
        return;
      }
      setSuccess("Queue added. Customers can select it at the kiosk.");
      setAddQueueOpen(false);
      resetQueueForm();
      load();
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditQueue(e: React.FormEvent) {
    e.preventDefault();
    if (!editService) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/services/${editService.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: serviceName.trim(),
          description: serviceDescription.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update queue");
        return;
      }
      setSuccess("Queue updated.");
      setEditService(null);
      resetQueueForm();
      load();
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function openDeleteService(id: string, name: string) {
    setDeleteService({ id, name });
  }

  async function confirmDeleteService() {
    if (!deleteService) return;
    const { id } = deleteService;
    setDeleteService(null);
    setError(null);
    try {
      const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to delete");
      else load();
    } catch {
      setError("Something went wrong");
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
            Queues
          </h1>
          <p className="text-sm text-foreground/70">
            Manage the queues customers can select at the kiosk (e.g. Deposit, Withdraw)
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            className="h-11"
            onClick={() => {
              resetQueueForm();
              setAddQueueOpen(true);
            }}
          >
            Add queue
          </Button>
        </div>
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
          <CardTitle>All queues</CardTitle>
          <CardDescription>
            Queues shown at the kiosk
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-foreground/55">Loading…</p>
          ) : services.length === 0 ? (
            <p className="text-sm text-foreground/55">
              No queues yet. Click “Add queue” to get started.
            </p>
          ) : (
            <ul className="space-y-2">
              {services.map((s) => (
                <li
                  key={s.id}
                  className="glass-panel flex items-center justify-between gap-2 rounded-xl px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{s.name}</p>
                    {s.description && (
                      <p className="text-sm text-foreground/55">{s.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditService(s)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => openDeleteService(s.id, s.name)}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={addQueueOpen} onOpenChange={setAddQueueOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add queue</DialogTitle>
            <DialogDescription>
              New queues appear as options on the customer kiosk.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddQueue} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="dialog-queue-name">Name</Label>
              <Input
                id="dialog-queue-name"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="e.g. Deposit"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dialog-queue-desc">Description (optional)</Label>
              <Input
                id="dialog-queue-desc"
                value={serviceDescription}
                onChange={(e) => setServiceDescription(e.target.value)}
                placeholder="e.g. Cash deposits"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddQueueOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Adding…" : "Add queue"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editService} onOpenChange={(open) => !open && setEditService(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit queue</DialogTitle>
            <DialogDescription>
              Update the queue name or description.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditQueue} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-queue-name">Name</Label>
              <Input
                id="edit-queue-name"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="e.g. Deposit"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-queue-desc">Description (optional)</Label>
              <Input
                id="edit-queue-desc"
                value={serviceDescription}
                onChange={(e) => setServiceDescription(e.target.value)}
                placeholder="e.g. Cash deposits"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditService(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteService} onOpenChange={(open) => !open && setDeleteService(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete queue</AlertDialogTitle>
            <AlertDialogDescription>
              Delete queue “{deleteService?.name}”? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteService}
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
