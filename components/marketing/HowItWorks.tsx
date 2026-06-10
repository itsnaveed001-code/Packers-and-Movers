import { Box, Container, SimpleGrid, Heading, Text, Flex } from '@chakra-ui/react';
import { CalendarCheck, PhoneCall, Truck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: CalendarCheck,
    title: 'Pick a slot',
    body: 'Choose your service, pick a date and a time that works for you.',
  },
  {
    icon: PhoneCall,
    title: 'We confirm by phone',
    body: 'Our team calls you within 2 hours to walk through the details and confirm the price.',
  },
  {
    icon: Truck,
    title: 'We move you',
    body: 'Our crew arrives on time, packs everything carefully, and gets you to your new place.',
  },
];

export function HowItWorks() {
  return (
    <Box as="section" py={{ base: 16, sm: 20 }}>
      <Container maxW="7xl">
        <Box maxW="2xl" mx="auto" textAlign="center">
          <Heading as="h2" fontSize={{ base: '3xl', sm: '4xl' }} letterSpacing="tight">
            How it works
          </Heading>
          <Text mt={3} color="fg.muted">
            Three simple steps. No payment required until the move is done.
          </Text>
        </Box>

        <SimpleGrid as="ol" mt={12} columns={{ base: 1, md: 3 }} gap={6}>
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <Box
              as="li"
              key={title}
              position="relative"
              rounded="2xl"
              borderWidth="1px"
              bg="white"
              p={6}
              listStyleType="none"
            >
              <Flex
                position="absolute"
                top="-3"
                left={6}
                align="center"
                justify="center"
                h={6}
                w={6}
                rounded="full"
                bg="brand.600"
                color="white"
                fontSize="xs"
                fontWeight="semibold"
              >
                {i + 1}
              </Flex>
              <Flex
                mb={3}
                align="center"
                justify="center"
                h={11}
                w={11}
                rounded="xl"
                bg="brand.50"
                color="brand.600"
              >
                <Icon size={20} />
              </Flex>
              <Heading as="h3" fontSize="md" fontWeight="semibold">
                {title}
              </Heading>
              <Text mt={1} fontSize="sm" color="fg.muted">
                {body}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
