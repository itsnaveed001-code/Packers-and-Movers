import { Box, Container, SimpleGrid, Heading, Text, Flex } from '@chakra-ui/react';
import { Shield, BadgeCheck, Clock, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { glassCard } from '@/theme/glass';

const PILLARS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: BadgeCheck,
    title: 'Verified team',
    body: 'Trained crew, background-checked, identified with company IDs on site.',
  },
  {
    icon: Shield,
    title: 'Insured moves',
    body: 'Transit insurance available on every booking. We cover what we move.',
  },
  {
    icon: Clock,
    title: 'On-time delivery',
    body: 'We commit to the slot you book. If we run late, we tell you up front.',
  },
  {
    icon: Wallet,
    title: 'Transparent pricing',
    body: 'Detailed estimate up front. No surprise charges on delivery day.',
  },
];

export function WhyChooseUs() {
  return (
    <Box as="section" bg="bg.subtle" py={{ base: 16, sm: 20 }}>
      <Container maxW="7xl">
        <Box maxW="2xl" mx="auto" textAlign="center">
          <Heading as="h2" fontSize={{ base: '3xl', sm: '4xl' }} letterSpacing="tight">
            Why customers choose us
          </Heading>
          <Text mt={3} color="fg.muted">
            Four things we never compromise on.
          </Text>
        </Box>

        <SimpleGrid mt={12} columns={{ base: 1, sm: 2, lg: 4 }} gap={6}>
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <Box key={title} rounded="2xl" p={6} {...glassCard}>
              <Flex
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
              <Heading as="h3" mt={4} fontSize="md" fontWeight="semibold">
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
