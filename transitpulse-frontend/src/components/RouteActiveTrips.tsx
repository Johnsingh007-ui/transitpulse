import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Card,
  CardBody,
  Collapse,
  Button,
  Icon,
  Divider,
  Grid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useColorModeValue,
  Spinner,
  Alert,
  AlertIcon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer
} from '@chakra-ui/react';
import { 
  FiChevronDown, 
  FiChevronUp, 
  FiClock, 
  FiMapPin, 
  FiNavigation,
  FiTrendingUp,
  FiTrendingDown,
  FiActivity
} from 'react-icons/fi';
import { MdDirectionsBus } from 'react-icons/md';

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
}

interface TripData {
  trip_id: string;
  vehicle_id: string;
  route_id: string;
  headsign: string;
  direction_name: string;
  scheduled_stops: StopUpdate[];
  current_stop?: string;
  next_stop?: string;
  delay_minutes: number;
  vehicle_data: VehicleData;
}

interface StopUpdate {
  stop_id: string;
  stop_name: string;
  sequence: number;
  scheduled_arrival?: string;
  scheduled_departure?: string;
  estimated_arrival?: string;
  estimated_departure?: string;
  actual_arrival?: string;
  actual_departure?: string;
  delay_minutes: number;
  passed: boolean;
}

interface RouteActiveTripsProps {
  routeId: string;
  routeName?: string;
}

