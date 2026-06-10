'use client';

import { ChakraProvider } from '@chakra-ui/react';
import { system } from '@/theme/system';

// Marketing-side Chakra provider. Mounted in app/(marketing)/layout.tsx only, so
// the admin keeps its existing Tailwind/shadcn styling until that area is migrated
// in a later phase. Light mode only — no color-mode toggle needed on the public site.
export function Providers({ children }: { children: React.ReactNode }) {
  return <ChakraProvider value={system}>{children}</ChakraProvider>;
}
