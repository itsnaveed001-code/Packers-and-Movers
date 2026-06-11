import { Box, Container, SimpleGrid, Heading, Text, Flex } from '@chakra-ui/react';
import { Truck } from 'lucide-react';
import { getHomeFeatures } from '@/lib/cms';
import { getIcon } from '@/lib/icon-map';

export async function HowItWorks() {
  const steps = await getHomeFeatures('how_it_works');
  if (steps.length === 0) return null;

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
          {steps.map((step, i) => {
            const Icon = getIcon(step.icon) ?? Truck;
            return (
              <Box
                as="li"
                key={step.id}
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
                  {step.title}
                </Heading>
                <Text mt={1} fontSize="sm" color="fg.muted">
                  {step.body}
                </Text>
              </Box>
            );
          })}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
