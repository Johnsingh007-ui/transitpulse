import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Grid,
  Heading,
  Text,
  Button,
  ButtonGroup,
  Input,
  Select,
  Switch,
  FormControl,
  FormLabel,
  Card,
  CardBody,
  CardHeader,
  Stat,
  StatLabel,
  StatNumber,
  Icon,
  VStack,
  HStack,
  useColorModeValue,
  Collapse,
  IconButton,
  Tooltip,
  InputGroup,
  InputLeftElement,
  Divider,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel
} from '@chakra-ui/react';
import {
  FiChevronLeft,
  FiChevronRight,
  FiAlertTriangle,
  FiRefreshCw,
  FiMap,
  FiList,
  FiBarChart2,
  FiSearch
} from 'react-icons/fi';
import { EnhancedRealTimeMap } from './EnhancedRealTimeMap';
import { EnhancedActiveTripsTable } from './EnhancedActiveTripsTable';
import { EnhancedRouteLadderView } from './EnhancedRouteLadderView';
import { RouteStatusSummary } from './RouteStatusSummary';
import { RouteActiveTrips } from './RouteActiveTrips';

const allowedStatuses = ['early', 'on-time', 'late', 'missing', 'layover'] as const;
const normalizeStatus = (status: string | undefined) =>
  allowedStatuses.includes(status as any)
    ? (status as typeof allowedStatuses[number])
    : undefined;

interface VehicleData {
  vehicle_id: string;
  route_id: string;
  trip_id: string;
  latitude: number;
  longitude: number;
  bearing?: number;
  speed?: number;
  timestamp: string;
  agency: string;
  status?: string;
  direction_id?: number;
  direction_name?: string;
  headsign?: string;
  crowding?: 'low' | 'medium' | 'high';
  operator?: string;
}

interface RealtimeStats {
  totalTrips: number;
  earlyTrips: number;
  onTimeTrips: number;
  lateTrips: number;
  missingTrips: number;
  layoverTrips: number;
  routes: {
    [key: string]: {
      issues: number;
      totalVehicles: number;
    };
  };
}

