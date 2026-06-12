'use client';

import * as React from 'react';
import NextLink from 'next/link';
import Image from 'next/image';
import {
  Box,
  Container,
  Flex,
  HStack,
  Stack,
  Button,
  IconButton,
  CloseButton,
  Drawer,
  Portal,
  Link as ChakraLink,
} from '@chakra-ui/react';
import { Menu } from 'lucide-react';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/booking-status', label: 'Track booking' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

// The frosted-glass recipe, reused on the bar and the drawer.
const glass = {
  bg: 'rgba(255, 255, 255, 0.6)',
  backdropFilter: 'blur(18px) saturate(180%)',
  // Safari / iOS need the prefixed version explicitly.
  css: { WebkitBackdropFilter: 'blur(16px) saturate(180%)' },
};

export function Header({ companyName }: { companyName: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Box
      as="header"
      position="sticky"
      top={{ base: 2, md: 4 }}
      zIndex={50}
      px={{ base: 3, md: 4 }}
    >
      <Container maxW="7xl" px={0}>
        <Flex
          h={{ base: 14, md: 16 }}
          align="center"
          justify="space-between"
          gap={4}
          px={{ base: 4, md: 6 }}
          rounded="2xl"
          borderWidth="1px"
          borderColor="rgba(255, 255, 255, 0.45)"
          boxShadow="0 8px 32px rgba(15, 23, 42, 0.12)"
          {...glass}
        >
          <ChakraLink asChild aria-label={companyName} _hover={{ textDecoration: 'none' }}>
            <NextLink href="/">
              <Image
                src="/LOGO01.svg"
                alt={companyName}
                width={200}
                height={80}
                priority
                style={{ height: 36, width: 'auto' }}
              />
            </NextLink>
          </ChakraLink>

          <HStack as="nav" gap={7} display={{ base: 'none', md: 'flex' }} aria-label="Main">
            {NAV.map((n) => (
              <ChakraLink
                key={n.href}
                asChild
                fontSize="sm"
                fontWeight="medium"
                color="fg.muted"
                _hover={{ color: 'brand.700', textDecoration: 'none' }}
              >
                <NextLink href={n.href}>{n.label}</NextLink>
              </ChakraLink>
            ))}
          </HStack>

          <HStack display={{ base: 'none', md: 'flex' }} gap={2}>
            <Button asChild size="sm" colorPalette="brand">
              <NextLink href="/book">Book Now</NextLink>
            </Button>
          </HStack>

          <Box display={{ base: 'block', md: 'none' }}>
            <Drawer.Root open={open} onOpenChange={(e) => setOpen(e.open)} placement="end">
              <Drawer.Trigger asChild>
                <IconButton aria-label="Open menu" variant="ghost" size="sm">
                  <Menu />
                </IconButton>
              </Drawer.Trigger>
              <Portal>
                <Drawer.Backdrop backdropFilter="blur(2px)" bg="rgba(15, 23, 42, 0.3)" />
                <Drawer.Positioner>
                  <Drawer.Content
                    borderLeftWidth="1px"
                    borderColor="rgba(255, 255, 255, 0.4)"
                    {...glass}
                    bg="rgba(255, 255, 255, 0.72)"
                  >
                    <Drawer.Header>
                      <Drawer.Title>{companyName}</Drawer.Title>
                    </Drawer.Header>
                    <Drawer.Body>
                      <Stack gap={1}>
                        {NAV.map((n) => (
                          <ChakraLink
                            key={n.href}
                            asChild
                            px={2}
                            py={2}
                            rounded="md"
                            fontWeight="medium"
                            _hover={{ bg: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}
                          >
                            <NextLink href={n.href} onClick={() => setOpen(false)}>
                              {n.label}
                            </NextLink>
                          </ChakraLink>
                        ))}
                        <Button asChild mt={2} colorPalette="brand">
                          <NextLink href="/book" onClick={() => setOpen(false)}>
                            Book Now
                          </NextLink>
                        </Button>
                      </Stack>
                    </Drawer.Body>
                    <Drawer.CloseTrigger asChild>
                      <CloseButton size="sm" />
                    </Drawer.CloseTrigger>
                  </Drawer.Content>
                </Drawer.Positioner>
              </Portal>
            </Drawer.Root>
          </Box>
        </Flex>
      </Container>
    </Box>
  );
}