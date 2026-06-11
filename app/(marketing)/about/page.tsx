import { Box, Container, SimpleGrid, Heading, Text, Flex } from '@chakra-ui/react';
import { BadgeCheck } from 'lucide-react';
import { getAboutValues, getSiteSettings, getContentBlocksForPage } from '@/lib/cms';
import { getIcon } from '@/lib/icon-map';
import { BUSINESS, PRIMARY_CITY } from '@/lib/constants';
import { pageMetadata } from '@/lib/seo';
import { glassCard } from '@/theme/glass';

export const dynamic = 'force-dynamic';

export const metadata = pageMetadata({
  title: 'About',
  description: `Learn about ${BUSINESS.name}, our mission, and the team behind your move in ${PRIMARY_CITY}.`,
  path: '/about',
});

export default async function AboutPage() {
  const [values, settings, copy] = await Promise.all([
    getAboutValues(),
    getSiteSettings(),
    getContentBlocksForPage('about'),
  ]);

  const companyName = settings?.company_name ?? BUSINESS.name;
  const h1 = (copy.heading_h1 as string | undefined) ?? `About ${companyName}`;
  const intro =
    (copy.intro as string | undefined) ??
    `${companyName} is a packers and movers service based in ${PRIMARY_CITY}, helping families and businesses relocate with less stress. We focus on careful handling, honest pricing, and showing up when we say we will.`;
  const storyHeading = (copy.story_heading as string | undefined) ?? 'Our story';
  const storyPara1 =
    (copy.story_para_1 as string | undefined) ??
    `We started ${companyName} with a simple belief: moving shouldn't be chaotic. We're building a moving service that ${PRIMARY_CITY} can rely on — one careful, on-time move at a time.`;
  const storyPara2 =
    (copy.story_para_2 as string | undefined) ??
    'Every move is handled by a trained, background-checked crew and tracked from start to finish. No surprises, no hidden charges.';

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
            {h1}
          </Heading>
          <Text mt={4} maxW="2xl" color="fg.muted">
            {intro}
          </Text>
        </Container>
      </Box>

      <Container maxW="7xl" py={{ base: 14, sm: 16 }}>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={10}>
          <Box>
            <Heading as="h2" fontSize="2xl" fontWeight="semibold">
              {storyHeading}
            </Heading>
            <Text mt={3} color="fg.muted">
              {storyPara1}
            </Text>
            <Text mt={3} color="fg.muted">
              {storyPara2}
            </Text>
          </Box>

          {values.length > 0 ? (
            <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
              {values.map((v) => {
                const Icon = getIcon(v.icon) ?? BadgeCheck;
                return (
                  <Box key={v.id} rounded="2xl" p={6} {...glassCard}>
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
                      {v.title}
                    </Heading>
                    <Text mt={1} fontSize="sm" color="fg.muted">
                      {v.body}
                    </Text>
                  </Box>
                );
              })}
            </SimpleGrid>
          ) : null}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
