import React from 'react';
import { Container, Box, Heading, VStack, Text } from '@chakra-ui/react';
import RouteList from './components/RouteList';
import RouteStats from './components/RouteStats';

const App: React.FC = () => {
  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading as="h1" size="2xl" mb={2} color="blue.600">TransitPulse</Heading>
          <Text fontSize="lg" color="gray.600">
            Real-time transit information at your fingertips
          </Text>
        </Box>
        <RouteStats />
        <RouteList />
      </VStack>
    </Container>
  );
};

export default App;
