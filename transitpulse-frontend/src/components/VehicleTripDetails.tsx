import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Collapse,
  Badge,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Icon,
  useColorModeValue,
  Spinner,
  Alert,
  AlertIcon,
  Tooltip
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon, TimeIcon, WarningIcon } from '@chakra-ui/icons';
import apiClient from '../api/apiClient';

interface StopUpdate {
  stop_sequence: number;
  stop_id: string;
  stop_name: string;
  stop_lat?: number;
  stop_lon?: number;
  stop_code?: string;
  scheduled_arrival: string;
  scheduled_departure: string;
  predicted_arrival?: string;
  predicted_departure?: string;
  actual_arrival?: string;
  actual_departure?: string;
  arrival_delay?: number;
  departure_delay?: number;
  status: 'scheduled' | 'updated' | 'passed' | 'current' | 'upcoming';
}

interface TripInfo {
  trip_id: string;
  route_id: string;
  trip_headsign: string;
  direction_id: number;
  route_short_name: string;
  route_long_name: string;
  route_color?: string;
  route_text_color?: string;
}

interface VehicleInfo {
  vehicle_id: string;
  current_stop_id?: string;
  current_stop_sequence?: number;
  current_status?: number;
  last_updated?: string;
}

interface TripDetails {
  trip_info: TripInfo;
  stops: StopUpdate[];
  vehicle_info?: VehicleInfo;
  last_updated: string;
}

interface VehicleTripDetailsProps {
  vehicleId: string;
  isOpen: boolean;
  onToggle: () => void;
}

