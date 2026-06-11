import { Box, Container, SimpleGrid, Heading, Text, HStack } from '@chakra-ui/react';
import { MapPin } from 'lucide-react';
import { getServiceAreas } from '@/lib/cms';
import { PRIMARY_CITY } from '@/lib/constants';

export async function ServiceAreas() {
  const areas = await getServiceAreas();
  if (areas.length === 0) return null;

  return (
    <Box as="section" py={{ base: 16, sm: 20 }}>
      <Container maxW="7xl">
        <Box maxW="2xl" mx="auto" textAlign="center">
          <Heading as="h2" fontSize={{ base: '3xl', sm: '4xl' }} letterSpacing="tight">
            Areas we serve in {PRIMARY_CITY}
          </Heading>
          <Text mt={3} color="fg.muted">
            Local home and office moves across {PRIMARY_CITY}. Don&apos;t see your area? Just ask.
          </Text>
        </Box>

        <SimpleGrid
          as="ul"
          mx="auto"
          mt={10}
          maxW="4xl"
          columns={{ base: 2, sm: 3, lg: 4 }}
          gap={3}
          listStyleType="none"
        >
          {areas.map((area) => (
            <HStack
              as="li"
              key={area.id}
              gap={2}
              rounded="xl"
              borderWidth="1px"
              bg="white"
              px={4}
              py={3}
              fontSize="sm"
              fontWeight="medium"
              shadow="sm"
            >
              <Box color="brand.600" flexShrink={0}>
                <MapPin size={16} />
              </Box>
              {area.name}
            </HStack>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
