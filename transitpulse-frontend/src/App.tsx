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
  TabPanel,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Badge,
  HStack,
  Icon,
  Card,
  CardHeader,
  CardBody,
  Divider
} from '@chakra-ui/react';
import { FiActivity, FiTruck, FiMapPin, FiClock, FiTrendingUp, FiUsers } from 'react-icons/fi';
import RouteList from './components/RouteList';
import RouteDirections from './components/RouteDirections';
import RouteStats from './components/RouteStats';
import RealTimeMap from './components/RealTimeMap';
import RouteSchedule from './components/RouteSchedule';
import LiveOperations from './components/LiveOperations';
import RouteLadder from './components/RouteLadder';

const App: React.FC = () => {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  // Mock real-time data - in real app this would come from API
  const agencyStats = {
    activeVehicles: 42,
    totalRoutes: 12,
    onTimePerformance: 87.3,
    dailyRidership: 8547,
    averageDelay: 2.4,
    totalStops: 433
  };

  return (
    <Box bg="gray.50" minH="100vh">
      {/* Header */}
      <Box bg="white" borderBottom="1px" borderColor="gray.200" py={4}>
        <Container maxW="container.xl">
          <Flex justify="space-between" align="center">
            <Box>
              <Heading as="h1" size="xl" color="blue.600" mb={1}>
                TransitPulse Dashboard
              </Heading>
              <Text color="gray.600" fontSize="md">
                Golden Gate Transit • Live Operations Center
              </Text>
            </Box>
            <Badge colorScheme="green" px={3} py={1} borderRadius="full" fontSize="sm">
              <Icon as={FiActivity} mr={1} />
              System Operational
            </Badge>
          </Flex>
        </Container>
      </Box>

      {/* Real-time Stats Overview */}
      <Container maxW="container.xl" py={6}>
        <VStack spacing={6} align="stretch">
          <Box>
            <Heading size="md" mb={4} color="gray.700">System Overview</Heading>
            <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(6, 1fr)" }} gap={4}>
              <Card>
                <CardBody p={4}>
                  <Stat>
                    <StatLabel fontSize="xs" color="gray.500">Active Vehicles</StatLabel>
                    <StatNumber fontSize="2xl" color="blue.600">
                      <Icon as={FiTruck} mr={2} />
                      {agencyStats.activeVehicles}
                    </StatNumber>
                    <StatHelpText fontSize="xs">of 45 total</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>

              <Card>
                <CardBody p={4}>
                  <Stat>
                    <StatLabel fontSize="xs" color="gray.500">Routes Operating</StatLabel>
                    <StatNumber fontSize="2xl" color="green.600">
                      <Icon as={FiMapPin} mr={2} />
                      {agencyStats.totalRoutes}
                    </StatNumber>
                    <StatHelpText fontSize="xs">All routes active</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>

              <Card>
                <CardBody p={4}>
                  <Stat>
                    <StatLabel fontSize="xs" color="gray.500">On-Time Performance</StatLabel>
                    <StatNumber fontSize="2xl" color="green.500">
                      {agencyStats.onTimePerformance}%
                    </StatNumber>
                    <StatHelpText fontSize="xs">
                      <StatArrow type="increase" />
                      +2.1% vs yesterday
                    </StatHelpText>
                  </Stat>
                </CardBody>
              </Card>

              <Card>
                <CardBody p={4}>
                  <Stat>
                    <StatLabel fontSize="xs" color="gray.500">Daily Ridership</StatLabel>
                    <StatNumber fontSize="2xl" color="purple.600">
                      <Icon as={FiUsers} mr={2} />
                      {agencyStats.dailyRidership.toLocaleString()}
                    </StatNumber>
                    <StatHelpText fontSize="xs">Projected total</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>

              <Card>
                <CardBody p={4}>
                  <Stat>
                    <StatLabel fontSize="xs" color="gray.500">Average Delay</StatLabel>
                    <StatNumber fontSize="2xl" color="orange.500">
                      <Icon as={FiClock} mr={2} />
                      {agencyStats.averageDelay}m
                    </StatNumber>
                    <StatHelpText fontSize="xs">
                      <StatArrow type="decrease" />
                      -0.3m vs yesterday
                    </StatHelpText>
                  </Stat>
                </CardBody>
              </Card>

              <Card>
                <CardBody p={4}>
                  <Stat>
                    <StatLabel fontSize="xs" color="gray.500">Service Coverage</StatLabel>
                    <StatNumber fontSize="2xl" color="teal.600">
                      <Icon as={FiTrendingUp} mr={2} />
                      {agencyStats.totalStops}
                    </StatNumber>
                    <StatHelpText fontSize="xs">Total stops</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
            </Grid>
          </Box>

          <Divider />

          {/* Main Dashboard Tabs */}
          <Tabs variant="enclosed" colorScheme="blue" size="lg">
            <TabList bg="white" borderRadius="md" p={1}>
              <Tab fontWeight="semibold" _selected={{ bg: "blue.500", color: "white" }}>
                � Live Operations
              </Tab>
              <Tab fontWeight="semibold" _selected={{ bg: "blue.500", color: "white" }}>
                �️ Fleet Map
              </Tab>
              <Tab fontWeight="semibold" _selected={{ bg: "blue.500", color: "white" }}>
                �📊 Route Analytics
              </Tab>
              <Tab fontWeight="semibold" _selected={{ bg: "blue.500", color: "white" }}>
                🚌 Route Ladder
              </Tab>
              <Tab fontWeight="semibold" _selected={{ bg: "blue.500", color: "white" }}>
                📅 Schedule Monitor
              </Tab>
            </TabList>
            
            <TabPanels bg="white" borderRadius="md" mt={4}>
              {/* Live Operations Tab */}
              <TabPanel p={6}>
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between">
                    <Heading size="md" color="gray.700">Live Operations Center</Heading>
                    <Badge colorScheme="green" variant="subtle">
                      Real-time vehicle monitoring
                    </Badge>
                  </HStack>
                  <LiveOperations />
                </VStack>
              </TabPanel>

              {/* Fleet Map Tab */}
              <TabPanel p={6}>
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between">
                    <Heading size="md" color="gray.700">Real-Time Fleet Map</Heading>
                    <Badge colorScheme="green" variant="subtle">
                      Last updated: just now
                    </Badge>
                  </HStack>
                  <Grid templateColumns={{ base: "1fr", lg: "320px 1fr" }} gap={6} h="calc(100vh - 350px)">
                    <GridItem>
                      <Card h="full">
                        <CardHeader pb={2}>
                          <Heading size="sm">Route Filters</Heading>
                        </CardHeader>
                        <CardBody pt={0} overflowY="auto">
                          <RouteDirections onRouteSelect={setSelectedRouteId} selectedRouteId={selectedRouteId} />
                        </CardBody>
                      </Card>
                    </GridItem>
                    <GridItem>
                      <Card h="full">
                        <CardBody p={0}>
                          <RealTimeMap selectedRoute={selectedRouteId || 'all'} />
                        </CardBody>
                      </Card>
                    </GridItem>
                  </Grid>
                </VStack>
              </TabPanel>
              
              {/* Route Analytics Tab */}
              <TabPanel p={6}>
                <VStack spacing={6} align="stretch">
                  <HStack justify="space-between">
                    <Heading size="md" color="gray.700">Performance Analytics</Heading>
                    <Badge colorScheme="blue" variant="subtle">
                      Updated every 15 minutes
                    </Badge>
                  </HStack>
                  <RouteStats />
                  <Divider />
                  <Box>
                    <Heading size="sm" mb={4} color="gray.700">Route Details</Heading>
                    <RouteList onRouteSelect={setSelectedRouteId} selectedRouteId={selectedRouteId} />
                  </Box>
                </VStack>
              </TabPanel>

              {/* Route Ladder Tab */}
              <TabPanel p={6}>
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between">
                    <Heading size="md" color="gray.700">Route Ladder View</Heading>
                    <Badge colorScheme="purple" variant="subtle">
                      Real-time stop progression
                    </Badge>
                  </HStack>
                  <RouteLadder routeId={selectedRouteId} />
                </VStack>
              </TabPanel>
              
              {/* Schedule Monitor Tab */}
              <TabPanel p={6}>
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between">
                    <Heading size="md" color="gray.700">Schedule Adherence Monitor</Heading>
                    <Badge colorScheme="orange" variant="subtle">
                      Real-time schedule tracking
                    </Badge>
                  </HStack>
                  <Grid templateColumns={{ base: "1fr", lg: "320px 1fr" }} gap={6} h="calc(100vh - 350px)">
                    <GridItem>
                      <Card h="full">
                        <CardHeader pb={2}>
                          <Heading size="sm">Route Selection</Heading>
                        </CardHeader>
                        <CardBody pt={0} overflowY="auto">
                          <RouteDirections onRouteSelect={setSelectedRouteId} selectedRouteId={selectedRouteId} />
                        </CardBody>
                      </Card>
                    </GridItem>
                    <GridItem>
                      <Card h="full">
                        <CardBody overflowY="auto">
                          <RouteSchedule routeId={selectedRouteId} />
                        </CardBody>
                      </Card>
                    </GridItem>
                  </Grid>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Container>
    </Box>
  );
};

export default App;
