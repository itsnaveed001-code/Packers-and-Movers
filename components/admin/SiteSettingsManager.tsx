'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import type { SiteSettings } from '@/types/database';

const SOCIAL_KEYS = ['instagram', 'facebook', 'x', 'linkedin', 'youtube'] as const;
type SocialKey = (typeof SOCIAL_KEYS)[number];

type FormState = {
  company_name: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  footer_text: string;
  hours_weekday: string;
  hours_sunday: string;
  social_links: Record<SocialKey, string>;
  map_mode: 'embed' | 'arealist';
  map_query: string;
  map_lat: string;
  map_lng: string;
  google_rating: string;
  google_reviews_url: string;
  insurance_badge_url: string;
  stat_moves_completed: string;
  stat_years_service: string;
};

function emptyForm(): FormState {
  return {
    company_name: 'EasyShiftX',
    tagline: 'Stress-free packing and moving in Bengaluru',
    phone: '+91 78927 73770',
    whatsapp: '917892773770',
    email: 'easyshiftx.2415@gmail.com',
    address: 'Bengaluru, Karnataka, India',
    footer_text: '',
    hours_weekday: '9:00 AM – 7:00 PM',
    hours_sunday: 'Closed',
    social_links: { instagram: '', facebook: '', x: '', linkedin: '', youtube: '' },
    map_mode: 'arealist',
    map_query: '',
    map_lat: '',
    map_lng: '',
    google_rating: '',
    google_reviews_url: '',
    insurance_badge_url: '',
    stat_moves_completed: '',
    stat_years_service: '',
  };
}

function fromSettings(s: SiteSettings): FormState {
  const hours = (s.business_hours ?? {}) as Record<string, string>;
  const social = (s.social_links ?? {}) as Record<string, string>;
  return {
    company_name: s.company_name,
    tagline: s.tagline,
    phone: s.phone,
    whatsapp: s.whatsapp,
    email: s.email,
    address: s.address,
    footer_text: s.footer_text ?? '',
    hours_weekday: hours.weekday ?? '9:00 AM – 7:00 PM',
    hours_sunday: hours.sunday ?? 'Closed',
    social_links: {
      instagram: social.instagram ?? '',
      facebook: social.facebook ?? '',
      x: social.x ?? '',
      linkedin: social.linkedin ?? '',
      youtube: social.youtube ?? '',
    },
    map_mode: s.map_mode,
    map_query: s.map_query ?? '',
    map_lat: s.map_lat != null ? String(s.map_lat) : '',
    map_lng: s.map_lng != null ? String(s.map_lng) : '',
    google_rating: s.google_rating != null ? String(s.google_rating) : '',
    google_reviews_url: s.google_reviews_url ?? '',
    insurance_badge_url: s.insurance_badge_url ?? '',
    stat_moves_completed: s.stat_moves_completed ?? '',
    stat_years_service: s.stat_years_service ?? '',
  };
}

