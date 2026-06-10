'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Stack,
  SimpleGrid,
  Field,
  Input,
  Textarea,
  Button,
  Text,
} from '@chakra-ui/react';
import { toaster } from '@/components/Toaster';
import { contactFormSchema, type ContactFormInput } from '@/lib/validation';

type FormValues = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

export function ContactForm() {
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
      toaster.create({
        type: 'success',
        title: 'Message sent',
        description: "We'll get back to you within a few hours.",
      });
      reset();
    } catch {
      toaster.create({
        type: 'error',
        title: "Couldn't send right now",
        description: 'Please try WhatsApp or call us instead.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack gap={4}>
        <Field.Root invalid={!!errors.name} required>
          <Field.Label>
            Your name <Field.RequiredIndicator />
          </Field.Label>
          <Input autoComplete="name" {...register('name')} />
          <Field.ErrorText>{errors.name?.message}</Field.ErrorText>
        </Field.Root>

        <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
          <Field.Root invalid={!!errors.email} required>
            <Field.Label>
              Email <Field.RequiredIndicator />
            </Field.Label>
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              {...register('email')}
            />
            <Field.ErrorText>{errors.email?.message}</Field.ErrorText>
          </Field.Root>

          <Field.Root invalid={!!errors.phone} required>
            <Field.Label>
              Phone <Field.RequiredIndicator />
            </Field.Label>
            <Input
              type="tel"
              inputMode="tel"
              placeholder="+91 98765 43210"
              autoComplete="tel"
              {...register('phone')}
            />
            <Field.ErrorText>{errors.phone?.message}</Field.ErrorText>
          </Field.Root>
        </SimpleGrid>

        <Field.Root invalid={!!errors.message} required>
          <Field.Label>
            How can we help? <Field.RequiredIndicator />
          </Field.Label>
          <Textarea
            rows={4}
            placeholder="Tell us about your move…"
            {...register('message')}
          />
          <Field.ErrorText>{errors.message?.message}</Field.ErrorText>
        </Field.Root>

        <Text fontSize="xs" color="fg.muted">
          We only use your details to respond to this enquiry. No spam, ever.
        </Text>

        <Button
          type="submit"
          colorPalette="brand"
          loading={submitting}
          loadingText="Sending…"
          alignSelf={{ base: 'stretch', sm: 'flex-start' }}
        >
          Send message
        </Button>
      </Stack>
    </form>
  );
}
