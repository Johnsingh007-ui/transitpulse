import React, { useState, useEffect } from 'react';
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
  Divider,
  Button,
  useColorModeValue,
  Skeleton
} from '@chakra-ui/react';
import { 
  FiActivity, 
  FiTruck, 
  FiMapPin, 
  FiClock, 
  FiTrendingUp, 
  FiUsers,
  FiRefreshCw,
  FiZap,
  FiMap
} from 'react-icons/fi';
import RouteList from './components/RouteList';
import RouteDirections from './components/RouteDirections';
import RouteStats from './components/RouteStats';
import RealTimeMap from './components/RealTimeMap';
import RouteSchedule from './components/RouteSchedule';
import LiveOperations from './components/LiveOperations';
import RouteLadder from './components/RouteLadder';

const App: React.FC = () => {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [realTimeStats, setRealTimeStats] = useState({
    activeVehicles: 0,
    totalRoutes: 12,
    onTimePerformance: 87.3,
    dailyRidership: 8547,
    averageDelay: 2.4,
    totalStops: 433,
    lastUpdate: new Date()
  });
  const [loading, setLoading] = useState(true);

  // Fetch real-time statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch vehicle count
        const vehiclesResponse = await fetch('/api/v1/vehicles/realtime');
        if (vehiclesResponse.ok) {
          const vehiclesData = await vehiclesResponse.json();
          const activeVehicleCount = vehiclesData.data?.length || 0;
          
          setRealTimeStats(prev => ({
            ...prev,
            activeVehicles: activeVehicleCount,
            lastUpdate: new Date()
          }));
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  return (
    <Box bg={bgColor} minH="100vh">
      {/* Enhanced Header */}
      <Box bg={cardBg} borderBottom="1px" borderColor="gray.200" py={4} shadow="sm">
        <Container maxW="container.xl">
          <Flex justify="space-between" align="center">
            <Box>
              <HStack spacing={3} mb={1}>
                <Icon as={FiZap} color="blue.500" boxSize={8} />
                <Heading as="h1" size="xl" color="blue.600">
                  TransitPulse
                </Heading>
              </HStack>
              <Text color="gray.600" fontSize="md" fontWeight="medium">
                Golden Gate Transit • Real-time Operations Dashboard
              </Text>
            </Box>
            <VStack spacing={2} align="end">
              <HStack spacing={3}>
                <Badge colorScheme="green" px={3} py={1} borderRadius="full" fontSize="sm">
                  <Icon as={FiActivity} mr={1} />
                  Live Data
                </Badge>
                <Badge colorScheme="blue" px={3} py={1} borderRadius="full" fontSize="sm">
                  <Icon as={FiMap} mr={1} />
                  {realTimeStats.activeVehicles} Active Vehicles
                </Badge>
              </HStack>
              <Text fontSize="xs" color="gray.500">
                Last updated: {realTimeStats.lastUpdate.toLocaleTimeString()}
              </Text>
            </VStack>
          </Flex>
        </Container>
      </Box>

      {/* Enhanced Real-time Stats Overview */}
      <Container maxW="container.xl" py={6}>
        <VStack spacing={6} align="stretch">
          <Box>
            <Flex justify="space-between" align="center" mb={4}>
              <Heading size="md" color="gray.700">Live System Metrics</Heading>
              <Button
                leftIcon={<FiRefreshCw />}
                size="sm"
                variant="outline"
                colorScheme="blue"
                onClick={() => window.location.reload()}
              >
                Refresh Dashboard
              </Button>
            </Flex>
            <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(6, 1fr)" }} gap={4}>
              <Card bg={cardBg} transition="all 0.2s" _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}>
                <CardBody p={4}>
                  <Stat>
                    <StatLabel fontSize="xs" color="gray.500">Active Vehicles</StatLabel>
                    <StatNumber fontSize="2xl" color="blue.600">
                      {loading ? <Skeleton height="32px" /> : (
                        <HStack>
                          <Icon as={FiTruck} />
                          <Text>{realTimeStats.activeVehicles}</Text>
                        </HStack>
                      )}
                    </StatNumber>
                    <StatHelpText fontSize="xs">Real-time tracking</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>

              <Card bg={cardBg} transition="all 0.2s" _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}>
                <CardBody p={4}>
                  <Stat>
                    <StatLabel fontSize="xs" color="gray.500">Routes Operating</StatLabel>
                    <StatNumber fontSize="2xl" color="green.600">
                      <HStack>
                        <Icon as={FiMapPin} />
                        <Text>{realTimeStats.totalRoutes}</Text>
                      </HStack>
                    </StatNumber>
                    <StatHelpText fontSize="xs">All routes active</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>

              <Card bg={cardBg} transition="all 0.2s" _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}>
                <CardBody p={4}>
                  <Stat>
                    <StatLabel fontSize="xs" color="gray.500">On-Time Performance</StatLabel>
                    <StatNumber fontSize="2xl" color="green.600">
                      <HStack>
                        <Icon as={FiClock} />
                        <Text>{realTimeStats.onTimePerformance}%</Text>
                      </HStack>
                    </StatNumber>
                    <StatHelpText fontSize="xs">
                      <StatArrow type="increase" />
                      Above target
                    </StatHelpText>
                  </Stat>
                </CardBody>
              </Card>

              <Card bg={cardBg} transition="all 0.2s" _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}>
                <CardBody p={4}>
                  <Stat>
                    <StatLabel fontSize="xs" color="gray.500">Daily Ridership</StatLabel>
                    <StatNumber fontSize="2xl" color="purple.600">
                      <HStack>
                        <Icon as={FiUsers} />
                        <Text>{realTimeStats.dailyRidership.toLocaleString()}</Text>
                      </HStack>
                    </StatNumber>
                    <StatHelpText fontSize="xs">Today's passengers</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>

              <Card bg={cardBg} transition="all 0.2s" _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}>
                <CardBody p={4}>
                  <Stat>
                    <StatLabel fontSize="xs" color="gray.500">Avg Delay</StatLabel>
                    <StatNumber fontSize="2xl" color="orange.600">
                      <HStack>
                        <Icon as={FiTrendingUp} />
                        <Text>{realTimeStats.averageDelay}m</Text>
                      </HStack>
                    </StatNumber>
                    <StatHelpText fontSize="xs">System-wide</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>

              <Card bg={cardBg} transition="all 0.2s" _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}>
                <CardBody p={4}>
                  <Stat>
                    <StatLabel fontSize="xs" color="gray.500">Total Stops</StatLabel>
                    <StatNumber fontSize="2xl" color="teal.600">
                      <HStack>
                        <Icon as={FiMapPin} />
                        <Text>{realTimeStats.totalStops}</Text>
                      </HStack>
                    </StatNumber>
                    <StatHelpText fontSize="xs">Network coverage</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
            </Grid>
          </Box>

          <Divider />

          {/* Main Dashboard Tabs */}
          <Tabs variant="enclosed" colorScheme="blue" size="lg">
            <TabList bg={cardBg} borderRadius="md" p={1} shadow="sm">
              <Tab fontWeight="semibold" _selected={{ bg: "blue.500", color: "white" }}>
                🚨 Live Operations
              </Tab>
              <Tab fontWeight="semibold" _selected={{ bg: "blue.500", color: "white" }}>
                🗺️ Fleet Map
              </Tab>
              <Tab fontWeight="semibold" _selected={{ bg: "blue.500", color: "white" }}>
                📊 Route Analytics
              </Tab>
              <Tab fontWeight="semibold" _selected={{ bg: "blue.500", color: "white" }}>
                🚌 Route Ladder
              </Tab>
              <Tab fontWeight="semibold" _selected={{ bg: "blue.500", color: "white" }}>
                📅 Schedule Monitor
              </Tab>
            </TabList>
            
            <TabPanels bg={cardBg} borderRadius="md" mt={4} shadow="sm">
              {/* Live Operations Tab */}
              <TabPanel p={6}>
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between">
                    <Heading size="md" color="gray.700">Live Operations Center</Heading>
                    <Badge colorScheme="green" variant="subtle" fontSize="sm">
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
                    <Badge colorScheme="green" variant="subtle" fontSize="sm">
                      Live vehicle positions
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
                      <RealTimeMap selectedRoute={selectedRouteId || 'all'} />
                    </GridItem>
                  </Grid>
                </VStack>
              </TabPanel>
              
              {/* Route Analytics Tab */}
              <TabPanel p={6}>
                <VStack spacing={6} align="stretch">
                  <HStack justify="space-between">
                    <Heading size="md" color="gray.700">Performance Analytics</Heading>
                    <Badge colorScheme="blue" variant="subtle" fontSize="sm">
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
                    <Badge colorScheme="purple" variant="subtle" fontSize="sm">
                      Real-time stop progression
                    </Badge>
                  </HStack>
                  <RouteLadder routeId={selectedRouteId ?? undefined} />
                </VStack>
              </TabPanel>
              
              {/* Schedule Monitor Tab */}
              <TabPanel p={6}>
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between">
                    <Heading size="md" color="gray.700">Schedule Adherence Monitor</Heading>
                    <Badge colorScheme="orange" variant="subtle" fontSize="sm">
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
