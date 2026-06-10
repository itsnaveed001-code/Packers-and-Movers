'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Stack,
  SimpleGrid,
  Flex,
  Text,
  Field,
  Input,
  Textarea,
  Button,
} from '@chakra-ui/react';
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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Text
      fontSize="sm"
      fontWeight="semibold"
      textTransform="uppercase"
      letterSpacing="wide"
      color="fg.muted"
    >
      {children}
    </Text>
  );
}

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
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* No-key fallback / quick-pick suggestions for the City field */}
      <datalist id="blr-localities">
        {SERVICE_AREAS.map((area) => (
          <option key={area} value={area} />
        ))}
      </datalist>

      <Stack gap={6}>
        <Stack gap={4}>
          <SectionHeading>Your details</SectionHeading>
          <Field.Root invalid={!!errors.customer_name} required>
            <Field.Label>
              Full name <Field.RequiredIndicator />
            </Field.Label>
            <Input autoComplete="name" {...register('customer_name')} />
            <Field.ErrorText>{errors.customer_name?.message}</Field.ErrorText>
          </Field.Root>
          <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
            <Field.Root invalid={!!errors.customer_phone} required>
              <Field.Label>
                Phone <Field.RequiredIndicator />
              </Field.Label>
              <Input
                type="tel"
                inputMode="tel"
                placeholder="+91 98765 43210"
                autoComplete="tel"
                {...register('customer_phone')}
              />
              <Field.ErrorText>{errors.customer_phone?.message}</Field.ErrorText>
            </Field.Root>
            <Field.Root invalid={!!errors.customer_email} required>
              <Field.Label>
                Email <Field.RequiredIndicator />
              </Field.Label>
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                {...register('customer_email')}
              />
              <Field.ErrorText>{errors.customer_email?.message}</Field.ErrorText>
            </Field.Root>
          </SimpleGrid>
        </Stack>

        <Stack gap={4}>
          <SectionHeading>Pickup location</SectionHeading>
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
          <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
            <Field.Root invalid={!!errors.pickup_city} required>
              <Field.Label>City / Area</Field.Label>
              <Input list="blr-localities" {...register('pickup_city')} />
              <Field.ErrorText>{errors.pickup_city?.message}</Field.ErrorText>
            </Field.Root>
            <Field.Root invalid={!!errors.pickup_pincode} required>
              <Field.Label>Pincode</Field.Label>
              <Input
                inputMode="numeric"
                maxLength={6}
                autoComplete="postal-code"
                {...register('pickup_pincode')}
              />
              <Field.ErrorText>{errors.pickup_pincode?.message}</Field.ErrorText>
            </Field.Root>
          </SimpleGrid>
        </Stack>

        <Stack gap={4}>
          <SectionHeading>Drop-off location</SectionHeading>
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
          <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
            <Field.Root invalid={!!errors.dropoff_city} required>
              <Field.Label>City / Area</Field.Label>
              <Input list="blr-localities" {...register('dropoff_city')} />
              <Field.ErrorText>{errors.dropoff_city?.message}</Field.ErrorText>
            </Field.Root>
            <Field.Root invalid={!!errors.dropoff_pincode} required>
              <Field.Label>Pincode</Field.Label>
              <Input inputMode="numeric" maxLength={6} {...register('dropoff_pincode')} />
              <Field.ErrorText>{errors.dropoff_pincode?.message}</Field.ErrorText>
            </Field.Root>
          </SimpleGrid>
        </Stack>

        <Field.Root>
          <Field.Label>Notes (optional)</Field.Label>
          <Textarea
            rows={3}
            placeholder="Anything special we should know? (lift access, fragile items, special hours…)"
            {...register('notes')}
          />
        </Field.Root>

        <Flex direction={{ base: 'column', sm: 'row' }} justify="space-between" gap={2}>
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" colorPalette="brand">
            Continue to review
          </Button>
        </Flex>
      </Stack>
    </form>
  );
}
