import NextLink from 'next/link';
import { Box, Link as ChakraLink, HStack } from '@chakra-ui/react';
import { Phone, MessageCircle, Calendar } from 'lucide-react';
import { BUSINESS } from '@/lib/constants';

export function StickyMobileBar() {
  return (
    <Box
      display={{ base: 'grid', md: 'none' }}
      gridTemplateColumns="repeat(3, 1fr)"
      position="sticky"
      bottom={0}
      zIndex={30}
      borderTopWidth="1px"
      bg="white"
    >
      <ChakraLink
        href={`tel:${BUSINESS.phone.replace(/\s/g, '')}`}
        justifyContent="center"
        borderRightWidth="1px"
        py={3}
        fontSize="sm"
        fontWeight="medium"
        color="brand.700"
        _hover={{ textDecoration: 'none', bg: 'brand.50' }}
      >
        <HStack gap={2}>
          <Phone size={16} />
          <span>Call</span>
        </HStack>
      </ChakraLink>
      <ChakraLink
        href={`https://wa.me/${BUSINESS.whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        justifyContent="center"
        borderRightWidth="1px"
        py={3}
        fontSize="sm"
        fontWeight="medium"
        color="green.700"
        _hover={{ textDecoration: 'none', bg: 'green.50' }}
      >
        <HStack gap={2}>
          <MessageCircle size={16} />
          <span>WhatsApp</span>
        </HStack>
      </ChakraLink>
      <ChakraLink
        asChild
        justifyContent="center"
        py={3}
        fontSize="sm"
        fontWeight="semibold"
        bg="brand.600"
        color="white"
        _hover={{ textDecoration: 'none', bg: 'brand.700' }}
      >
        <NextLink href="/book">
          <HStack gap={2}>
            <Calendar size={16} />
            <span>Book</span>
          </HStack>
        </NextLink>
      </ChakraLink>
    </Box>
  );
}
