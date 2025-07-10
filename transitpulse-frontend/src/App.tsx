import React, { useState } from 'react';
import { 
  Container, 
  Box, 
  Heading, 
  VStack, 
  Text, 
  Grid, 
  GridItem,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel
} from '@chakra-ui/react';
import RouteList from './components/RouteList';
import RouteDirections from './components/RouteDirections';
import RouteStats from './components/RouteStats';
import TransitMap from './components/TransitMap';
import RouteSchedule from './components/RouteSchedule';

const App: React.FC = () => {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  return (
    <Container maxW="container.xl" py={4}>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading as="h1" size="2xl" mb={2} color="blue.600">TransitPulse</Heading>
          <Text fontSize="lg" color="gray.600">
            Real-time transit tracking with live vehicle positions
          </Text>
        </Box>
        
        <Tabs variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab>🗺️ Live Map</Tab>
            <Tab>📊 Routes & Stats</Tab>
            <Tab>🧭 Directions</Tab>
            <Tab>📅 Schedules</Tab>
          </TabList>
          
          <TabPanels>
            <TabPanel p={0} pt={4}>
              <Grid templateColumns={{ base: "1fr", lg: "300px 1fr" }} gap={4} h="calc(100vh - 200px)">
                <GridItem>
                  <Box h="full" overflowY="auto">
                    <RouteDirections onRouteSelect={setSelectedRouteId} selectedRouteId={selectedRouteId} />
                  </Box>
                </GridItem>
                <GridItem>
                  <TransitMap selectedRouteId={selectedRouteId} />
                </GridItem>
              </Grid>
            </TabPanel>
            
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <RouteStats />
                <RouteList onRouteSelect={setSelectedRouteId} selectedRouteId={selectedRouteId} />
              </VStack>
            </TabPanel>
            
            <TabPanel>
              <RouteDirections onRouteSelect={setSelectedRouteId} selectedRouteId={selectedRouteId} />
            </TabPanel>
            
            <TabPanel>
              <Grid templateColumns={{ base: "1fr", lg: "300px 1fr" }} gap={4} h="calc(100vh - 200px)">
                <GridItem>
                  <Box h="full" overflowY="auto">
                    <RouteDirections onRouteSelect={setSelectedRouteId} selectedRouteId={selectedRouteId} />
                  </Box>
                </GridItem>
                <GridItem>
                  <Box h="full" overflowY="auto" bg="white" borderRadius="md" border="1px" borderColor="gray.200" p={4}>
                    <RouteSchedule routeId={selectedRouteId} />
                  </Box>
                </GridItem>
              </Grid>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
  );
};

export default App;
