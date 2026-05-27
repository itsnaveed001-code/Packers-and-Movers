'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { contactFormSchema, type ContactFormInput } from '@/lib/validation';

type FormValues = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

export function ContactForm() {
  const { show } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(contactFormSchema),
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values satisfies ContactFormInput),
      });
      if (!res.ok) throw new Error('Request failed');
      show({
        variant: 'success',
        title: 'Message sent',
        description: "We'll get back to you within a few hours.",
      });
      reset();
    } catch {
      show({
        variant: 'error',
        title: "Couldn't send right now",
        description: 'Please try WhatsApp or call us instead.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="name">Your name</Label>
        <Input
          id="name"
          aria-invalid={!!errors.name}
          className="mt-1.5"
          autoComplete="name"
          {...register('name')}
        />
        {errors.name && (
          <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            aria-invalid={!!errors.email}
            className="mt-1.5"
            autoComplete="email"
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            placeholder="+91 98765 43210"
            aria-invalid={!!errors.phone}
            className="mt-1.5"
            autoComplete="tel"
            {...register('phone')}
          />
          {errors.phone && (
            <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="message">How can we help?</Label>
        <Textarea
          id="message"
          rows={4}
          aria-invalid={!!errors.message}
          className="mt-1.5"
          placeholder="Tell us about your move…"
          {...register('message')}
        />
        {errors.message && (
          <p className="mt-1 text-xs text-destructive">{errors.message.message}</p>
        )}
      </div>

      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? 'Sending…' : 'Send message'}
      </Button>
    </form>
  );
}
