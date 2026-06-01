'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { AddressAutocomplete } from './AddressAutocomplete';
import { SERVICE_AREAS } from '@/lib/constants';

const indianPhoneRegex = /^(\+91[\s-]?)?[6-9]\d{9}$/;
const pincodeRegex = /^\d{6}$/;

const customerFormSchema = z.object({
  customer_name: z.string().trim().min(2, 'Required').max(60),
  customer_phone: z
    .string()
    .trim()
    .regex(indianPhoneRegex, 'Enter a valid 10-digit Indian number'),
  customer_email: z.string().trim().email('Enter a valid email').max(120),
  pickup_address: z.string().trim().min(10, 'Address too short').max(300),
  pickup_city: z.string().trim().min(2).max(60),
  pickup_pincode: z.string().trim().regex(pincodeRegex, 'Must be 6 digits'),
  dropoff_address: z.string().trim().min(10, 'Address too short').max(300),
  dropoff_city: z.string().trim().min(2).max(60),
  dropoff_pincode: z.string().trim().regex(pincodeRegex, 'Must be 6 digits'),
  notes: z.string().trim().max(500).optional(),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

export function CustomerForm({
  defaultValues,
  onBack,
  onSubmit,
}: {
  defaultValues?: Partial<CustomerFormValues>;
  onBack: () => void;
  onSubmit: (v: CustomerFormValues) => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {/* No-key fallback / quick-pick suggestions for the City field */}
      <datalist id="blr-localities">
        {SERVICE_AREAS.map((area) => (
          <option key={area} value={area} />
        ))}
      </datalist>
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Your details
        </h3>
        <div>
          <Label htmlFor="customer_name">Full name</Label>
          <Input
            id="customer_name"
            aria-invalid={!!errors.customer_name}
            className="mt-1.5"
            autoComplete="name"
            {...register('customer_name')}
          />
          {errors.customer_name && (
            <p className="mt-1 text-xs text-destructive">
              {errors.customer_name.message}
            </p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="customer_phone">Phone</Label>
            <Input
              id="customer_phone"
              type="tel"
              inputMode="tel"
              placeholder="+91 98765 43210"
              aria-invalid={!!errors.customer_phone}
              className="mt-1.5"
              autoComplete="tel"
              {...register('customer_phone')}
            />
            {errors.customer_phone && (
              <p className="mt-1 text-xs text-destructive">
                {errors.customer_phone.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="customer_email">Email</Label>
            <Input
              id="customer_email"
              type="email"
              inputMode="email"
              aria-invalid={!!errors.customer_email}
              className="mt-1.5"
              autoComplete="email"
              {...register('customer_email')}
            />
            {errors.customer_email && (
              <p className="mt-1 text-xs text-destructive">
                {errors.customer_email.message}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Pickup location
        </h3>
        <AddressAutocomplete
          id="pickup_address"
          label="Address"
          placeholder="Start typing your pickup address…"
          value={watch('pickup_address') || ''}
          onChange={(v) => setValue('pickup_address', v, { shouldValidate: true })}
          onResolved={(r) => {
            setValue('pickup_address', r.address, { shouldValidate: true });
            if (r.city) setValue('pickup_city', r.city, { shouldValidate: true });
            if (r.pincode) setValue('pickup_pincode', r.pincode, { shouldValidate: true });
          }}
          error={errors.pickup_address?.message}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="pickup_city">City / Area</Label>
            <Input
              id="pickup_city"
              list="blr-localities"
              aria-invalid={!!errors.pickup_city}
              className="mt-1.5"
              {...register('pickup_city')}
            />
            {errors.pickup_city && (
              <p className="mt-1 text-xs text-destructive">{errors.pickup_city.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="pickup_pincode">Pincode</Label>
            <Input
              id="pickup_pincode"
              inputMode="numeric"
              maxLength={6}
              aria-invalid={!!errors.pickup_pincode}
              className="mt-1.5"
              autoComplete="postal-code"
              {...register('pickup_pincode')}
            />
            {errors.pickup_pincode && (
              <p className="mt-1 text-xs text-destructive">
                {errors.pickup_pincode.message}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Drop-off location
        </h3>
        <AddressAutocomplete
          id="dropoff_address"
          label="Address"
          placeholder="Start typing your drop-off address…"
          value={watch('dropoff_address') || ''}
          onChange={(v) => setValue('dropoff_address', v, { shouldValidate: true })}
          onResolved={(r) => {
            setValue('dropoff_address', r.address, { shouldValidate: true });
            if (r.city) setValue('dropoff_city', r.city, { shouldValidate: true });
            if (r.pincode) setValue('dropoff_pincode', r.pincode, { shouldValidate: true });
          }}
          error={errors.dropoff_address?.message}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="dropoff_city">City / Area</Label>
            <Input
              id="dropoff_city"
              list="blr-localities"
              aria-invalid={!!errors.dropoff_city}
              className="mt-1.5"
              {...register('dropoff_city')}
            />
            {errors.dropoff_city && (
              <p className="mt-1 text-xs text-destructive">{errors.dropoff_city.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="dropoff_pincode">Pincode</Label>
            <Input
              id="dropoff_pincode"
              inputMode="numeric"
              maxLength={6}
              aria-invalid={!!errors.dropoff_pincode}
              className="mt-1.5"
              {...register('dropoff_pincode')}
            />
            {errors.dropoff_pincode && (
              <p className="mt-1 text-xs text-destructive">
                {errors.dropoff_pincode.message}
              </p>
            )}
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          rows={3}
          placeholder="Anything special we should know? (lift access, fragile items, special hours…)"
          className="mt-1.5"
          {...register('notes')}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit">Continue to review</Button>
      </div>
    </form>
  );
}