const VehicleTripDetails: React.FC<VehicleTripDetailsProps> = ({
  vehicleId,
  isOpen,
  onToggle
}) => {
  const [tripDetails, setTripDetails] = useState<TripDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const subtextColor = useColorModeValue('gray.600', 'gray.400');
  const infoBoxBgColor = useColorModeValue('blue.50', 'blue.900');
  const hoverBgColor = useColorModeValue('gray.100', 'gray.700');

  const fetchTripDetails = async () => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);

    try {
      // Try to fetch real trip details from backend API
      try {
        const response = await apiClient.get(`/trips/vehicle-trip-details/${vehicleId}`);
        setTripDetails(response.data);
        setLoading(false);
        return;
      } catch (apiError) {
        console.warn('Trip details API not available, displaying basic vehicle info only');
      }

      // Fallback: Get real vehicle data only - no mock stops
      const vehicleResponse = await apiClient.get('/vehicles/realtime');
      const vehicles = vehicleResponse.data.data || [];
      const vehicle = vehicles.find((v: any) => v.vehicle_id === vehicleId);
      
      if (!vehicle) {
        throw new Error('Vehicle not found');
      }

      // Create basic trip details using only real vehicle data - NO MOCK DATA
      const realTripDetails = {
        trip_info: {
          trip_id: vehicle.trip_id,
          route_id: vehicle.route_id,
          trip_headsign: vehicle.headsign || `Route ${vehicle.route_id} - ${vehicle.direction_name}`,
          direction_id: vehicle.direction_id || 0,
          route_short_name: vehicle.route_id,
          route_long_name: `Route ${vehicle.route_id} Service`,
          route_color: "#3366FF",
          route_text_color: "#FFFFFF"
        },
        stops: [], // No stops data available without real trip API
        vehicle_info: {
          vehicle_id: vehicle.vehicle_id,
          latitude: vehicle.latitude,
          longitude: vehicle.longitude,
          bearing: vehicle.bearing,
          speed: vehicle.speed,
          occupancy_status: vehicle.occupancy_status,
          direction_name: vehicle.direction_name,
          last_updated: vehicle.timestamp
        },
        real_time_updates: null, // No mock real-time updates
        last_updated: new Date().toISOString()
      };

      setTripDetails(realTripDetails);
    } catch (err) {
      console.error('Error fetching trip details:', err);
      setError('Failed to load trip details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTripDetails();
  }, [isOpen, vehicleId]);

  // Auto-refresh every 30 seconds when open
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(fetchTripDetails, 30000);
    return () => clearInterval(interval);
  }, [isOpen, vehicleId]);

  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    return timeString;
  };

  const getDelayColor = (delay?: number) => {
    if (!delay) return 'gray';
    if (delay > 300) return 'red'; // > 5 minutes late
    if (delay > 120) return 'orange'; // > 2 minutes late
    if (delay < -60) return 'blue'; // > 1 minute early
    return 'green'; // on time
  };

  const formatDelay = (delay?: number) => {
    if (!delay) return null;
    const minutes = Math.abs(delay) / 60;
    const sign = delay > 0 ? '+' : '-';
    return `${sign}${minutes.toFixed(0)}min`;
  };

  const getOccupancyBadge = (occupancy?: string) => {
    const occupancyMap: { [key: string]: { color: string; label: string } } = {
      'EMPTY': { color: 'green', label: 'Empty' },
      'MANY_SEATS_AVAILABLE': { color: 'green', label: 'Many Seats' },
      'FEW_SEATS_AVAILABLE': { color: 'yellow', label: 'Few Seats' },
      'STANDING_ROOM_ONLY': { color: 'orange', label: 'Standing Only' },
      'CRUSHED_STANDING_ROOM_ONLY': { color: 'red', label: 'Full' },
      'FULL': { color: 'red', label: 'Full' },
      'NOT_ACCEPTING_PASSENGERS': { color: 'gray', label: 'Not Accepting' }
    };

    const config = occupancyMap[occupancy || ''] || { color: 'gray', label: 'Unknown' };
    return <Badge colorScheme={config.color} size="sm">{config.label}</Badge>;
  };

  // Helper functions for status display
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'passed':
      case 'completed':
        return 'green';
      case 'current':
        return 'blue';
      case 'upcoming':
        return 'gray';
      case 'updated':
        return 'orange';
      default:
        return 'gray';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'passed':
      case 'completed':
        return 'Passed';
      case 'current':
        return 'Current';
      case 'upcoming':
        return 'Upcoming';
      case 'updated':
        return 'Updated';
      case 'scheduled':
        return 'Scheduled';
      default:
        return status;
    }
  };

  return (
    <Box>
      <Button
        onClick={onToggle}
        variant="ghost"
        width="100%"
        justifyContent="space-between"
        rightIcon={isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
        color={textColor}
        _hover={{ bg: hoverBgColor }}
      >
        <HStack>
          <Text fontWeight="medium">Vehicle {vehicleId}</Text>
          <Text fontSize="sm" color={subtextColor}>- Trip Details</Text>
        </HStack>
      </Button>

      <Collapse in={isOpen} animateOpacity>
        <Box
          mt={2}
          p={4}
          bg={bgColor}
          border="1px"
          borderColor={borderColor}
          borderRadius="md"
          boxShadow="sm"
        >
          {loading && (
            <HStack justify="center" py={4}>
              <Spinner size="sm" />
              <Text color={subtextColor}>Loading trip details...</Text>
            </HStack>
          )}

          {error && (
            <Alert status="error" size="sm" mb={4}>
              <AlertIcon />
              {error}
            </Alert>
          )}

          {tripDetails && !loading && (
            <VStack align="stretch" spacing={4}>
              {/* Trip Header */}
              <Box>
                <HStack justify="space-between" mb={2}>
                  <VStack align="start" spacing={1}>
                    <HStack>
                      <Badge
                        colorScheme="blue"
                        fontSize="md"
                        px={2}
                        py={1}
                        borderRadius="md"
                      >
                        Route {tripDetails.trip_info.route_short_name}
                      </Badge>
                      <Text fontWeight="medium" color={textColor}>
                        {tripDetails.trip_info.trip_headsign}
                      </Text>
                    </HStack>
                    <Text fontSize="sm" color={subtextColor}>
                      {tripDetails.trip_info.route_long_name}
                    </Text>
                  </VStack>
                  
                  {tripDetails.vehicle_info && (
                    <VStack align="end" spacing={1}>
                      <HStack spacing={2}>
                        <Text fontSize="sm" color={subtextColor}>Direction:</Text>
                        <Badge size="sm" colorScheme="purple">
                          {tripDetails.vehicle_info.direction_name || 'Unknown'}
                        </Badge>
                      </HStack>
                      <HStack spacing={2}>
                        <Text fontSize="sm" color={subtextColor}>Occupancy:</Text>
                        {getOccupancyBadge(tripDetails.vehicle_info.occupancy_status)}
                      </HStack>
                    </VStack>
                  )}
                </HStack>
                
                <Text fontSize="xs" color={subtextColor}>
                  Trip ID: {tripDetails.trip_info.trip_id} • 
                  Last updated: {new Date(tripDetails.last_updated).toLocaleTimeString()}
                </Text>
              </Box>

              <Divider />

              {/* Stops Table */}
              <Box>
                <HStack mb={3}>
                  <Icon as={TimeIcon} color={subtextColor} />
                  <Text fontWeight="medium" color={textColor}>
                    Stops & Arrival Times
                  </Text>
                  {tripDetails.stops.length > 0 ? (
                    <Text fontSize="sm" color={subtextColor}>
                      ({tripDetails.stops.length} stops)
                    </Text>
                  ) : (
                    <Badge colorScheme="orange" size="sm">
                      No stop data available
                    </Badge>
                  )}
                </HStack>

                {tripDetails.stops.length > 0 ? (
                  <Box overflowX="auto" maxHeight="400px" overflowY="auto">
                    <Table size="sm" variant="simple">
                      <Thead position="sticky" top={0} bg={bgColor} zIndex={1}>
                        <Tr>
                          <Th>#</Th>
                          <Th>Stop Name</Th>
                          <Th>Scheduled</Th>
                          <Th>Actual/Predicted</Th>
                          <Th>Delay</Th>
                          <Th>Status</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {tripDetails.stops.map((stop) => (
                          <Tr key={stop.stop_id}>
                            <Td>
                              <Text fontSize="sm" fontWeight="medium">
                                {stop.stop_sequence}
                              </Text>
                            </Td>
                            <Td>
                              <VStack align="start" spacing={0}>
                                <Text fontSize="sm" fontWeight="medium">
                                  {stop.stop_name}
                                </Text>
                                <Text fontSize="xs" color={subtextColor}>
                                  {stop.stop_code || stop.stop_id}
                                </Text>
                              </VStack>
                            </Td>
                            <Td>
                              <Text fontSize="sm">
                                {formatTime(stop.scheduled_arrival)}
                              </Text>
                            </Td>
                            <Td>
                              {/* Show actual time for passed stops, predicted for upcoming */}
                              {stop.status === 'passed' && stop.actual_arrival ? (
                                <VStack align="start" spacing={0}>
                                  <Text fontSize="sm" fontWeight="medium" color="green.600">
                                    {stop.actual_arrival}
                                  </Text>
                                  <Text fontSize="xs" color={subtextColor}>
                                    Actual
                                  </Text>
                                </VStack>
                              ) : stop.predicted_arrival ? (
                                <VStack align="start" spacing={0}>
                                  <Text fontSize="sm" fontWeight="medium" color="blue.600">
                                    {stop.predicted_arrival}
                                  </Text>
                                  <Text fontSize="xs" color={subtextColor}>
                                    Predicted
                                  </Text>
                                </VStack>
                              ) : (
                                <Text fontSize="sm" color={subtextColor}>
                                  No prediction
                                </Text>
                              )}
                            </Td>
                            <Td>
                              {stop.arrival_delay !== null && stop.arrival_delay !== undefined ? (
                                <Tooltip label={`${stop.arrival_delay} seconds`}>
                                  <Badge
                                    colorScheme={getDelayColor(stop.arrival_delay)}
                                    size="sm"
                                  >
                                    {formatDelay(stop.arrival_delay)}
                                  </Badge>
                                </Tooltip>
                              ) : (
                                <Text fontSize="sm" color={subtextColor}>
                                  -
                                </Text>
                              )}
                            </Td>
                            <Td>
                              <Badge
                                colorScheme={getStatusColor(stop.status)}
                                size="sm"
                                variant={stop.status === 'current' ? 'solid' : 'subtle'}
                              >
                                {getStatusText(stop.status)}
                              </Badge>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                ) : (
                  <Box p={4} textAlign="center" color={subtextColor}>
                    <Text fontSize="sm">
                      Stop details are only available when the real-time trip API is connected.
                    </Text>
                    <Text fontSize="xs" mt={2}>
                      Showing vehicle location and status information from real GTFS-RT feed.
                    </Text>
                  </Box>
                )}
              </Box>

              {/* Real-time Update Info */}
              {tripDetails.real_time_updates && (
                <Box p={3} bg={infoBoxBgColor} borderRadius="md">
                  <HStack>
                    <Icon as={WarningIcon} color="blue.500" />
                    <Text fontSize="sm" color="blue.600">
                      Real-time updates available
                    </Text>
                  </HStack>
                  <Text fontSize="xs" color="blue.500" mt={1}>
                    Predictions from 511 Bay Area Trip Updates API
                  </Text>
                </Box>
              )}
            </VStack>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default VehicleTripDetails;
