import { Box, Container, SimpleGrid, Heading, Text, HStack } from '@chakra-ui/react';
import { MapPin } from 'lucide-react';
import { SERVICE_AREAS, PRIMARY_CITY } from '@/lib/constants';

export function ServiceAreas() {
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
          {SERVICE_AREAS.map((area) => (
            <HStack
              as="li"
              key={area}
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
              {area}
            </HStack>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
