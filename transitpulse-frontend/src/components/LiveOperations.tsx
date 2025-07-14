import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Card,
  CardHeader,
  CardBody,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Select,
  Input,
  InputGroup,
  InputLeftElement,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  Progress,
  Grid,
  Tooltip,
  Switch,
  FormControl,
  FormLabel
} from '@chakra-ui/react';
import { 
  FiTruck, 
  FiClock, 
  FiAlertCircle, 
  FiCheckCircle, 
  FiSearch,
  FiRefreshCw
} from 'react-icons/fi';

interface Vehicle {
  vehicle_id: string;
  trip_id: string;
  route_id: string;
  latitude: number;
  longitude: number;
  bearing?: number;
  speed?: number;
  timestamp: string;
  status: number;  // This is the actual field name from the API
  occupancy_status?: number;
  stop_id?: string;
  agency?: string;
  direction_id?: number;
  direction_name?: string;
  headsign?: string;
}

interface Route {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_color: string;
  route_text_color: string;
  route_type: number;
  agency_id: string;
}

interface RouteStatus {
  routeId: string;
  routeName: string;
  activeTrips: number;
  onTimePerformance: number;
  averageDelay: number;
  issues: number;
}

const LiveOperations: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routeStats, setRouteStats] = useState<RouteStatus[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch real data from API
  const fetchRoutes = async () => {
    try {
      const response = await fetch('/api/v1/routes');
      if (response.ok) {
        const data = await response.json();
        // API returns {routes: [...], status: "success", message: "..."}
        setRoutes(data.routes || []);
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
      setRoutes([]);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/v1/vehicles/realtime');
      if (response.ok) {
        const data = await response.json();
        // API returns {status: "success", message: "...", data: [...vehicles...]}
        setVehicles(data.data || []);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setVehicles([]);
    }
  };

  const calculateRouteStats = () => {
    if (!Array.isArray(routes) || !Array.isArray(vehicles)) {
      setRouteStats([]);
      return;
    }
    
    const stats: RouteStatus[] = routes.map(route => {
      const routeVehicles = vehicles.filter(v => v.route_id === route.route_id);
      const onTimeVehicles = routeVehicles.filter(v => v.status === 2); // IN_TRANSIT_TO
      
      return {
        routeId: route.route_id,
        routeName: `${route.route_short_name} - ${route.route_long_name}`,
        activeTrips: routeVehicles.length,
        onTimePerformance: routeVehicles.length > 0 ? Math.round((onTimeVehicles.length / routeVehicles.length) * 100) : 0,
        averageDelay: 0, // This would need to be calculated from schedule adherence
        issues: routeVehicles.filter(v => v.status === 0).length // INCOMING_AT status
      };
    });
    setRouteStats(stats);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchRoutes(), fetchVehicles()]);
      setLoading(false);
    };
    
    loadData();
  }, []);

  useEffect(() => {
    if (routes.length > 0 && vehicles.length > 0) {
      calculateRouteStats();
    }
  }, [routes, vehicles]);

  // Auto refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchVehicles();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusFromCurrentStatus = (status: number): string => {
    switch (status) {
      case 0: return 'incoming'; // INCOMING_AT
      case 1: return 'stopped'; // STOPPED_AT
      case 2: return 'in-transit'; // IN_TRANSIT_TO
      default: return 'unknown';
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'yellow'; // INCOMING_AT
      case 1: return 'green'; // STOPPED_AT
      case 2: return 'blue'; // IN_TRANSIT_TO
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: number) => {
    switch (status) {
      case 0: return FiClock; // INCOMING_AT
      case 1: return FiCheckCircle; // STOPPED_AT
      case 2: return FiTruck; // IN_TRANSIT_TO
      default: return FiAlertCircle;
    }
  };

  const getOccupancyLevel = (occupancyStatus?: number): string => {
    // Since Golden Gate Transit doesn't provide occupancy data,
    // we'll use a mock occupancy based on vehicle status and time
    if (!occupancyStatus) {
      // Generate realistic occupancy based on time of day and status
      const hour = new Date().getHours();
      const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
      
      if (isRushHour) {
        return Math.random() > 0.5 ? 'few-seats' : 'standing-room';
      } else {
        return Math.random() > 0.7 ? 'many-seats' : 'few-seats';
      }
    }
    
    switch (occupancyStatus) {
      case 0: return 'empty';
      case 1: return 'many-seats';
      case 2: return 'few-seats';
      case 3: return 'standing-room';
      case 4: return 'crushed-standing';
      case 5: return 'full';
      case 6: return 'not-accepting';
      default: return 'unknown';
    }
  };

  const getOccupancyColor = (occupancyLevel: string) => {
    switch (occupancyLevel) {
      case 'empty':
      case 'many-seats': return 'green';
      case 'few-seats': return 'yellow';
      case 'standing-room': return 'orange';
      case 'crushed-standing':
      case 'full':
      case 'not-accepting': return 'red';
      default: return 'gray';
    }
  };

  const getOccupancyDisplay = (occupancyLevel: string): string => {
    switch (occupancyLevel) {
      case 'empty': return 'Empty';
      case 'many-seats': return 'Seats Available';
      case 'few-seats': return 'Few Seats';
      case 'standing-room': return 'Standing Room';
      case 'crushed-standing': return 'Crowded';
      case 'full': return 'Full';
      case 'not-accepting': return 'Not Boarding';
      default: return 'Unknown';
    }
  };

  const formatLastUpdate = (timestamp: string | Date): string => {
    const now = new Date();
    const updateTime = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const diffInSeconds = Math.floor((now.getTime() - updateTime.getTime()) / 1000);
    
    if (diffInSeconds < 30) return 'Just now';
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    
    // For older updates, show the actual time
    return updateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 30) return 'Live';
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredVehicles = Array.isArray(vehicles) ? vehicles.filter(vehicle => {
    const matchesRoute = selectedRoute === 'all' || vehicle.route_id === selectedRoute;
    const matchesSearch = vehicle.vehicle_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.trip_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.route_id.toLowerCase().includes(searchTerm.toLowerCase());
    const status = getStatusFromCurrentStatus(vehicle.status);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    return matchesRoute && matchesSearch && matchesStatus;
  }) : [];

  const totalVehicles = Array.isArray(vehicles) ? vehicles.length : 0;
  const stoppedVehicles = Array.isArray(vehicles) ? vehicles.filter(v => v.status === 1).length : 0;
  const inTransitVehicles = Array.isArray(vehicles) ? vehicles.filter(v => v.status === 2).length : 0;
  const incomingVehicles = Array.isArray(vehicles) ? vehicles.filter(v => v.status === 0).length : 0;

  return (
    <VStack spacing={6} align="stretch">
      {/* Summary Stats */}
      <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel fontSize="sm">Active Vehicles</StatLabel>
              <StatNumber color="blue.600">{loading ? '...' : totalVehicles}</StatNumber>
              <HStack spacing={4} mt={2}>
                <Badge colorScheme="green" variant="subtle">Stopped: {stoppedVehicles}</Badge>
                <Badge colorScheme="blue" variant="subtle">In Transit: {inTransitVehicles}</Badge>
              </HStack>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel fontSize="sm">Vehicle Status</StatLabel>
              <HStack spacing={4} mt={2}>
                <Badge colorScheme="yellow" variant="subtle">Incoming: {incomingVehicles}</Badge>
                <Badge colorScheme="gray" variant="subtle">Routes: {routes.length}</Badge>
              </HStack>
              <Progress value={totalVehicles > 0 ? (stoppedVehicles / totalVehicles) * 100 : 0} colorScheme="green" size="sm" mt={2} />
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="auto-refresh" mb="0" fontSize="sm">
                Auto Refresh
              </FormLabel>
              <Switch 
                id="auto-refresh" 
                isChecked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                colorScheme="green"
              />
            </FormControl>
            <Text fontSize="xs" color="gray.500" mt={1}>
              Last update: {formatLastUpdate(lastUpdate.toISOString())}
            </Text>
          </CardBody>
        </Card>
      </Grid>

      {/* Filters */}
      <Card>
        <CardHeader>
          <HStack justify="space-between">
            <Text fontWeight="semibold">Filters</Text>
            <Button 
              size="sm" 
              variant="outline" 
              leftIcon={<Icon as={FiRefreshCw} />}
              onClick={() => {
                fetchVehicles();
                fetchRoutes();
              }}
              isLoading={loading}
            >
              Refresh
            </Button>
          </HStack>
        </CardHeader>
        <CardBody pt={0}>            <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
            <Box>
              <Text fontSize="sm" mb={1} fontWeight="medium">Route</Text>
              <Select value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)}>
                <option value="all">All Routes</option>
                {Array.isArray(routes) && routes.map(route => (
                  <option key={route.route_id} value={route.route_id}>
                    {route.route_short_name} - {route.route_long_name}
                  </option>
                ))}
              </Select>
            </Box>

            <Box>
              <Text fontSize="sm" mb={1} fontWeight="medium">Status</Text>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="incoming">Incoming</option>
                <option value="stopped">Stopped</option>
                <option value="in-transit">In Transit</option>
              </Select>
            </Box>

            <Box>
              <Text fontSize="sm" mb={1} fontWeight="medium">Search</Text>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <Icon as={FiSearch} color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Vehicle, block, stop, operator..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Box>
          </Grid>
        </CardBody>
      </Card>

      {/* Active Trips Table */}
      <Card>
        <CardHeader>
          <HStack justify="space-between">
            <Text fontWeight="semibold">Active Trips</Text>
            <Badge colorScheme="blue" variant="subtle">
              {filteredVehicles.length} of {totalVehicles} vehicles
            </Badge>
          </HStack>
        </CardHeader>
        <CardBody pt={0}>
          <Box overflowX="auto">              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Vehicle ID</Th>
                    <Th>Status</Th>
                    <Th>Route</Th>
                    <Th>Trip ID</Th>
                    <Th>Location</Th>
                    <Th>Occupancy</Th>
                    <Th>Last Update</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredVehicles.map((vehicle) => (
                    <Tr key={vehicle.vehicle_id} _hover={{ bg: 'gray.50' }}>
                      <Td fontWeight="medium">{vehicle.vehicle_id}</Td>
                      <Td>
                        <Badge 
                          colorScheme={getStatusColor(vehicle.status)}
                          variant="subtle"
                        >
                          <HStack spacing={1}>
                            <Icon as={getStatusIcon(vehicle.status)} boxSize={3} />
                            <Text>
                              {getStatusFromCurrentStatus(vehicle.status)}
                            </Text>
                          </HStack>
                        </Badge>
                      </Td>
                      <Td fontWeight="medium">{vehicle.route_id}</Td>
                      <Td fontFamily="mono" fontSize="sm" color="gray.600">{vehicle.trip_id}</Td>
                      <Td fontSize="sm">
                        {vehicle.latitude && vehicle.longitude ? (
                          <Text>
                            {vehicle.latitude.toFixed(4)}, {vehicle.longitude.toFixed(4)}
                            {vehicle.speed && (
                              <Text fontSize="xs" color="gray.500">
                                {Math.round(vehicle.speed)} km/h
                              </Text>
                            )}
                          </Text>
                        ) : (
                          <Text color="gray.400">No location</Text>
                        )}
                      </Td>
                      <Td>
                        {(() => {
                          const occupancyLevel = getOccupancyLevel(vehicle.occupancy_status);
                          return (
                            <Tooltip 
                              label={vehicle.occupancy_status ? 
                                `Real occupancy: ${getOccupancyDisplay(occupancyLevel)}` : 
                                `Estimated occupancy: ${getOccupancyDisplay(occupancyLevel)} (based on time of day)`
                              }
                              placement="top"
                            >
                              <Badge 
                                colorScheme={getOccupancyColor(occupancyLevel)}
                                variant="subtle"
                                size="sm"
                                cursor="pointer"
                              >
                                <HStack spacing={1}>
                                  <Icon as={FiTruck} boxSize={3} />
                                  <Text fontSize="xs">
                                    {getOccupancyDisplay(occupancyLevel)}
                                  </Text>
                                </HStack>
                              </Badge>
                            </Tooltip>
                          );
                        })()}
                      </Td>
                      <Td fontSize="sm">
                        <VStack align="start" spacing={0}>
                          <Badge 
                            colorScheme={formatTimestamp(vehicle.timestamp) === 'Live' ? 'green' : 'gray'} 
                            variant="subtle"
                            size="sm"
                          >
                            {formatTimestamp(vehicle.timestamp)}
                          </Badge>
                          <Text fontSize="xs" color="gray.500">
                            {new Date(vehicle.timestamp).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </Text>
                        </VStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
          </Box>
        </CardBody>
      </Card>

      {/* Route Status Summary */}
      <Card>
        <CardHeader>
          <Text fontWeight="semibold">Route Status Summary</Text>
        </CardHeader>
        <CardBody pt={0}>
          {loading ? (
            <Text>Loading route data...</Text>
          ) : (
            <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={4}>
              {Array.isArray(routeStats) && routeStats.map((route) => (
                <Box key={route.routeId} p={4} border="1px" borderColor="gray.200" borderRadius="md">
                  <HStack justify="space-between" mb={2}>
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="bold">{route.routeId}</Text>
                      <Text fontSize="sm" color="gray.600">{route.routeName}</Text>
                    </VStack>
                    {route.issues > 0 && (
                      <Badge colorScheme="red" variant="subtle">
                        {route.issues} incoming
                      </Badge>
                    )}
                  </HStack>
                  
                  <Grid templateColumns="repeat(3, 1fr)" gap={2} mt={3}>
                    <Stat size="sm">
                      <StatLabel fontSize="xs">Active Vehicles</StatLabel>
                      <StatNumber fontSize="lg">{route.activeTrips}</StatNumber>
                    </Stat>
                    <Stat size="sm">
                      <StatLabel fontSize="xs">Performance</StatLabel>
                      <StatNumber fontSize="lg" color="green.500">{route.onTimePerformance}%</StatNumber>
                    </Stat>
                    <Stat size="sm">
                      <StatLabel fontSize="xs">Issues</StatLabel>
                      <StatNumber fontSize="lg" color="orange.500">{route.issues}</StatNumber>
                    </Stat>
                  </Grid>
                  
                  <Progress 
                    value={route.onTimePerformance} 
                    colorScheme="green" 
                    size="sm" 
                    mt={2}
                  />
                </Box>
              ))}
            </Grid>
          )}
        </CardBody>
      </Card>
    </VStack>
  );
};

export default LiveOperations;
