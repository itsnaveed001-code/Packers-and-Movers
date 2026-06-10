import { Box, Container, SimpleGrid, Heading, Text, Flex } from '@chakra-ui/react';
import { Shield, Wallet, Clock, BadgeCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BUSINESS, PRIMARY_CITY } from '@/lib/constants';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'About',
  description: `Learn about ${BUSINESS.name}, our mission, and the team behind your move in ${PRIMARY_CITY}.`,
  path: '/about',
});

const VALUES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: BadgeCheck,
    title: 'Careful handling',
    body: 'Trained, background-checked crew who pack and move your things like their own.',
  },
  {
    icon: Wallet,
    title: 'Honest pricing',
    body: 'A clear estimate up front. No hidden charges added on the day of the move.',
  },
  {
    icon: Clock,
    title: 'On time',
    body: 'We show up in the slot you book — and keep you posted if anything changes.',
  },
  {
    icon: Shield,
    title: 'Insured moves',
    body: 'Transit cover available on every booking, so your move is protected.',
  },
];

export default function AboutPage() {
  return (
    <Box bg="white">
      <Box
        as="section"
        borderBottomWidth="1px"
        bgGradient="to-b"
        gradientFrom="brand.50"
        gradientTo="white"
      >
        <Container maxW="7xl" py={{ base: 14, sm: 16 }}>
          <Heading as="h1" fontSize={{ base: '3xl', sm: '4xl' }} letterSpacing="tight">
            About {BUSINESS.name}
          </Heading>
          <Text mt={4} maxW="2xl" color="fg.muted">
            {BUSINESS.name} is a packers and movers service based in {PRIMARY_CITY},
            helping families and businesses relocate with less stress. We focus on
            careful handling, honest pricing, and showing up when we say we will.
          </Text>
        </Container>
      </Box>

      <Container maxW="7xl" py={{ base: 14, sm: 16 }}>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={10}>
          <Box>
            <Heading as="h2" fontSize="2xl" fontWeight="semibold">
              Our story
            </Heading>
            <Text mt={3} color="fg.muted">
              We started {BUSINESS.name} with a simple belief: moving shouldn&apos;t be
              chaotic. We&apos;re building a moving service that {PRIMARY_CITY} can rely
              on — one careful, on-time move at a time.
            </Text>
            <Text mt={3} color="fg.muted">
              Every move is handled by a trained, background-checked crew and tracked
              from start to finish. No surprises, no hidden charges.
            </Text>
          </Box>

          <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
            {VALUES.map(({ icon: Icon, title, body }) => (
              <Box key={title} rounded="2xl" borderWidth="1px" bg="white" p={6} shadow="sm">
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
        </SimpleGrid>
      </Container>
    </Box>
  );
}
