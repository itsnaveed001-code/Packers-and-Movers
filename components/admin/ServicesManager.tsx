'use client';

import * as React from 'react';
import { Eye, EyeOff, Pencil, Plus, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { formatINR } from '@/lib/utils';
import type { Service } from '@/types/database';

type EditDraft = Partial<
  Pick<
    Service,
    | 'name'
    | 'slug'
    | 'short_description'
    | 'description'
    | 'base_price'
    | 'duration_hours'
    | 'icon_name'
    | 'display_order'
  >
>;

export function ServicesManager({ initialServices }: { initialServices: Service[] }) {
  const { show } = useToast();
  const [services, setServices] = React.useState<Service[]>(initialServices);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<EditDraft>({});
  const [creating, setCreating] = React.useState(false);
  const [newDraft, setNewDraft] = React.useState({
    name: '',
    slug: '',
    short_description: '',
    description: '',
    base_price: '',
    duration_hours: '4',
    icon_name: 'truck',
  });

  function startEdit(s: Service) {
    setEditId(s.id);
    setDraft({
      name: s.name,
      slug: s.slug,
      short_description: s.short_description,
      description: s.description,
      base_price: s.base_price,
      duration_hours: s.duration_hours,
      icon_name: s.icon_name,
      display_order: s.display_order,
    });
  }

  async function saveEdit() {
    if (!editId) return;
    const res = await fetch(`/api/admin/services/${editId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      show({
        variant: 'error',
        title: "Couldn't save",
        description: body.error,
      });
      return;
    }
    const body = (await res.json()) as { service: Service };
    setServices((prev) => prev.map((s) => (s.id === body.service.id ? body.service : s)));
    setEditId(null);
    setDraft({});
    show({ variant: 'success', title: 'Saved' });
  }

  async function toggleActive(s: Service) {
    const res = await fetch(`/api/admin/services/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !s.is_active }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      show({
        variant: 'error',
        title: "Couldn't update",
        description: body.error,
      });
      return;
    }
    const body = (await res.json()) as { service: Service };
    setServices((prev) => prev.map((row) => (row.id === body.service.id ? body.service : row)));
  }

  async function createNew() {
    if (!newDraft.name || !newDraft.slug || !newDraft.short_description) {
      show({
        variant: 'error',
        title: 'Name, slug and short description are required',
      });
      return;
    }
    const res = await fetch('/api/admin/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newDraft.name,
        slug: newDraft.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        short_description: newDraft.short_description,
        description: newDraft.description || newDraft.short_description,
        base_price: newDraft.base_price ? Number(newDraft.base_price) * 100 : null,
        duration_hours: Number(newDraft.duration_hours) || 4,
        icon_name: newDraft.icon_name || 'truck',
        display_order: services.length + 1,
        is_active: true,
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      show({
        variant: 'error',
        title: "Couldn't create",
        description: body.error,
      });
      return;
    }
    const body = (await res.json()) as { service: Service };
    setServices((prev) =>
      [...prev, body.service].sort((a, b) => a.display_order - b.display_order),
    );
    setCreating(false);
    setNewDraft({
      name: '',
      slug: '',
      short_description: '',
      description: '',
      base_price: '',
      duration_hours: '4',
      icon_name: 'truck',
    });
    show({ variant: 'success', title: 'Service created' });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant={creating ? 'outline' : 'default'}
          onClick={() => setCreating((v) => !v)}
          className="gap-1"
        >
          {creating ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {creating ? 'Cancel' : 'Add service'}
        </Button>
      </div>

      {creating && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <h3 className="font-semibold">New service</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="n-name">Name</Label>
                <Input
                  id="n-name"
                  value={newDraft.name}
                  onChange={(e) => setNewDraft({ ...newDraft, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="n-slug">Slug</Label>
                <Input
                  id="n-slug"
                  value={newDraft.slug}
                  onChange={(e) => setNewDraft({ ...newDraft, slug: e.target.value })}
                  className="mt-1"
                  placeholder="home-shifting"
                />
              </div>
              <div>
                <Label htmlFor="n-price">Starting price (₹)</Label>
                <Input
                  id="n-price"
                  type="number"
                  value={newDraft.base_price}
                  onChange={(e) => setNewDraft({ ...newDraft, base_price: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="n-duration">Duration (hours)</Label>
                <Input
                  id="n-duration"
                  type="number"
                  value={newDraft.duration_hours}
                  onChange={(e) =>
                    setNewDraft({ ...newDraft, duration_hours: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="n-icon">Icon name (lucide)</Label>
                <Input
                  id="n-icon"
                  value={newDraft.icon_name}
                  onChange={(e) => setNewDraft({ ...newDraft, icon_name: e.target.value })}
                  className="mt-1"
                  placeholder="truck, home, car, building-2, route, package"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="n-short">Short description</Label>
              <Input
                id="n-short"
                value={newDraft.short_description}
                onChange={(e) =>
                  setNewDraft({ ...newDraft, short_description: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="n-desc">Full description</Label>
              <Textarea
                id="n-desc"
                rows={3}
                value={newDraft.description}
                onChange={(e) => setNewDraft({ ...newDraft, description: e.target.value })}
                className="mt-1"
              />
            </div>
            <Button onClick={createNew}>Create</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Short description</TableHead>
                <TableHead>From price</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((s) => {
                const isEditing = editId === s.id;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="w-20">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={draft.display_order ?? 0}
                          onChange={(e) =>
                            setDraft({ ...draft, display_order: Number(e.target.value) })
                          }
                          className="h-8"
                        />
                      ) : (
                        s.display_order
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {isEditing ? (
                        <Input
                          value={draft.name ?? ''}
                          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                          className="h-8"
                        />
                      ) : (
                        s.name
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {isEditing ? (
                        <Input
                          value={draft.short_description ?? ''}
                          onChange={(e) =>
                            setDraft({ ...draft, short_description: e.target.value })
                          }
                          className="h-8"
                        />
                      ) : (
                        s.short_description
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={
                            draft.base_price == null ? '' : Math.round(draft.base_price / 100)
                          }
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              base_price: e.target.value ? Number(e.target.value) * 100 : null,
                            })
                          }
                          className="h-8 w-28"
                          placeholder="₹ rupees"
                        />
                      ) : (
                        formatINR(s.base_price)
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={draft.duration_hours ?? 0}
                          onChange={(e) =>
                            setDraft({ ...draft, duration_hours: Number(e.target.value) })
                          }
                          className="h-8 w-20"
                        />
                      ) : (
                        `${s.duration_hours}h`
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleActive(s)}
                        aria-label={s.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {s.is_active ? (
                          <Eye className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button size="sm" onClick={saveEdit} className="gap-1">
                            <Save className="h-3.5 w-3.5" /> Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditId(null);
                              setDraft({});
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => startEdit(s)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
