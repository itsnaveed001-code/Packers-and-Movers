import { Box, Container, SimpleGrid, Heading, Text, Flex } from '@chakra-ui/react';
import { BadgeCheck } from 'lucide-react';
import { getHomeFeatures, getContentBlocksForPage } from '@/lib/cms';
import { getIcon } from '@/lib/icon-map';
import { glassCard } from '@/theme/glass';

export async function WhyChooseUs() {
  const [pillars, copy] = await Promise.all([
    getHomeFeatures('why_choose'),
    getContentBlocksForPage('home'),
  ]);

  if (pillars.length === 0) return null;

  const title = (copy.why_choose_title as string | undefined) ?? 'Why customers choose us';
  const subtitle =
    (copy.why_choose_subtitle as string | undefined) ?? 'Four things we never compromise on.';

  return (
    <Box as="section" bg="bg.subtle" py={{ base: 16, sm: 20 }}>
      <Container maxW="7xl">
        <Box maxW="2xl" mx="auto" textAlign="center">
          <Heading as="h2" fontSize={{ base: '3xl', sm: '4xl' }} letterSpacing="tight">
            {title}
          </Heading>
          <Text mt={3} color="fg.muted">
            {subtitle}
          </Text>
        </Box>

        <SimpleGrid mt={12} columns={{ base: 1, sm: 2, lg: 4 }} gap={6}>
          {pillars.map((p) => {
            const Icon = getIcon(p.icon) ?? BadgeCheck;
            return (
              <Box key={p.id} rounded="2xl" p={6} {...glassCard}>
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
                  {p.title}
                </Heading>
                <Text mt={1} fontSize="sm" color="fg.muted">
                  {p.body}
                </Text>
              </Box>
            );
          })}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