export function SiteSettingsManager({ initial }: { initial: SiteSettings | null }) {
  const { show } = useToast();
  const [form, setForm] = React.useState<FormState>(
    initial ? fromSettings(initial) : emptyForm(),
  );
  const [saving, setSaving] = React.useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateSocial(k: SocialKey, v: string) {
    setForm((f) => ({ ...f, social_links: { ...f.social_links, [k]: v } }));
  }

  async function save() {
    setSaving(true);
    try {
      // Strip empty social_links keys so we don't store empty strings.
      const social: Record<string, string> = {};
      for (const k of SOCIAL_KEYS) {
        const v = form.social_links[k].trim();
        if (v) social[k] = v;
      }
      const body = {
        company_name: form.company_name,
        tagline: form.tagline,
        phone: form.phone,
        whatsapp: form.whatsapp.replace(/\s/g, ''),
        email: form.email,
        address: form.address,
        footer_text: form.footer_text || null,
        business_hours: {
          weekday: form.hours_weekday,
          sunday: form.hours_sunday,
        },
        social_links: social,
        map_mode: form.map_mode,
        map_query: form.map_query || null,
        map_lat: form.map_lat ? Number(form.map_lat) : null,
        map_lng: form.map_lng ? Number(form.map_lng) : null,
        google_rating: form.google_rating ? Number(form.google_rating) : null,
        google_reviews_url: form.google_reviews_url || null,
        insurance_badge_url: form.insurance_badge_url || null,
        stat_moves_completed: form.stat_moves_completed || null,
        stat_years_service: form.stat_years_service || null,
      };

      const res = await fetch('/api/admin/site-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        show({
          variant: 'error',
          title: "Couldn't save",
          description: err.error ?? 'Please check the fields and try again.',
        });
        return;
      }
      show({ variant: 'success', title: 'Saved' });
    } catch {
      show({
        variant: 'error',
        title: "Couldn't save",
        description: 'Network error. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <Section title="Identity" description="The basics — used everywhere.">
        <Field label="Company name" htmlFor="company_name">
          <Input
            id="company_name"
            value={form.company_name}
            onChange={(e) => update('company_name', e.target.value)}
          />
        </Field>
        <Field label="Tagline" htmlFor="tagline">
          <Input
            id="tagline"
            value={form.tagline}
            onChange={(e) => update('tagline', e.target.value)}
          />
        </Field>
      </Section>

      <Section title="Contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" htmlFor="phone">
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
            />
          </Field>
          <Field
            label="WhatsApp (digits only)"
            htmlFor="whatsapp"
            hint="Country code + number, no spaces. e.g. 917892773770"
          >
            <Input
              id="whatsapp"
              value={form.whatsapp}
              onChange={(e) => update('whatsapp', e.target.value)}
            />
          </Field>
        </div>
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
          />
        </Field>
        <Field label="Address" htmlFor="address">
          <Textarea
            id="address"
            rows={2}
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
          />
        </Field>
      </Section>

      <Section title="Business hours">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Weekday (Mon–Sat)" htmlFor="hours_weekday">
            <Input
              id="hours_weekday"
              value={form.hours_weekday}
              onChange={(e) => update('hours_weekday', e.target.value)}
            />
          </Field>
          <Field label="Sunday" htmlFor="hours_sunday">
            <Input
              id="hours_sunday"
              value={form.hours_sunday}
              onChange={(e) => update('hours_sunday', e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section title="Map" description="Controls how the Contact page shows your location.">
        <Field label="Mode" htmlFor="map_mode">
          <Select
            value={form.map_mode}
            onValueChange={(v) => update('map_mode', v as 'embed' | 'arealist')}
          >
            <SelectTrigger id="map_mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="embed">Embedded Google Map</SelectItem>
              <SelectItem value="arealist">Service area list (no embed)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {form.map_mode === 'embed' && (
          <Field
            label="Map query"
            htmlFor="map_query"
            hint="What to search on Google Maps. Defaults to the address above if left empty."
          >
            <Input
              id="map_query"
              value={form.map_query}
              onChange={(e) => update('map_query', e.target.value)}
              placeholder="e.g. 12.9716,77.5946 or 'EasyShiftX Bengaluru'"
            />
          </Field>
        )}
      </Section>

      <Section title="Social links" description="Leave blank to hide.">
        <div className="grid gap-3 sm:grid-cols-2">
          {SOCIAL_KEYS.map((k) => (
            <Field key={k} label={k} htmlFor={`social_${k}`}>
              <Input
                id={`social_${k}`}
                placeholder="https://…"
                value={form.social_links[k]}
                onChange={(e) => updateSocial(k, e.target.value)}
              />
            </Field>
          ))}
        </div>
      </Section>

      <Section
        title="Trust hooks"
        description="Shown on the public site once filled. Leave blank to hide each."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Google rating (0–5)" htmlFor="google_rating">
            <Input
              id="google_rating"
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={form.google_rating}
              onChange={(e) => update('google_rating', e.target.value)}
            />
          </Field>
          <Field label="Google reviews URL" htmlFor="google_reviews_url">
            <Input
              id="google_reviews_url"
              type="url"
              value={form.google_reviews_url}
              onChange={(e) => update('google_reviews_url', e.target.value)}
            />
          </Field>
          <Field label="Moves completed (display)" htmlFor="stat_moves_completed">
            <Input
              id="stat_moves_completed"
              placeholder="e.g. 1,200+"
              value={form.stat_moves_completed}
              onChange={(e) => update('stat_moves_completed', e.target.value)}
            />
          </Field>
          <Field label="Years of service" htmlFor="stat_years_service">
            <Input
              id="stat_years_service"
              placeholder="e.g. 3"
              value={form.stat_years_service}
              onChange={(e) => update('stat_years_service', e.target.value)}
            />
          </Field>
        </div>
        <Field label="Insurance badge URL (image)" htmlFor="insurance_badge_url">
          <Input
            id="insurance_badge_url"
            type="url"
            value={form.insurance_badge_url}
            onChange={(e) => update('insurance_badge_url', e.target.value)}
          />
        </Field>
      </Section>

      <Section title="Footer" description="Optional fine-print line under the footer logo.">
        <Field label="Footer text" htmlFor="footer_text">
          <Textarea
            id="footer_text"
            rows={2}
            value={form.footer_text}
            onChange={(e) => update('footer_text', e.target.value)}
          />
        </Field>
      </Section>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} disabled={saving} size="lg" className="shadow-md">
          {saving ? 'Saving…' : 'Save business profile'}
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-white p-5 shadow-sm">
      <header className="mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor} className="capitalize">
        {label}
      </Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
