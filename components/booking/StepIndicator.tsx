import { Box, HStack, Flex, Text } from '@chakra-ui/react';
import { Check } from 'lucide-react';

export type Step = { id: number; label: string };

export function StepIndicator({
  steps,
  current,
}: {
  steps: Step[];
  current: number;
}) {
  return (
    <HStack as="ol" align="center" gap={{ base: 1, sm: 2 }} aria-label="Booking steps">
      {steps.map((s, i) => {
        const isDone = s.id < current;
        const isActive = s.id === current;
        return (
          <Flex
            as="li"
            key={s.id}
            flex="1"
            align="center"
            gap={{ base: 1, sm: 2 }}
            listStyleType="none"
          >
            <Flex
              align="center"
              justify="center"
              h={7}
              w={7}
              flexShrink={0}
              rounded="full"
              borderWidth="1px"
              fontSize="xs"
              fontWeight="semibold"
              bg={isDone ? 'brand.600' : isActive ? 'brand.50' : 'transparent'}
              borderColor={isDone || isActive ? 'brand.600' : 'border'}
              color={isDone ? 'white' : isActive ? 'brand.700' : 'fg.muted'}
            >
              {isDone ? <Check size={14} /> : s.id}
            </Flex>
            <Text
              display={{ base: 'none', sm: 'inline' }}
              fontSize="xs"
              fontWeight="medium"
              color={isActive ? 'fg' : 'fg.muted'}
            >
              {s.label}
            </Text>
            {i < steps.length - 1 && <Box h="1px" flex="1" bg="border" aria-hidden />}
          </Flex>
        );
      })}
    </HStack>
  );
}
