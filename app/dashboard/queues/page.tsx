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
import { ChevronDown, ChevronRight } from "lucide-react";

type Service = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string | null;
  createdAt: string;
};

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  services: Service[];
};

export default function DashboardQueuesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [topLevelServices, setTopLevelServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [deleteService, setDeleteService] = useState<{ id: string; name: string } | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<{ id: string; name: string } | null>(null);

  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [addQueueOpen, setAddQueueOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);

  const [categoryName, setCategoryName] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [serviceCategoryId, setServiceCategoryId] = useState<string>("");

  function load() {
    setLoading(true);
    Promise.all([
      fetch("/api/categories").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/services").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([cats, allServices]: [Category[], (Service & { category?: { id: string } })[]]) => {
        setCategories(cats);
        setTopLevelServices(allServices.filter((s) => !s.categoryId));
      })
      .catch(() => {
        setCategories([]);
        setTopLevelServices([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (editCategory) setCategoryName(editCategory.name);
  }, [editCategory]);

  useEffect(() => {
    if (editService) {
      setServiceName(editService.name);
      setServiceDescription(editService.description || "");
      setServiceCategoryId(editService.categoryId || "");
    }
  }, [editService]);

  function toggleCategory(id: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resetQueueForm() {
    setServiceName("");
    setServiceDescription("");
    setServiceCategoryId("");
    setError(null);
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add category");
        return;
      }
      setSuccess("Category added.");
      setAddCategoryOpen(false);
      setCategoryName("");
      load();
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!editCategory) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/categories/${editCategory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update category");
        return;
      }
      setSuccess("Category updated.");
      setEditCategory(null);
      load();
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
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
          categoryId: serviceCategoryId.trim() || undefined,
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
          categoryId: serviceCategoryId.trim() || undefined,
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

  function openDeleteCategory(id: string, name: string) {
    setDeleteCategory({ id, name });
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

  async function confirmDeleteCategory() {
    if (!deleteCategory) return;
    const { id } = deleteCategory;
    setDeleteCategory(null);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to delete");
      else load();
    } catch {
      setError("Something went wrong");
    }
  }

  return (
    <div className="p-6">
      <header className="glass-panel-strong -mx-6 -mt-6 mb-8 flex flex-col gap-4 rounded-b-2xl border-x-0 border-t-0 px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Dashboard
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Queues
          </h1>
          <p className="text-sm text-muted-foreground">
            Organise queues under categories (e.g. Teller Services → Deposit, Withdraw)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setCategoryName("");
              setAddCategoryOpen(true);
            }}
          >
            Add category
          </Button>
          <Button
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
            Categories and queues shown at the kiosk
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : categories.length === 0 && topLevelServices.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No categories or queues yet. Click “Add category” or “Add queue” to get started.
            </p>
          ) : (
            <ul className="space-y-2">
              {categories.map((cat) => {
                const expanded = expandedCategories.has(cat.id);
                return (
                  <li key={cat.id} className="rounded-lg border border-border">
                    <div className="flex items-center justify-between gap-2 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className="flex flex-1 items-center gap-2 text-left font-medium"
                      >
                        {cat.services.length > 0 ? (
                          expanded ? (
                            <ChevronDown className="size-4 shrink-0" />
                          ) : (
                            <ChevronRight className="size-4 shrink-0" />
                          )
                        ) : (
                          <span className="w-4" />
                        )}
                        {cat.name}
                        <span className="text-muted-foreground text-xs font-normal">
                          ({cat.services.length} queue{cat.services.length !== 1 ? "s" : ""})
                        </span>
                      </button>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditCategory(cat)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => openDeleteCategory(cat.id, cat.name)}
                          disabled={cat.services.length > 0}
                          title={cat.services.length > 0 ? "Remove queues first" : "Delete category"}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    {expanded && cat.services.length > 0 && (
                      <ul className="border-t border-border bg-muted/30 px-3 py-2">
                        {cat.services.map((s) => (
                          <li
                            key={s.id}
                            className="flex items-center justify-between gap-2 py-2 pl-6"
                          >
                            <div>
                              <p className="font-medium">{s.name}</p>
                              {s.description && (
                                <p className="text-muted-foreground text-sm">{s.description}</p>
                              )}
                            </div>
                            <div className="flex gap-1">
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
                  </li>
                );
              })}
              {topLevelServices.length > 0 && (
                <li className="rounded-lg border border-border">
                  <div className="px-3 py-2 font-medium text-muted-foreground">
                    Top level
                  </div>
                  <ul className="border-t border-border bg-muted/30 px-3 py-2">
                    {topLevelServices.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between gap-2 py-2 pl-2"
                      >
                        <div>
                          <p className="font-medium">{s.name}</p>
                          {s.description && (
                            <p className="text-muted-foreground text-sm">{s.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
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
                </li>
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add category</DialogTitle>
            <DialogDescription>
              A category groups queues (e.g. “Teller Services”).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCategory} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="dialog-cat-name">Name</Label>
              <Input
                id="dialog-cat-name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g. Teller Services"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddCategoryOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Adding…" : "Add category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editCategory} onOpenChange={(open) => !open && setEditCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
            <DialogDescription>Change the category name.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditCategory} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-cat-name">Name</Label>
              <Input
                id="edit-cat-name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g. Teller Services"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditCategory(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
            <div className="space-y-2">
              <Label htmlFor="dialog-queue-category">Under category</Label>
              <select
                id="dialog-queue-category"
                value={serviceCategoryId}
                onChange={(e) => setServiceCategoryId(e.target.value)}
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                <option value="">Top level (no category)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
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
              Update the queue name, description or category.
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
            <div className="space-y-2">
              <Label htmlFor="edit-queue-category">Under category</Label>
              <select
                id="edit-queue-category"
                value={serviceCategoryId}
                onChange={(e) => setServiceCategoryId(e.target.value)}
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                <option value="">Top level (no category)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
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

      <AlertDialog open={!!deleteCategory} onOpenChange={(open) => !open && setDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category</AlertDialogTitle>
            <AlertDialogDescription>
              Delete category “{deleteCategory?.name}”? Only empty categories can be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCategory}
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