export const ModernDashboard: React.FC = () => {
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>(['all']);
  const [selectedRoute, setSelectedRoute] = useState<string | undefined>(undefined); // For route-specific view
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [showStops, setShowStops] = useState(true);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [vehicleData, setVehicleData] = useState<VehicleData[]>([]);
  const [allRoutes, setAllRoutes] = useState<any[]>([]); // All scheduled routes
  const [realtimeStats, setRealtimeStats] = useState<RealtimeStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  // Fetch real-time data and all routes
  const fetchRealtimeData = async () => {
    setLoading(true);
    try {
      // Fetch vehicle data
      const vehicleResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:9002/api/v1'}/vehicles/realtime`);
      const vehicleData = await vehicleResponse.json();
      
      // Fetch all routes (for dropdown that shows all scheduled routes)
      const routesResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:9002/api/v1'}/routes`);
      const routesData = await routesResponse.json();
      
      if (vehicleData.status === 'success' && vehicleData.data) {
        setVehicleData(vehicleData.data || []);
        
        // Calculate stats
        const stats: RealtimeStats = {
          totalTrips: vehicleData.data?.length || 0,
          earlyTrips: vehicleData.data?.filter((v: VehicleData) => v.status === 'early').length || 0,
          onTimeTrips: vehicleData.data?.filter((v: VehicleData) => v.status === 'on-time').length || 0,
          lateTrips: vehicleData.data?.filter((v: VehicleData) => v.status === 'late').length || 0,
          missingTrips: vehicleData.data?.filter((v: VehicleData) => v.status === 'missing').length || 0,
          layoverTrips: vehicleData.data?.filter((v: VehicleData) => v.status === 'layover').length || 0,
          routes: {},
        };
        
        // Calculate route-specific stats
        vehicleData.data?.forEach((vehicle: VehicleData) => {
          if (!stats.routes[vehicle.route_id]) {
            stats.routes[vehicle.route_id] = { issues: 0, totalVehicles: 0 };
          }
          stats.routes[vehicle.route_id].totalVehicles++;
          if (vehicle.status === 'late' || vehicle.status === 'early' || vehicle.status === 'missing') {
            stats.routes[vehicle.route_id].issues++;
          }
        });
        
        setRealtimeStats(stats);
        setLastUpdate(new Date());
      }

      // Set all routes for dropdown (includes routes without active vehicles)
      if (routesData.status === 'success' && routesData.routes) {
        setAllRoutes(routesData.routes || []);
      }
    } catch (error) {
      console.error('Failed to fetch realtime data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealtimeData();
    const interval = setInterval(fetchRealtimeData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter available routes (only routes with active vehicles)
  const availableRoutes = [...new Set(vehicleData.map(v => v.route_id))].sort();

  // Filter vehicles based on selected routes and search, and ensure status matches allowed values
  const filteredVehicles = vehicleData
    .filter(vehicle => {
      if (selectedRoutes.includes('all') || selectedRoutes.includes(vehicle.route_id)) {
        if (searchQuery) {
          return (
            vehicle.vehicle_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            vehicle.route_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            vehicle.trip_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            vehicle.operator?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            vehicle.agency.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        return true;
      }
      return false;
    })
    .map(vehicle => ({
      ...vehicle,
      status: normalizeStatus(vehicle.status),
    }));
  // Sync selectedRoute and selectedRoutes
  useEffect(() => {
    if (selectedRoute && !selectedRoutes.includes(selectedRoute)) {
      setSelectedRoutes([selectedRoute]);
    }
  }, [selectedRoute]);

  const getStatusPercentage = (count: number, total: number) => {
    return total > 0 ? (count / total) * 100 : 0;
  };

  return (
    <Box bg={bgColor} minH="100vh" p={8}>
      {/* Header */}
      <Flex align="center" justify="space-between" mb={8}>
        <Box>
          <Heading size="lg" color="blue.600" mb={2}>
            Live Operations Dashboard
          </Heading>
          <Text color="gray.600" fontSize="md">
            Real-time transit monitoring • Last updated: {lastUpdate.toLocaleTimeString()}
          </Text>
        </Box>
        <HStack spacing={6}>
          <Tooltip label="Refresh data">
            <IconButton
              aria-label="Refresh"
              icon={<FiRefreshCw />}
              onClick={fetchRealtimeData}
              isLoading={loading}
              size="md"
              variant="outline"
            />
          </Tooltip>
          {/* Removed redundant viewMode ButtonGroup, now handled by Tabs below */}
          {selectedRoute && (
            <Button size="md" variant="outline" onClick={() => setSelectedRoute(undefined)}>Back to Overview</Button>
          )}
        </HStack>
      </Flex>
      <Divider mb={8} />
      {/* Route Status Summary - Always visible at top */}
      <RouteStatusSummary onRouteClick={setSelectedRoute} selectedRoute={selectedRoute} />
      <Divider my={8} />
      {/* Conditional Content - Either route-specific view or dashboard */}
      {selectedRoute ? (
        <RouteActiveTrips routeId={selectedRoute} routeName={allRoutes.find(r => r.route_id === selectedRoute)?.route_short_name || selectedRoute} />
      ) : (
        <Grid templateColumns="340px 1fr" gap={10} h="calc(100vh - 260px)">
          {/* Sidebar */}
          <Box>
            <Card bg={cardBg} mb={6} p={4} borderRadius="xl" boxShadow="md">
              <CardHeader pb={2}>
                <Flex align="center" justify="space-between">
                  <Text fontWeight="semibold" fontSize="md">Real-Time Stats</Text>
                </Flex>
              </CardHeader>
              <CardBody pt={0}>
                <VStack spacing={4} align="stretch">
                  <Stat>
                    <StatLabel fontSize="sm">Active Trips</StatLabel>
                    <StatNumber fontSize="2xl">{realtimeStats?.totalTrips || 0}</StatNumber>
                  </Stat>
                  <VStack spacing={3} align="stretch">
                    <HStack justify="space-between">
                      <HStack>
                        <Box w={3} h={3} bg="red.400" rounded="full" />
                        <Text fontSize="md">Early: {realtimeStats?.earlyTrips || 0}</Text>
                      </HStack>
                      <Text fontSize="sm" color="gray.500">({realtimeStats ? getStatusPercentage(realtimeStats.earlyTrips, realtimeStats.totalTrips).toFixed(1) : 0}%)</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <HStack>
                        <Box w={3} h={3} bg="green.400" rounded="full" />
                        <Text fontSize="md">On-Time: {realtimeStats?.onTimeTrips || 0}</Text>
                      </HStack>
                      <Text fontSize="sm" color="gray.500">({realtimeStats ? getStatusPercentage(realtimeStats.onTimeTrips, realtimeStats.totalTrips).toFixed(1) : 0}%)</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <HStack>
                        <Box w={3} h={3} bg="yellow.400" rounded="full" />
                        <Text fontSize="md">Late: {realtimeStats?.lateTrips || 0}</Text>
                      </HStack>
                      <Text fontSize="sm" color="gray.500">({realtimeStats ? getStatusPercentage(realtimeStats.lateTrips, realtimeStats.totalTrips).toFixed(1) : 0}%)</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <HStack>
                        <Box w={3} h={3} bg="blue.400" rounded="full" />
                        <Text fontSize="md">Layover/Deadhead: {realtimeStats?.layoverTrips || 0}</Text>
                      </HStack>
                      <Text fontSize="sm" color="gray.500">({realtimeStats ? getStatusPercentage(realtimeStats.layoverTrips, realtimeStats.totalTrips).toFixed(1) : 0}%)</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <HStack>
                        <Box w={3} h={3} bg="gray.400" rounded="full" />
                        <Text fontSize="md">Missing: {realtimeStats?.missingTrips || 0}</Text>
                      </HStack>
                      <Text fontSize="sm" color="gray.500">({realtimeStats ? getStatusPercentage(realtimeStats.missingTrips, realtimeStats.totalTrips).toFixed(1) : 0}%)</Text>
                    </HStack>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>
            <Card bg={cardBg} mb={6} p={4} borderRadius="xl" boxShadow="md">
              <CardHeader pb={2}>
                <Text fontWeight="semibold" fontSize="md">All Routes</Text>
              </CardHeader>
              <CardBody pt={0}>
                <VStack spacing={4} align="stretch">
                  <Select size="md" value={selectedRoutes[0] || 'all'} onChange={(e) => { const value = e.target.value; setSelectedRoutes(value === 'all' ? ['all'] : [value]); }}>
                    <option value="all">All Routes</option>
                    {allRoutes.map(route => (
                      <option key={route.route_id} value={route.route_id}>Route {route.route_short_name || route.route_id} - {route.route_long_name || 'No name'}</option>
                    ))}
                  </Select>
                  <VStack spacing={2} align="stretch" maxH="200px" overflowY="auto">
                    <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={1}>Currently Active ({availableRoutes.length} routes)</Text>
                    {availableRoutes.map(route => { const routeStats = realtimeStats?.routes[route]; const hasIssues = routeStats && routeStats.issues > 0; return (<HStack key={route} p={2} bg={hasIssues ? 'red.50' : 'transparent'} rounded="md" fontSize="md" justify="space-between"><HStack><Text fontWeight="medium">Route {route}</Text>{hasIssues && <Icon as={FiAlertTriangle} color="red.500" boxSize={3} />}</HStack><Text color="gray.500" fontSize="sm">{routeStats?.totalVehicles || 0} vehicles</Text></HStack>); })}
                    {availableRoutes.length === 0 && (<Text fontSize="md" color="gray.500" textAlign="center" py={2}>No active routes</Text>)}
                  </VStack>
                </VStack>
              </CardBody>
            </Card>
            <Card bg={cardBg} p={4} borderRadius="xl" boxShadow="md">
              <CardHeader pb={2}>
                <Flex align="center" justify="space-between">
                  <Text fontWeight="semibold" fontSize="md">Filters</Text>
                  <IconButton aria-label="Toggle filters" icon={showFilters ? <FiChevronLeft /> : <FiChevronRight />} size="sm" variant="ghost" onClick={() => setShowFilters(!showFilters)} />
                </Flex>
              </CardHeader>
              <Collapse in={showFilters}>
                <CardBody pt={0}>
                  <VStack spacing={4} align="stretch">
                    {/* Add your filter controls here, e.g. search, switches, etc. */}
                  </VStack>
                </CardBody>
              </Collapse>
            </Card>
          </Box>
          {/* Main Content: Map/List/Ladder Views */}
          <Box>
            <Tabs variant="enclosed" colorScheme="blue">
              <TabList mb={4}>
                <Tab fontWeight="bold">Map</Tab>
                <Tab fontWeight="bold">List</Tab>
                <Tab fontWeight="bold">Ladder</Tab>
              </TabList>
              <TabPanels>
                <TabPanel px={0} py={2}>
                  <EnhancedRealTimeMap vehicles={filteredVehicles} allRoutes={allRoutes} selectedRouteId={selectedRoutes[0] !== 'all' ? selectedRoutes[0] : undefined} />
                </TabPanel>
                <TabPanel px={0} py={2}>
                  <EnhancedActiveTripsTable vehicles={filteredVehicles} allRoutes={allRoutes} />
                </TabPanel>
                <TabPanel px={0} py={2}>
                  <EnhancedRouteLadderView vehicles={filteredVehicles} allRoutes={allRoutes} selectedRouteId={selectedRoutes[0] !== 'all' ? selectedRoutes[0] : undefined} />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>
        </Grid>
      )}
    </Box>
  );
};
