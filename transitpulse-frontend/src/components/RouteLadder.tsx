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
  Select,
  Icon,
  Divider,
  Switch,
  FormControl,
  FormLabel,
  Circle,
  Tooltip
} from '@chakra-ui/react';
import { 
  FiCheckCircle
} from 'react-icons/fi';

interface Vehicle {
  id: string;
  status: 'on-time' | 'early' | 'late' | 'layover' | 'approaching';
  crowding: 'low' | 'medium' | 'high';
  tripId: string;
  direction: 'inbound' | 'outbound';
}

interface StopTimepoint {
  stopId: string;
  stopName: string;
  scheduledTime: string;
  actualTime?: string;
  deviation?: string;
  vehicles: Vehicle[];
}

interface Route {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
}

interface RealTimeVehicle {
  vehicle_id: string;
  route_id: string;
  trip_id: string;
  status: number;
  occupancy_status?: number;
  headsign?: string;
  direction_name?: string;
}

interface RouteLadderProps {
  routeId?: string;
  direction?: 'inbound' | 'outbound';
}

const RouteLadder: React.FC<RouteLadderProps> = ({ routeId, direction = 'inbound' }) => {
  const [timepoints, setTimepoints] = useState<StopTimepoint[]>([]);
  const [selectedDirection, setSelectedDirection] = useState(direction);
  const [showTimepointsOnly, setShowTimepointsOnly] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState(routeId || '101'); // Force 101 as default
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<RealTimeVehicle[]>([]);
  const [hasUserSelectedRoute, setHasUserSelectedRoute] = useState(!!routeId); // Track if user has manually selected

  // Fetch routes from API
  const fetchRoutes = async () => {
    try {
      const response = await fetch(`/api/v1/routes`); // Use relative URL for proxy
      if (response.ok) {
        const data = await response.json();
        // API returns {routes: [...], status: "success", message: "..."}
        setRoutes(data.routes || []);
      } else {
        console.error('Routes fetch failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
      setRoutes([]);
    }
  };

  // Fetch vehicles from API
  const fetchVehicles = async () => {
    try {
      const response = await fetch(`/api/v1/vehicles/realtime`); // Use relative URL for proxy
      if (response.ok) {
        const data = await response.json();
        // API returns {status: "success", message: "...", data: [...vehicles...]}
        const vehicleData = data.data || [];
        setVehicles(vehicleData);
      } else {
        console.error('Vehicles fetch failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setVehicles([]);
    }
  };

  useEffect(() => {
    fetchRoutes();
    fetchVehicles();
    
    // Refresh vehicle data every 30 seconds
    const interval = setInterval(fetchVehicles, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-select first route with vehicles when data loads (only if user hasn't manually selected)
  useEffect(() => {
    if (routes.length > 0 && vehicles.length > 0 && !hasUserSelectedRoute) {
      // Find the first route that has active vehicles
      const routeWithVehicles = routes.find(route => 
        vehicles.some(vehicle => vehicle.route_id === route.route_id)
      );
      
      if (routeWithVehicles && routeWithVehicles.route_id !== selectedRoute) {
        setSelectedRoute(routeWithVehicles.route_id);
      }
    }
  }, [routes, vehicles, hasUserSelectedRoute, selectedRoute]);

  useEffect(() => {
    // Create timepoints from real vehicle data
    if (vehicles.length > 0) {
      // Filter vehicles for the selected route only
      const routeVehicles = vehicles.filter(v => v.route_id === selectedRoute);
      
      const newTimepoints: StopTimepoint[] = [];
      
      if (routeVehicles.length > 0) {
        // Create timepoints for each vehicle on this route
        routeVehicles.slice(0, 10).forEach((vehicle, index) => {
          const timeSlot = new Date();
          timeSlot.setMinutes(timeSlot.getMinutes() + (index * 8)); // 8 minute intervals
          
          const scheduledTime = timeSlot.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          });
          
          const status = getVehicleStatus(vehicle.status);
          const crowding = getVehicleCrowding(vehicle.occupancy_status);
          
          newTimepoints.push({
            stopId: `stop_${vehicle.vehicle_id}`,
            stopName: vehicle.headsign || `${vehicle.direction_name || 'Route'} ${selectedRoute}`,
            scheduledTime,
            vehicles: [{
              id: vehicle.vehicle_id,
              status,
              crowding,
              tripId: vehicle.trip_id,
              direction: vehicle.direction_name?.toLowerCase() as 'inbound' | 'outbound' || 'inbound'
            }]
          });
        });
      } else {
        // If no vehicles for this route, show a placeholder
        newTimepoints.push({
          stopId: 'no_vehicles',
          stopName: `No active vehicles on Route ${selectedRoute}`,
          scheduledTime: '--:--',
          vehicles: []
        });
      }
      
      setTimepoints(newTimepoints);
    } else {
      // No vehicles data yet
      setTimepoints([{
        stopId: 'loading',
        stopName: 'Loading vehicle data...',
        scheduledTime: '--:--',
        vehicles: []
      }]);
    }
  }, [vehicles, selectedRoute]); // Add selectedRoute as dependency

  const getVehicleStatus = (status: number): 'on-time' | 'early' | 'late' | 'layover' | 'approaching' => {
    switch (status) {
      case 0: return 'approaching';
      case 1: return 'layover';
      case 2: return 'on-time';
      default: return 'on-time';
    }
  };

  const getVehicleCrowding = (occupancy?: number): 'low' | 'medium' | 'high' => {
    if (!occupancy) return 'low';
    switch (occupancy) {
      case 0:
      case 1: return 'low';
      case 2:
      case 3: return 'medium'; 
      case 4:
      case 5:
      case 6: return 'high';
      default: return 'low';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-time': return 'green';
      case 'early': return 'red';
      case 'late': return 'yellow';
      case 'layover': return 'gray';
      case 'approaching': return 'blue';
      default: return 'gray';
    }
  };

  const getCrowdingColor = (crowding: string) => {
    switch (crowding) {
      case 'low': return 'green.500';
      case 'medium': return 'yellow.500';
      case 'high': return 'red.500';
      default: return 'gray.500';
    }
  };

  return (
    <VStack spacing={4} align="stretch">
      {/* Debug Info */}
      <Card bg="gray.50" size="sm">
        <CardBody>
          <HStack spacing={6} fontSize="xs" color="gray.600">
            <Text>Routes: {routes.length}</Text>
            <Text>Vehicles: {vehicles.length}</Text>
            <Text>Selected: {selectedRoute}</Text>
            <Text>Vehicles on Route: {vehicles.filter(v => v.route_id === selectedRoute).length}</Text>
            <Text>Timepoints: {timepoints.length}</Text>
          </HStack>
        </CardBody>
      </Card>

      {/* Route Selection and Filters */}
      <Card>
        <CardHeader pb={2}>
          <Text fontWeight="semibold">Route Ladder</Text>
        </CardHeader>
        <CardBody pt={0}>
          <VStack spacing={3}>
            <HStack spacing={4} w="full">
              <Box flex={1}>
                <Text fontSize="sm" mb={1} fontWeight="medium">Route</Text>
                <Select value={selectedRoute} onChange={(e) => {
                  setSelectedRoute(e.target.value);
                  setHasUserSelectedRoute(true); // Mark that user has manually selected
                }}>
                  {routes.length > 0 ? (
                    routes.map(route => (
                      <option key={route.route_id} value={route.route_id}>
                        {route.route_short_name} - {route.route_long_name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="101">101 - Santa Rosa - San Francisco</option>
                      <option value="130">130 - San Rafael - San Francisco</option>
                      <option value="150">150 - Novato - San Francisco</option>
                      <option value="580">580 - San Rafael - San Francisco</option>
                    </>
                  )}
                </Select>
              </Box>
              <Box flex={1}>
                <Text fontSize="sm" mb={1} fontWeight="medium">Direction</Text>
                <Select value={selectedDirection} onChange={(e) => setSelectedDirection(e.target.value as 'inbound' | 'outbound')}>
                  <option value="outbound">Outbound</option>
                  <option value="inbound">Inbound</option>
                </Select>
              </Box>
            </HStack>
            
            <FormControl display="flex" alignItems="center" justifyContent="space-between">
              <FormLabel htmlFor="routeLadder-timepoints-only" mb="0" fontSize="sm">
                Timepoints only
              </FormLabel>
              <Switch 
                id="routeLadder-timepoints-only"
                name="routeLadder-timepoints-only"
                isChecked={showTimepointsOnly}
                onChange={(e) => setShowTimepointsOnly(e.target.checked)}
              />
            </FormControl>
          </VStack>
        </CardBody>
      </Card>

      {/* Route Ladder Visualization */}
      <Card>
        <CardHeader>
          <HStack justify="space-between">
            <Text fontWeight="semibold">Route {selectedRoute}</Text>
            <Badge colorScheme="blue" variant="subtle">
              {selectedDirection.charAt(0).toUpperCase() + selectedDirection.slice(1)} Direction
            </Badge>
          </HStack>
        </CardHeader>
        <CardBody pt={0}>
          <VStack spacing={0} align="stretch">
            {timepoints.length === 0 ? (
              <Text color="gray.500" textAlign="center" py={8}>
                Loading vehicle data...
              </Text>
            ) : (
              timepoints.map((timepoint, index) => (
                <Box key={timepoint.stopId}>
                  <HStack spacing={4} py={3}>
                    {/* Timeline Visualization */}
                    <VStack spacing={0} w="60px" align="center">
                      {timepoint.vehicles.map((vehicle, vIndex) => (
                        <Tooltip 
                          key={vehicle.id}
                          label={`Vehicle ${vehicle.id} - ${vehicle.status} - Load: ${vehicle.crowding}`}
                        >
                          <Circle 
                            size="20px" 
                            bg={getStatusColor(vehicle.status) + '.400'}
                            color="white"
                            fontSize="xs"
                            fontWeight="bold"
                            cursor="pointer"
                            mb={vIndex < timepoint.vehicles.length - 1 ? 1 : 0}
                          >
                            {vehicle.id.slice(-2)}
                          </Circle>
                        </Tooltip>
                      ))}
                      <Text fontSize="xs" mt={1} color="gray.500">
                        {timepoint.stopId}
                      </Text>
                    </VStack>

                    {/* Route Line */}
                    <Box position="relative" w="4px" minH="60px">
                      <Box 
                        position="absolute"
                        top="0"
                        left="50%"
                        transform="translateX(-50%)"
                        w="2px"
                        h="full"
                        bg="blue.200"
                      />
                      {index < timepoints.length - 1 && (
                        <Box 
                          position="absolute"
                          bottom="-20px"
                          left="50%"
                          transform="translateX(-50%)"
                          w="2px"
                          h="20px"
                          bg="blue.200"
                        />
                      )}
                    </Box>

                    {/* Stop Information */}
                    <VStack flex={1} align="start" spacing={1}>
                      <HStack justify="space-between" w="full">
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="medium" fontSize="sm">
                            {timepoint.stopName}
                          </Text>
                          <HStack spacing={2}>
                            <Text fontSize="xs" color="gray.500">
                              Scheduled: {timepoint.scheduledTime}
                            </Text>
                          </HStack>
                        </VStack>

                        {/* Vehicle Details */}
                        <VStack align="end" spacing={1}>
                          {timepoint.vehicles.map((vehicle) => (
                            <HStack key={vehicle.id} spacing={2}>
                              <Tooltip label={`Trip ${vehicle.tripId}`}>
                                <Text fontSize="xs" fontFamily="mono" color="gray.600">
                                  {vehicle.tripId}
                                </Text>
                              </Tooltip>
                              <Badge 
                                size="sm"
                                colorScheme={getStatusColor(vehicle.status)}
                                variant="subtle"
                              >
                                {vehicle.status}
                              </Badge>
                            </HStack>
                          ))}
                        </VStack>
                      </HStack>
                    </VStack>
                  </HStack>
                  
                  {index < timepoints.length - 1 && <Divider />}
                </Box>
              ))
            )}
          </VStack>
        </CardBody>
      </Card>

      {/* Status Footer */}
      <Card>
        <CardBody>
          <HStack spacing={2}>
            <Icon as={FiCheckCircle} color="green.500" />
            <Text fontSize="sm" color="gray.700">
              Last updated: just now • Auto-refreshing every 30 seconds
            </Text>
          </HStack>
        </CardBody>
      </Card>
    </VStack>
  );
};

export default RouteLadder;