export const RouteActiveTrips: React.FC<RouteActiveTripsProps> = ({ 
  routeId, 
  routeName 
}) => {
  const [trips, setTrips] = useState<TripData[]>([]);
  const [expandedTrips, setExpandedTrips] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const fetchRouteTrips = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch vehicles for this route
      const vehiclesResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:9002/api/v1'}/vehicles/realtime`);
      const vehiclesData = await vehiclesResponse.json();

      if (vehiclesData.status !== 'success') {
        throw new Error('Failed to fetch vehicle data');
      }

      // Filter vehicles for this route
      const routeVehicles = (vehiclesData.data || []).filter(
        (vehicle: VehicleData) => vehicle.route_id === routeId
      );

      // Fetch trip details for each vehicle
      const tripPromises = routeVehicles.map(async (vehicle: VehicleData) => {
        try {
          // Fetch trip details
          const tripResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:9002/api/v1'}/trips/${vehicle.trip_id}`);
          const tripData = await tripResponse.json();

          // Fetch stop times for the trip
          const stopTimesResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:9002/api/v1'}/trips/${vehicle.trip_id}/stop_times`);
          const stopTimesData = await stopTimesResponse.json();

          // Create mock stop updates (in a real system, this would come from real-time updates)
          const scheduledStops: StopUpdate[] = (stopTimesData.stop_times || []).map((stop: any, index: number) => ({
            stop_id: stop.stop_id,
            stop_name: stop.stop_name || `Stop ${stop.stop_id}`,
            sequence: stop.stop_sequence,
            scheduled_arrival: stop.arrival_time,
            scheduled_departure: stop.departure_time,
            estimated_arrival: stop.arrival_time, // Mock - would be real-time estimate
            estimated_departure: stop.departure_time,
            delay_minutes: Math.floor(Math.random() * 10) - 2, // Mock delay: -2 to +7 minutes
            passed: index < Math.floor(Math.random() * stopTimesData.stop_times?.length || 0)
          }));

          const trip: TripData = {
            trip_id: vehicle.trip_id,
            vehicle_id: vehicle.vehicle_id,
            route_id: vehicle.route_id,
            headsign: vehicle.headsign || tripData.trip_headsign || 'Unknown Destination',
            direction_name: vehicle.direction_name || (vehicle.direction_id === 0 ? 'Outbound' : 'Inbound'),
            scheduled_stops: scheduledStops,
            delay_minutes: Math.floor(Math.random() * 10) - 2, // Mock overall delay
            vehicle_data: vehicle
          };

          return trip;
        } catch (error) {
          console.error(`Failed to fetch trip details for ${vehicle.trip_id}:`, error);
          // Return basic trip data even if details fail
          return {
            trip_id: vehicle.trip_id,
            vehicle_id: vehicle.vehicle_id,
            route_id: vehicle.route_id,
            headsign: vehicle.headsign || 'Unknown Destination',
            direction_name: vehicle.direction_name || 'Unknown Direction',
            scheduled_stops: [],
            delay_minutes: 0,
            vehicle_data: vehicle
          };
        }
      });

      const tripsData = await Promise.all(tripPromises);
      setTrips(tripsData);

    } catch (error) {
      console.error('Failed to fetch route trips:', error);
      setError('Failed to load trip data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeId) {
      fetchRouteTrips();
      const interval = setInterval(fetchRouteTrips, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [routeId]);

  const toggleTripExpansion = (tripId: string) => {
    const newExpanded = new Set(expandedTrips);
    if (newExpanded.has(tripId)) {
      newExpanded.delete(tripId);
    } else {
      newExpanded.add(tripId);
    }
    setExpandedTrips(newExpanded);
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '--';
    // Convert HH:MM:SS to HH:MM format
    return timeStr.substring(0, 5);
  };

  const getDelayColor = (delayMinutes: number) => {
    if (delayMinutes <= -1) return 'green'; // Early
    if (delayMinutes <= 2) return 'blue';   // On time
    if (delayMinutes <= 5) return 'yellow'; // Slightly late
    return 'red'; // Late
  };

  const getDelayText = (delayMinutes: number) => {
    if (delayMinutes <= -1) return `${Math.abs(delayMinutes)}m early`;
    if (delayMinutes === 0) return 'On time';
    return `${delayMinutes}m late`;
  };

  if (loading) {
    return (
      <Card bg={cardBg} border="1px" borderColor={borderColor}>
        <CardBody>
          <HStack spacing={3}>
            <Spinner size="sm" />
            <Text>Loading active trips for Route {routeName || routeId}...</Text>
          </HStack>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        {error}
      </Alert>
    );
  }

  if (trips.length === 0) {
    return (
      <Card bg={cardBg} border="1px" borderColor={borderColor}>
        <CardBody>
          <Text color="gray.500" textAlign="center">
            No active trips found for Route {routeName || routeId}
          </Text>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card bg={cardBg} border="1px" borderColor={borderColor}>
      <CardBody>
        <VStack spacing={4} align="stretch">
          {/* Header */}
          <HStack justify="space-between" align="center">
            <Text fontSize="lg" fontWeight="bold" color="blue.600">
              Active Trips - Route {routeName || routeId}
            </Text>
            <Badge colorScheme="blue" fontSize="sm">
              {trips.length} Active
            </Badge>
          </HStack>

          {/* Trip Summary Stats */}
          <Grid templateColumns="repeat(4, 1fr)" gap={4}>
            <Stat>
              <StatLabel fontSize="xs">Active Buses</StatLabel>
              <StatNumber fontSize="lg">{trips.length}</StatNumber>
              <StatHelpText fontSize="xs">
                        <Icon as={MdDirectionsBus} mr={1} />
                In service
              </StatHelpText>
            </Stat>
            
            <Stat>
              <StatLabel fontSize="xs">On Time</StatLabel>
              <StatNumber fontSize="lg" color="green.500">
                {trips.filter(t => Math.abs(t.delay_minutes) <= 2).length}
              </StatNumber>
              <StatHelpText fontSize="xs">
                <Icon as={FiClock} mr={1} />
                ±2 minutes
              </StatHelpText>
            </Stat>
            
            <Stat>
              <StatLabel fontSize="xs">Running Late</StatLabel>
              <StatNumber fontSize="lg" color="red.500">
                {trips.filter(t => t.delay_minutes > 2).length}
              </StatNumber>
              <StatHelpText fontSize="xs">
                <Icon as={FiTrendingDown} mr={1} />
                Behind schedule
              </StatHelpText>
            </Stat>
            
            <Stat>
              <StatLabel fontSize="xs">Avg Delay</StatLabel>
              <StatNumber fontSize="lg" color={getDelayColor(trips.reduce((sum, t) => sum + t.delay_minutes, 0) / trips.length)}>
                {Math.round(trips.reduce((sum, t) => sum + t.delay_minutes, 0) / trips.length)}m
              </StatNumber>
              <StatHelpText fontSize="xs">
                <Icon as={FiActivity} mr={1} />
                System wide
              </StatHelpText>
            </Stat>
          </Grid>

          <Divider />

          {/* Trip List */}
          <VStack spacing={3} align="stretch">
            {trips.map((trip) => (
              <Box key={trip.trip_id}>
                <Card 
                  variant="outline" 
                  cursor="pointer"
                  onClick={() => toggleTripExpansion(trip.trip_id)}
                  _hover={{ bg: 'gray.50' }}
                  transition="all 0.2s"
                >
                  <CardBody p={4}>
                    <HStack justify="space-between" align="center">
                      <HStack spacing={4}>
                        <Badge colorScheme="blue" fontSize="sm">
                          Bus {trip.vehicle_id}
                        </Badge>
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="semibold">
                            {trip.headsign}
                          </Text>
                          <Text fontSize="sm" color="gray.600">
                            {trip.direction_name} • Trip {trip.trip_id}
                          </Text>
                        </VStack>
                      </HStack>
                      
                      <HStack spacing={4}>
                        <Badge 
                          colorScheme={getDelayColor(trip.delay_minutes)}
                          fontSize="sm"
                        >
                          {getDelayText(trip.delay_minutes)}
                        </Badge>
                        
                        <HStack spacing={2} fontSize="sm" color="gray.600">
                          <Icon as={FiMapPin} />
                          <Text>
                            {trip.vehicle_data.latitude.toFixed(4)}, {trip.vehicle_data.longitude.toFixed(4)}
                          </Text>
                        </HStack>
                        
                        <Icon 
                          as={expandedTrips.has(trip.trip_id) ? FiChevronUp : FiChevronDown}
                          w={5} 
                          h={5} 
                        />
                      </HStack>
                    </HStack>
                  </CardBody>
                </Card>

                {/* Expanded Trip Details */}
                <Collapse in={expandedTrips.has(trip.trip_id)}>
                  <Box mt={2} ml={4} p={4} bg="gray.50" borderRadius="md">
                    <VStack spacing={4} align="stretch">
                      {/* Vehicle Info */}
                      <HStack justify="space-between">
                        <Text fontSize="sm" fontWeight="semibold">Vehicle Information</Text>
                        <Badge variant="outline">
                          Last Update: {new Date(trip.vehicle_data.timestamp).toLocaleTimeString()}
                        </Badge>
                      </HStack>
                      
                      <Grid templateColumns="repeat(3, 1fr)" gap={4} fontSize="sm">
                        <VStack align="start" spacing={1}>
                          <Text fontWeight="medium">Speed</Text>
                          <Text color="gray.600">
                            {trip.vehicle_data.speed ? `${trip.vehicle_data.speed} mph` : 'Unknown'}
                          </Text>
                        </VStack>
                        <VStack align="start" spacing={1}>
                          <Text fontWeight="medium">Bearing</Text>
                          <Text color="gray.600">
                            {trip.vehicle_data.bearing ? `${trip.vehicle_data.bearing}°` : 'Unknown'}
                          </Text>
                        </VStack>
                        <VStack align="start" spacing={1}>
                          <Text fontWeight="medium">Status</Text>
                          <Text color="gray.600">
                            {trip.vehicle_data.status || 'In Transit'}
                          </Text>
                        </VStack>
                      </Grid>

                      <Divider />

                      {/* Scheduled Stops */}
                      {trip.scheduled_stops.length > 0 && (
                        <>
                          <Text fontSize="sm" fontWeight="semibold">
                            Scheduled Stops ({trip.scheduled_stops.length})
                          </Text>
                          
                          <TableContainer maxH="200px" overflowY="auto">
                            <Table size="sm" variant="simple">
                              <Thead>
                                <Tr>
                                  <Th>Stop</Th>
                                  <Th>Scheduled</Th>
                                  <Th>Estimated</Th>
                                  <Th>Status</Th>
                                </Tr>
                              </Thead>
                              <Tbody>
                                {trip.scheduled_stops.slice(0, 10).map((stop) => (
                                  <Tr 
                                    key={stop.stop_id}
                                    bg={stop.passed ? 'gray.100' : 'transparent'}
                                  >
                                    <Td>
                                      <VStack align="start" spacing={0}>
                                        <Text fontSize="xs" fontWeight="medium">
                                          {stop.stop_name}
                                        </Text>
                                        <Text fontSize="xx-small" color="gray.500">
                                          {stop.stop_id}
                                        </Text>
                                      </VStack>
                                    </Td>
                                    <Td fontSize="xs">
                                      {formatTime(stop.scheduled_arrival)}
                                    </Td>
                                    <Td fontSize="xs">
                                      {formatTime(stop.estimated_arrival)}
                                    </Td>
                                    <Td>
                                      <Badge 
                                        size="sm"
                                        colorScheme={
                                          stop.passed ? 'gray' : 
                                          getDelayColor(stop.delay_minutes)
                                        }
                                      >
                                        {stop.passed ? 'Passed' : getDelayText(stop.delay_minutes)}
                                      </Badge>
                                    </Td>
                                  </Tr>
                                ))}
                              </Tbody>
                            </Table>
                          </TableContainer>
                          
                          {trip.scheduled_stops.length > 10 && (
                            <Text fontSize="xs" color="gray.500" textAlign="center">
                              Showing first 10 of {trip.scheduled_stops.length} stops
                            </Text>
                          )}
                        </>
                      )}
                    </VStack>
                  </Box>
                </Collapse>
              </Box>
            ))}
          </VStack>
        </VStack>
      </CardBody>
    </Card>
  );
};
