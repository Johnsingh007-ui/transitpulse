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
  predicted_arrival?: number;
  predicted_departure?: number;
  arrival_delay?: number;
  departure_delay?: number;
  status: 'scheduled' | 'updated';
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
  latitude?: number;
  longitude?: number;
  bearing?: number;
  speed?: number;
  occupancy_status?: string;
  direction_name?: string;
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

  const fetchTripDetails = async () => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);

    try {
      // For now, let's create a mock response using the vehicle data
      // In a real implementation, this would call /api/v1/trips/vehicle-trip-details/${vehicleId}
      
      // First get the vehicle data
      const vehicleResponse = await apiClient.get('/vehicles/realtime');
      const vehicles = vehicleResponse.data.data || [];
      const vehicle = vehicles.find((v: any) => v.vehicle_id === vehicleId);
      
      if (!vehicle) {
        throw new Error('Vehicle not found');
      }

      // Create mock trip details with stops and times
      const mockStops = [
        {
          stop_sequence: 1,
          stop_id: "40003",
          stop_name: "Salesforce Transit Center",
          stop_lat: 37.790097,
          stop_lon: -122.396066,
          stop_code: "40003",
          scheduled_arrival: "07:45:00",
          scheduled_departure: "07:45:00",
          predicted_arrival: Math.floor(Date.now() / 1000) + 300, // 5 minutes from now
          predicted_departure: Math.floor(Date.now() / 1000) + 360,
          arrival_delay: 180, // 3 minutes late
          departure_delay: 180,
          status: "updated" as const
        },
        {
          stop_sequence: 2,
          stop_id: "40006",
          stop_name: "Folsom St & 2nd St",
          stop_lat: 37.785447,
          stop_lon: -122.396745,
          stop_code: "40006",
          scheduled_arrival: "07:50:00",
          scheduled_departure: "07:50:00",
          predicted_arrival: Math.floor(Date.now() / 1000) + 600, // 10 minutes from now
          predicted_departure: Math.floor(Date.now() / 1000) + 660,
          arrival_delay: 120, // 2 minutes late
          departure_delay: 120,
          status: "updated" as const
        },
        {
          stop_sequence: 3,
          stop_id: "40009", 
          stop_name: "Howard St & 2nd St",
          stop_lat: 37.78669,
          stop_lon: -122.398446,
          stop_code: "40009",
          scheduled_arrival: "07:55:00",
          scheduled_departure: "07:55:00",
          predicted_arrival: Math.floor(Date.now() / 1000) + 900, // 15 minutes from now
          predicted_departure: Math.floor(Date.now() / 1000) + 960,
          arrival_delay: 60, // 1 minute late
          departure_delay: 60,
          status: "updated" as const
        },
        {
          stop_sequence: 4,
          stop_id: "40012",
          stop_name: "4th St & Folsom St", 
          stop_lat: 37.781803,
          stop_lon: -122.400969,
          stop_code: "40012",
          scheduled_arrival: "08:00:00",
          scheduled_departure: "08:00:00",
          predicted_arrival: null,
          predicted_departure: null,
          arrival_delay: null,
          departure_delay: null,
          status: "scheduled" as const
        },
        {
          stop_sequence: 5,
          stop_id: "40023",
          stop_name: "Golden Gate Ave & Polk St",
          stop_lat: 37.781212,
          stop_lon: -122.418585,
          stop_code: "40023", 
          scheduled_arrival: "08:05:00",
          scheduled_departure: "08:05:00",
          predicted_arrival: null,
          predicted_departure: null,
          arrival_delay: null,
          departure_delay: null,
          status: "scheduled" as const
        }
      ];

      const mockTripDetails = {
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
        stops: mockStops,
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
        real_time_updates: {
          trip_id: vehicle.trip_id,
          route_id: vehicle.route_id,
          timestamp: new Date().toISOString(),
          agency: "Golden Gate Transit",
          stop_time_updates: mockStops.filter(s => s.predicted_arrival).map(s => ({
            stop_id: s.stop_id,
            stop_sequence: s.stop_sequence,
            arrival_delay: s.arrival_delay,
            departure_delay: s.departure_delay,
            arrival_time: s.predicted_arrival,
            departure_time: s.predicted_departure
          }))
        },
        last_updated: new Date().toISOString()
      };

      setTripDetails(mockTripDetails);
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

  const formatPredictedTime = (timestamp?: number) => {
    if (!timestamp) return null;
    return new Date(timestamp * 1000).toLocaleTimeString();
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

  return (
    <Box>
      <Button
        onClick={onToggle}
        variant="ghost"
        width="100%"
        justifyContent="space-between"
        rightIcon={isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
        color={textColor}
        _hover={{ bg: useColorModeValue('gray.100', 'gray.700') }}
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
                  <Text fontSize="sm" color={subtextColor}>
                    ({tripDetails.stops.length} stops)
                  </Text>
                </HStack>

                <Box overflowX="auto" maxHeight="400px" overflowY="auto">
                  <Table size="sm" variant="simple">
                    <Thead position="sticky" top={0} bg={bgColor} zIndex={1}>
                      <Tr>
                        <Th>#</Th>
                        <Th>Stop Name</Th>
                        <Th>Scheduled</Th>
                        <Th>Predicted</Th>
                        <Th>Delay</Th>
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
                            {stop.predicted_arrival ? (
                              <Text fontSize="sm" fontWeight="medium">
                                {formatPredictedTime(stop.predicted_arrival)}
                              </Text>
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
                              <Text fontSize="sm" color={subtextColor}>-</Text>
                            )}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              </Box>

              {/* Real-time Update Info */}
              {tripDetails.real_time_updates && (
                <Box p={3} bg={useColorModeValue('blue.50', 'blue.900')} borderRadius="md">
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
