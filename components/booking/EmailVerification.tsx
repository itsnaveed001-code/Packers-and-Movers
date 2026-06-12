'use client';

import * as React from 'react';
import { Box, Button, Flex, Input, Stack, Text } from '@chakra-ui/react';
import { MailCheck, ShieldCheck } from 'lucide-react';
import { toaster } from '@/components/Toaster';

type Purpose = 'booking' | 'cancel' | 'manage';

const ERROR_MESSAGES: Record<string, string> = {
  invalid_code: "That code didn't match. Please check and try again.",
  code_expired: 'That code has expired — request a new one.',
  no_code: 'No active code found — tap "Send code" first.',
  too_many_attempts: 'Too many tries. Request a fresh code.',
  cooldown: 'Please wait a moment before requesting another code.',
  rate_limited: "Too many codes requested. Please try again in an hour.",
  send_failed: "We couldn't send the email. Please try again.",
};

/**
 * Inline email OTP widget: "Send code" (with resend cooldown), 6-digit
 * input, verify. Calls onVerified with the short-lived signed token.
 * Reused by the booking Review step (purpose='booking') and the
 * Track/Manage page (purpose='manage').
 */
export function EmailVerification({
  email,
  name,
  purpose,
  onVerified,
}: {
  email: string;
  name?: string;
  purpose: Purpose;
  onVerified: (token: string) => void;
}) {
  const [sent, setSent] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [verified, setVerified] = React.useState(false);
  const [code, setCode] = React.useState('');
  const [cooldown, setCooldown] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // A different email means any previous verification no longer applies.
  React.useEffect(() => {
    setVerified(false);
    setSent(false);
    setCode('');
    setError(null);
  }, [email]);

  async function sendCode() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/bookings/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, purpose }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        resendInSeconds?: number;
      };
      if (res.ok && body.ok) {
        setSent(true);
        setCooldown(body.resendInSeconds ?? 60);
        toaster.create({
          type: 'success',
          title: 'Code sent',
          description: `Check ${email} for a 6-digit code.`,
        });
      } else if (res.status === 429 && body.error === 'cooldown') {
        setSent(true);
        setCooldown(body.resendInSeconds ?? 60);
        setError(ERROR_MESSAGES.cooldown);
      } else {
        setError(ERROR_MESSAGES[body.error ?? ''] ?? ERROR_MESSAGES.send_failed);
      }
    } catch {
      setError('Network error — please check your connection.');
    } finally {
      setSending(false);
    }
  }

  async function verifyCode() {
    if (code.length !== 6) {
      setError('Enter the 6-digit code from the email.');
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch('/api/bookings/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, purpose }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        token?: string;
        error?: string;
        attemptsRemaining?: number;
      };
      if (res.ok && body.ok && body.token) {
        setVerified(true);
        toaster.create({ type: 'success', title: 'Email verified' });
        onVerified(body.token);
      } else {
        const base = ERROR_MESSAGES[body.error ?? ''] ?? 'Verification failed.';
        const tries =
          body.error === 'invalid_code' && body.attemptsRemaining != null
            ? ` ${body.attemptsRemaining} attempt${body.attemptsRemaining === 1 ? '' : 's'} left.`
            : '';
        setError(base + tries);
      }
    } catch {
      setError('Network error — please check your connection.');
    } finally {
      setVerifying(false);
    }
  }

  if (verified) {
    return (
      <Flex
        align="center"
        gap={2}
        rounded="xl"
        borderWidth="1px"
        borderColor="green.200"
        bg="green.50"
        px={4}
        py={3}
      >
        <ShieldCheck size={18} color="var(--chakra-colors-green-600, #16a34a)" />
        <Text fontSize="sm" color="green.800">
          <Text as="span" fontWeight="semibold">
            {email}
          </Text>{' '}
          verified — you&apos;re good to go.
        </Text>
      </Flex>
    );
  }

  return (
    <Box rounded="xl" borderWidth="1px" bg="bg.subtle" p={4}>
      <Flex align="center" gap={2}>
        <MailCheck size={18} />
        <Text fontSize="sm" fontWeight="semibold">
          Verify your email
        </Text>
      </Flex>
      <Text mt={1} fontSize="sm" color="fg.muted">
        We&apos;ll send a 6-digit code to{' '}
        <Text as="span" fontWeight="medium" color="fg">
          {email}
        </Text>{' '}
        to confirm it&apos;s really you.
      </Text>

      <Stack mt={3} gap={3}>
        {!sent ? (
          <Button
            onClick={sendCode}
            loading={sending}
            loadingText="Sending…"
            colorPalette="brand"
            size="sm"
            alignSelf="flex-start"
          >
            Send code
          </Button>
        ) : (
          <>
            <Flex direction={{ base: 'column', sm: 'row' }} gap={2}>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                fontFamily="mono"
                letterSpacing="0.3em"
                textAlign="center"
                maxW={{ sm: '180px' }}
                bg="white"
              />
              <Button
                onClick={verifyCode}
                loading={verifying}
                loadingText="Verifying…"
                colorPalette="brand"
                disabled={code.length !== 6}
              >
                Verify
              </Button>
            </Flex>
            <Flex align="center" gap={2}>
              <Button
                variant="ghost"
                size="xs"
                onClick={sendCode}
                loading={sending}
                disabled={cooldown > 0}
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </Button>
            </Flex>
          </>
        )}
        {error && (
          <Text fontSize="sm" color="red.600">
            {error}
          </Text>
        )}
      </Stack>
    </Box>
  );
}
