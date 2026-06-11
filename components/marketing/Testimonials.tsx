import { Box, Container, SimpleGrid, Heading, Text, HStack } from '@chakra-ui/react';
import { Star } from 'lucide-react';
import { getTestimonials } from '@/lib/cms';
import { glassCard } from '@/theme/glass';

export async function Testimonials() {
  const items = await getTestimonials();
  if (items.length === 0) return null;

  return (
    <Box as="section" bg="bg.subtle" py={{ base: 16, sm: 20 }}>
      <Container maxW="7xl">
        <Box maxW="2xl" mx="auto" textAlign="center">
          <Heading as="h2" fontSize={{ base: '3xl', sm: '4xl' }} letterSpacing="tight">
            What our customers say
          </Heading>
        </Box>

        <SimpleGrid mt={12} columns={{ base: 1, md: 3 }} gap={6}>
          {items.map((t) => {
            const stars = t.rating ?? 5;
            return (
              <Box as="figure" key={t.id} rounded="2xl" p={6} m={0} {...glassCard}>
                <HStack gap={0.5} color="yellow.400">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} size={16} fill="currentColor" />
                  ))}
                </HStack>
                <Text as="blockquote" mt={3} fontSize="sm">
                  &ldquo;{t.quote}&rdquo;
                </Text>
                <Text as="figcaption" mt={4} fontSize="xs" color="fg.muted">
                  <Text as="span" fontWeight="semibold" color="fg">
                    {t.name}
                  </Text>
                  {t.city ? <> · {t.city}</> : null}
                </Text>
              </Box>
            );
          })}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
