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
} from '@chakra-ui/react';
import {
  FiMap,
  FiList,
  FiBarChart2,
  FiSearch,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
  FiAlertTriangle,
} from 'react-icons/fi';
import { EnhancedRealTimeMap } from './EnhancedRealTimeMap';
import { EnhancedActiveTripsTable } from './EnhancedActiveTripsTable';
import { EnhancedRouteLadderView } from './EnhancedRouteLadderView';
import { RouteStatusSummary } from './RouteStatusSummary';
import { RouteActiveTrips } from './RouteActiveTrips';

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

type ViewMode = 'map' | 'list' | 'ladder';

export const ModernDashboard: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('map');
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
  const allowedStatuses = ["early", "on-time", "late", "missing", "layover"] as const;
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
      status: allowedStatuses.includes(vehicle.status as any)
        ? (vehicle.status as typeof allowedStatuses[number])
        : undefined,
    }));

  const getStatusPercentage = (count: number, total: number) => {
    return total > 0 ? (count / total) * 100 : 0;
  };

  return (
    <Box bg={bgColor} minH="100vh" p={6}>
      {/* Header */}
      <Flex align="center" justify="space-between" mb={6}>
        <Box>
          <Heading size="lg" color="blue.600">
            Live Operations Dashboard
          </Heading>
          <Text color="gray.600" fontSize="sm">
            Real-time transit monitoring • Last updated: {lastUpdate.toLocaleTimeString()}
          </Text>
        </Box>
        
        <HStack spacing={3}>
          <Tooltip label="Refresh data">
            <IconButton
              aria-label="Refresh"
              icon={<FiRefreshCw />}
              onClick={fetchRealtimeData}
              isLoading={loading}
              size="sm"
              variant="outline"
            />
          </Tooltip>
          
          <ButtonGroup size="sm" isAttached variant="outline">
            <Button
              leftIcon={<FiMap />}
              isActive={viewMode === 'map'}
              onClick={() => setViewMode('map')}
            >
              Map
            </Button>
            <Button
              leftIcon={<FiList />}
              isActive={viewMode === 'list'}
              onClick={() => setViewMode('list')}
            >
              List
            </Button>
            <Button
              leftIcon={<FiBarChart2 />}
              isActive={viewMode === 'ladder'}
              onClick={() => setViewMode('ladder')}
            >
              Ladder
            </Button>
          </ButtonGroup>
          
          {selectedRoute && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedRoute(undefined)}
            >
              Back to Overview
            </Button>
          )}
        </HStack>
      </Flex>

      {/* Route Status Summary - Always visible at top */}
      <RouteStatusSummary 
        onRouteClick={setSelectedRoute}
        selectedRoute={selectedRoute}
      />

      {/* Conditional Content - Either route-specific view or dashboard */}
      {selectedRoute ? (
        /* Route-specific view showing active trips */
        <RouteActiveTrips 
          routeId={selectedRoute}
          routeName={allRoutes.find(r => r.route_id === selectedRoute)?.route_short_name || selectedRoute}
        />
      ) : (
        /* Main dashboard with sidebar and map/list/ladder views */
        <Grid templateColumns="300px 1fr" gap={6} h="calc(100vh - 200px)">
          {/* Sidebar */}
          <Box>
            {/* Real-time Stats Card */}
            <Card bg={cardBg} mb={4}>
              <CardHeader pb={2}>
                <Flex align="center" justify="space-between">
                  <Text fontWeight="semibold" fontSize="sm">Real-Time Stats</Text>
                  <Button size="xs" variant="ghost" colorScheme="blue">Hide</Button>
                </Flex>
              </CardHeader>
              <CardBody pt={0}>
                <VStack spacing={3} align="stretch">
                  <Stat>
                    <StatLabel fontSize="xs">Active Trips</StatLabel>
                    <StatNumber fontSize="2xl">{realtimeStats?.totalTrips || 0}</StatNumber>
                  </Stat>
                  
                  <VStack spacing={2} align="stretch">
                    <HStack justify="space-between">
                      <HStack>
                        <Box w={3} h={3} bg="red.400" rounded="full" />
                        <Text fontSize="sm">Early: {realtimeStats?.earlyTrips || 0}</Text>
                      </HStack>
                      <Text fontSize="xs" color="gray.500">
                        ({realtimeStats ? getStatusPercentage(realtimeStats.earlyTrips, realtimeStats.totalTrips).toFixed(1) : 0}%)
                      </Text>
                    </HStack>
                    
                    <HStack justify="space-between">
                      <HStack>
                        <Box w={3} h={3} bg="green.400" rounded="full" />
                        <Text fontSize="sm">On-Time: {realtimeStats?.onTimeTrips || 0}</Text>
                      </HStack>
                      <Text fontSize="xs" color="gray.500">
                        ({realtimeStats ? getStatusPercentage(realtimeStats.onTimeTrips, realtimeStats.totalTrips).toFixed(1) : 0}%)
                      </Text>
                    </HStack>
                    
                    <HStack justify="space-between">
                      <HStack>
                        <Box w={3} h={3} bg="yellow.400" rounded="full" />
                        <Text fontSize="sm">Late: {realtimeStats?.lateTrips || 0}</Text>
                      </HStack>
                      <Text fontSize="xs" color="gray.500">
                        ({realtimeStats ? getStatusPercentage(realtimeStats.lateTrips, realtimeStats.totalTrips).toFixed(1) : 0}%)
                      </Text>
                    </HStack>
                    
                    <HStack justify="space-between">
                      <HStack>
                        <Box w={3} h={3} bg="blue.400" rounded="full" />
                        <Text fontSize="sm">Layover/Deadhead: {realtimeStats?.layoverTrips || 0}</Text>
                      </HStack>
                      <Text fontSize="xs" color="gray.500">
                        ({realtimeStats ? getStatusPercentage(realtimeStats.layoverTrips, realtimeStats.totalTrips).toFixed(1) : 0}%)
                      </Text>
                    </HStack>
                    
                    <HStack justify="space-between">
                      <HStack>
                        <Box w={3} h={3} bg="gray.400" rounded="full" />
                        <Text fontSize="sm">Missing: {realtimeStats?.missingTrips || 0}</Text>
                      </HStack>
                      <Text fontSize="xs" color="gray.500">
                        ({realtimeStats ? getStatusPercentage(realtimeStats.missingTrips, realtimeStats.totalTrips).toFixed(1) : 0}%)
                      </Text>
                    </HStack>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>

            {/* Routes Card */}
            <Card bg={cardBg} mb={4}>
              <CardHeader pb={2}>
                <Text fontWeight="semibold" fontSize="sm">All Routes</Text>
              </CardHeader>
              <CardBody pt={0}>
                <VStack spacing={3} align="stretch">
                  {/* Route Dropdown - Shows ALL scheduled routes */}
                  <Select
                    size="sm"
                    value={selectedRoutes[0] || 'all'}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedRoutes(value === 'all' ? ['all'] : [value]);
                    }}
                  >
                    <option value="all">All Routes</option>
                    {allRoutes.map(route => (
                      <option key={route.route_id} value={route.route_id}>
                        Route {route.route_short_name || route.route_id} - {route.route_long_name || 'No name'}
                      </option>
                    ))}
                  </Select>

                  {/* Active Route Status List - Only routes with active vehicles */}
                  <VStack spacing={1} align="stretch" maxH="200px" overflowY="auto">
                    <Text fontSize="xs" fontWeight="semibold" color="gray.600" mb={1}>
                      Currently Active ({availableRoutes.length} routes)
                    </Text>
                    {availableRoutes.map(route => {
                      const routeStats = realtimeStats?.routes[route];
                      const hasIssues = routeStats && routeStats.issues > 0;
                      
                      return (
                        <HStack
                          key={route}
                          p={2}
                          bg={hasIssues ? 'red.50' : 'transparent'}
                          rounded="md"
                          fontSize="sm"
                          justify="space-between"
                        >
                          <HStack>
                            <Text fontWeight="medium">Route {route}</Text>
                            {hasIssues && <Icon as={FiAlertTriangle} color="red.500" boxSize={3} />}
                          </HStack>
                          <Text color="gray.500" fontSize="xs">
                            {routeStats?.totalVehicles || 0} vehicles
                          </Text>
                        </HStack>
                      );
                    })}
                    {availableRoutes.length === 0 && (
                      <Text fontSize="sm" color="gray.500" textAlign="center" py={2}>
                        No active routes
                      </Text>
                    )}
                  </VStack>
                </VStack>
              </CardBody>
            </Card>

            {/* Filters */}
            <Card bg={cardBg}>
              <CardHeader pb={2}>
                <Flex align="center" justify="space-between">
                  <Text fontWeight="semibold" fontSize="sm">Filters</Text>
                  <IconButton
                    aria-label="Toggle filters"
                    icon={showFilters ? <FiChevronLeft /> : <FiChevronRight />}
                    size="xs"
                    variant="ghost"
                    onClick={() => setShowFilters(!showFilters)}
                  />
                </Flex>
              </CardHeader>
              <Collapse in={showFilters}>
                <CardBody pt={0}>
                  <VStack spacing={4} align="stretch">
                    <FormControl>
                      <FormLabel fontSize="xs">Search</FormLabel>
                      <InputGroup size="sm">
                        <InputLeftElement pointerEvents="none">
                          <Icon as={FiSearch} color="gray.400" />
                        </InputLeftElement>
                        <Input
                          placeholder="Vehicle, block, stop, operator..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </InputGroup>
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="xs">Display</FormLabel>
                      <VStack spacing={2} align="stretch">
                        <HStack justify="space-between">
                          <Text fontSize="sm">Vehicle label</Text>
                          <Switch size="sm" />
                        </HStack>
                        <HStack justify="space-between">
                          <Text fontSize="sm">Stops</Text>
                          <Switch size="sm" isChecked={showStops} onChange={(e) => setShowStops(e.target.checked)} />
                        </HStack>
                        <HStack justify="space-between">
                          <Text fontSize="sm">Unassigned Vehicles</Text>
                          <Switch size="sm" isChecked={showUnassigned} onChange={(e) => setShowUnassigned(e.target.checked)} />
                        </HStack>
                      </VStack>
                    </FormControl>
                  </VStack>
                </CardBody>
              </Collapse>
            </Card>
          </Box>

          {/* Main Content - Only Enhanced Map (removed duplicate RealTimeMap) */}
          <Card bg={cardBg} overflow="hidden">
            <CardBody p={0} h="full">
              {viewMode === 'map' && (
                <EnhancedRealTimeMap vehicles={filteredVehicles} showStops={showStops} />
              )}
              {viewMode === 'list' && (
                <EnhancedActiveTripsTable vehicles={filteredVehicles} />
              )}
              {viewMode === 'ladder' && (
                <EnhancedRouteLadderView 
                  vehicles={filteredVehicles} 
                  selectedRoutes={selectedRoutes}
                />
              )}
            </CardBody>
          </Card>
        </Grid>
      )}
    </Box>
  );
};
