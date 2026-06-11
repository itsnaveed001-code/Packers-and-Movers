'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Mail, Phone, MessageCircle, Trash2, Check, MailOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { cn, whatsappUrl } from '@/lib/utils';
import type { ContactSubmission } from '@/types/database';

export function InboxManager({ initial }: { initial: ContactSubmission[] }) {
  const { show } = useToast();
  const [items, setItems] = React.useState<ContactSubmission[]>(initial);
  const [openId, setOpenId] = React.useState<string | null>(
    initial.find((i) => !i.is_read)?.id ?? initial[0]?.id ?? null,
  );
  const [pending, setPending] = React.useState<string | null>(null);

  async function toggleRead(id: string, next: boolean) {
    setPending(id);
    try {
      const res = await fetch(`/api/admin/inbox/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: next }),
      });
      if (!res.ok) throw new Error('failed');
      setItems((arr) =>
        arr.map((it) => (it.id === id ? { ...it, is_read: next } : it)),
      );
    } catch {
      show({
        variant: 'error',
        title: "Couldn't update",
        description: 'Please try again.',
      });
    } finally {
      setPending(null);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this message? This cannot be undone.')) return;
    setPending(id);
    try {
      const res = await fetch(`/api/admin/inbox/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('failed');
      setItems((arr) => arr.filter((it) => it.id !== id));
      if (openId === id) setOpenId(null);
    } catch {
      show({
        variant: 'error',
        title: "Couldn't delete",
        description: 'Please try again.',
      });
    } finally {
      setPending(null);
    }
  }

  if (items.length === 0) {
    return (
      <p className="rounded-lg border bg-white p-6 text-sm text-muted-foreground">
        No messages yet. When someone submits the contact form they&apos;ll show up
        here.
      </p>
    );
  }

  const open = items.find((i) => i.id === openId) ?? items[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <ul className="divide-y rounded-xl border bg-white shadow-sm">
        {items.map((it) => (
          <li key={it.id}>
            <button
              type="button"
              onClick={() => {
                setOpenId(it.id);
                if (!it.is_read) toggleRead(it.id, true);
              }}
              className={cn(
                'flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-secondary/40',
                openId === it.id && 'bg-secondary/50',
              )}
            >
              <span
                className={cn(
                  'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                  it.is_read ? 'bg-transparent' : 'bg-amber-500',
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      'truncate text-sm',
                      it.is_read ? 'font-medium text-foreground/80' : 'font-semibold',
                    )}
                  >
                    {it.name}
                  </p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {format(new Date(it.created_at), 'd MMM')}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {it.message}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <article className="rounded-xl border bg-white p-5 shadow-sm">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{open.name}</h2>
            <p className="text-xs text-muted-foreground">
              {format(new Date(open.created_at), 'EEEE, d MMM yyyy · h:mm a')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleRead(open.id, !open.is_read)}
              disabled={pending === open.id}
            >
              {open.is_read ? (
                <>
                  <MailOpen className="h-4 w-4" /> Mark unread
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" /> Mark read
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => remove(open.id)}
              disabled={pending === open.id}
              className="text-rose-700"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </header>

        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <a
            href={`tel:${open.phone.replace(/\s/g, '')}`}
            className="inline-flex items-center gap-1.5 rounded-md border bg-white px-2.5 py-1 text-brand-700 hover:bg-brand-50"
          >
            <Phone className="h-4 w-4" />
            {open.phone}
          </a>
          <a
            href={`mailto:${open.email}?subject=${encodeURIComponent('Re: your message to EasyShiftX')}`}
            className="inline-flex items-center gap-1.5 rounded-md border bg-white px-2.5 py-1 text-brand-700 hover:bg-brand-50"
          >
            <Mail className="h-4 w-4" />
            {open.email}
          </a>
          <a
            href={whatsappUrl(`Hi ${open.name.split(' ')[0]}, this is EasyShiftX. About your enquiry:`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border bg-white px-2.5 py-1 text-emerald-700 hover:bg-emerald-50"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
        </div>

        <p className="mt-4 whitespace-pre-wrap rounded-lg bg-secondary/40 p-3 text-sm">
          {open.message}
        </p>
      </article>
    </div>
  );
}
