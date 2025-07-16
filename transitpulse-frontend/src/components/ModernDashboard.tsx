import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Grid,
  Heading,
  Text,
  Badge,
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
  StatHelpText,
  Progress,
  Icon,
  VStack,
  HStack,
  Spacer,
  Divider,
  useColorModeValue,
  Collapse,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiMap,
  FiList,
  FiBarChart3,
  FiFilter,
  FiSearch,
  FiRefreshCw,
  FiSettings,
  FiChevronLeft,
  FiChevronRight,
  FiNavigation,
  FiClock,
  FiUsers,
  FiAlertTriangle,
} from 'react-icons/fi';
import { RealTimeMap } from './RealTimeMap';
import { EnhancedActiveTripsTable } from './EnhancedActiveTripsTable';
import { EnhancedRouteLadderView } from './EnhancedRouteLadderView';
import { EnhancedRealTimeMap } from './EnhancedRealTimeMap';

interface VehicleData {
  id: string;
  route: string;
  status: 'early' | 'on-time' | 'late' | 'missing' | 'layover';
  scheduleAdherence: number;
  headwayDeviation: number;
  crowding?: 'low' | 'medium' | 'high';
  operator?: string;
  tripId: string;
  blockId: string;
  startTime: string;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [showStops, setShowStops] = useState(true);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [vehicleData, setVehicleData] = useState<VehicleData[]>([]);
  const [realtimeStats, setRealtimeStats] = useState<RealtimeStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Fetch real-time data
  const fetchRealtimeData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/vehicles/real-time');
      const data = await response.json();
      
      if (data.success) {
        setVehicleData(data.vehicles || []);
        
        // Calculate stats
        const stats: RealtimeStats = {
          totalTrips: data.vehicles?.length || 0,
          earlyTrips: data.vehicles?.filter((v: VehicleData) => v.status === 'early').length || 0,
          onTimeTrips: data.vehicles?.filter((v: VehicleData) => v.status === 'on-time').length || 0,
          lateTrips: data.vehicles?.filter((v: VehicleData) => v.status === 'late').length || 0,
          missingTrips: data.vehicles?.filter((v: VehicleData) => v.status === 'missing').length || 0,
          layoverTrips: data.vehicles?.filter((v: VehicleData) => v.status === 'layover').length || 0,
          routes: {},
        };
        
        // Calculate route-specific stats
        data.vehicles?.forEach((vehicle: VehicleData) => {
          if (!stats.routes[vehicle.route]) {
            stats.routes[vehicle.route] = { issues: 0, totalVehicles: 0 };
          }
          stats.routes[vehicle.route].totalVehicles++;
          if (vehicle.status === 'late' || vehicle.status === 'early' || vehicle.status === 'missing') {
            stats.routes[vehicle.route].issues++;
          }
        });
        
        setRealtimeStats(stats);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch realtime data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealtimeData();
    const interval = setInterval(fetchRealtimeData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'early': return 'red';
      case 'on-time': return 'green';
      case 'late': return 'yellow';
      case 'missing': return 'gray';
      case 'layover': return 'blue';
      default: return 'gray';
    }
  };

  const getStatusPercentage = (count: number, total: number) => {
    return total > 0 ? (count / total) * 100 : 0;
  };

  const filteredVehicles = vehicleData.filter(vehicle => {
    const matchesRoute = selectedRoutes.includes('all') || selectedRoutes.includes(vehicle.route);
    const matchesSearch = !searchQuery || 
      vehicle.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.route.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.operator?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesRoute && matchesSearch;
  });

  const availableRoutes = [...new Set(vehicleData.map(v => v.route))].sort();

  return (
    <Box bg={bgColor} minH="100vh" p={4}>
      {/* Header */}
      <Flex mb={6} align="center" justify="space-between">
        <Box>
          <Heading size="lg" color="blue.600">Live Operations</Heading>
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
              leftIcon={<FiBarChart3 />}
              isActive={viewMode === 'ladder'}
              onClick={() => setViewMode('ladder')}
            >
              Ladder
            </Button>
          </ButtonGroup>
        </HStack>
      </Flex>

      <Grid templateColumns="300px 1fr" gap={6} h="calc(100vh - 120px)">
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
                </VStack>

                <Divider />

                <VStack spacing={2} align="stretch">
                  <HStack justify="space-between">
                    <Text fontSize="xs" color="gray.500">Missing: {realtimeStats?.missingTrips || 0}</Text>
                    <Text fontSize="xs" color="gray.500">Off-Route: 0</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="xs" color="gray.500">Performance Unavailable: 0</Text>
                  </HStack>
                </VStack>
              </VStack>
            </CardBody>
          </Card>

          {/* Routes Card */}
          <Card bg={cardBg} mb={4}>
            <CardHeader pb={2}>
              <Flex align="center" justify="space-between">
                <Text fontWeight="semibold" fontSize="sm">Routes</Text>
                {Object.keys(realtimeStats?.routes || {}).filter(route => 
                  realtimeStats?.routes[route]?.issues > 0
                ).length > 0 && (
                  <Badge colorScheme="red" fontSize="xs">
                    {Object.keys(realtimeStats?.routes || {}).filter(route => 
                      realtimeStats?.routes[route]?.issues > 0
                    ).length} issues
                  </Badge>
                )}
              </Flex>
            </CardHeader>
            <CardBody pt={0}>
              <VStack spacing={2} align="stretch">
                <Select
                  size="sm"
                  value={selectedRoutes.includes('all') ? 'all' : selectedRoutes[0]}
                  onChange={(e) => {
                    if (e.target.value === 'all') {
                      setSelectedRoutes(['all']);
                    } else {
                      setSelectedRoutes([e.target.value]);
                    }
                  }}
                >
                  <option value="all">All Routes</option>
                  {availableRoutes.map(route => (
                    <option key={route} value={route}>Route {route}</option>
                  ))}
                </Select>

                {/* Route Status List */}
                <VStack spacing={1} align="stretch" maxH="200px" overflowY="auto">
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
                    <Input
                      size="sm"
                      placeholder="Vehicle, block, stop, operator..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      leftElement={<Icon as={FiSearch} color="gray.400" />}
                    />
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

        {/* Main Content */}
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
    </Box>
  );
};
