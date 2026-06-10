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
import { BUSINESS } from '@/lib/constants';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function Header() {
  const [open, setOpen] = React.useState(false);

  return (
    <Box
      as="header"
      position="sticky"
      top={0}
      zIndex={40}
      w="full"
      borderBottomWidth="1px"
      bg="rgba(255,255,255,0.9)"
      backdropFilter="blur(8px)"
    >
      <Container maxW="7xl">
        <Flex h={16} align="center" justify="space-between">
          <ChakraLink asChild aria-label={BUSINESS.name} _hover={{ textDecoration: 'none' }}>
            <NextLink href="/">
              <Image
                src="/LOGO01.svg"
                alt={BUSINESS.name}
                width={200}
                height={80}
                priority
                style={{ height: 40, width: 'auto' }}
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
                <Drawer.Backdrop />
                <Drawer.Positioner>
                  <Drawer.Content>
                    <Drawer.Header>
                      <Drawer.Title>{BUSINESS.name}</Drawer.Title>
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
                            _hover={{ bg: 'bg.subtle', textDecoration: 'none' }}
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
