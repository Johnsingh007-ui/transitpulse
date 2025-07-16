import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Tooltip,
  Card,
  CardBody,
  Flex,
  Circle,
  useColorModeValue,
  Skeleton,
} from '@chakra-ui/react';
import {
  FiTruck,
  FiMapPin,
  FiClock,
  FiNavigation,
  FiActivity,
  FiAlertCircle
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

// Import real API types and functions - NO MOCK DATA
import {
  buildRealStopData,
  getActiveTripsbyRoute,
  type TripStop,
  type RouteActiveTrips,
  type RouteMetrics,
  type ActiveTrip
} from '../api/apiClient';

const MotionBox = motion(Box);
const MotionCard = motion(Card);

interface VehicleAtStop {
  vehicle_id: string;
  route_short_name: string;
  trip_headsign: string;
  status: 'on_time' | 'late' | 'early' | 'delayed';
  position: {
    latitude: number;
    longitude: number;
  };
  direction_name: string;
}

interface RouteLadderViewProps {
  routes: RouteMetrics[];
  selectedRoute: string;
  trips: ActiveTrip[];
}

const RouteLadderView: React.FC<RouteLadderViewProps> = ({
  routes,
  selectedRoute,
  trips
}) => {
  const [routeStops, setRouteStops] = useState<TripStop[]>([]);
  const [activeTripsData, setActiveTripsData] = useState<RouteActiveTrips | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Fetch real route data - NO MOCK DATA
  const fetchRealRouteData = async (routeId: string) => {
    try {
      setIsLoading(true);
      console.log(`🚍 Fetching REAL data for route ${routeId}...`);
      
      // Get real stops and active trips from backend
      const [stopData, activeTrips] = await Promise.all([
        buildRealStopData(routeId),
        getActiveTripsbyRoute(routeId)
      ]);

      setRouteStops(stopData);
      setActiveTripsData(activeTrips);
      
      console.log(`✅ Loaded ${stopData.length} real stops and ${activeTrips.total_trips} active trips for route ${routeId}`);
    } catch (error) {
      console.error('Failed to fetch real route data:', error);
      // Set empty arrays instead of mock data
      setRouteStops([]);
      setActiveTripsData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Get vehicles at a specific stop from real data
  const getVehiclesAtStop = (stop: TripStop): VehicleAtStop[] => {
    if (!activeTripsData) return [];
    
    const routeData = activeTripsData.routes.find(r => r.route_id === selectedRoute);
    if (!routeData) return [];

    // Find vehicles near this stop (using coordinates)
    return routeData.trips
      .filter(trip => {
        const vehiclePos = trip.vehicle_info.position;
        const distance = Math.sqrt(
          Math.pow(vehiclePos.latitude - stop.stop_lat, 2) +
          Math.pow(vehiclePos.longitude - stop.stop_lon, 2)
        );
        return distance < 0.01; // ~1km proximity
      })
      .map(trip => ({
        vehicle_id: trip.vehicle_info.vehicle_id,
        route_short_name: trip.route_short_name,
        trip_headsign: trip.trip_headsign,
        status: 'on_time' as const, // Would come from real delay calculation
        position: {
          latitude: trip.vehicle_info.position.latitude,
          longitude: trip.vehicle_info.position.longitude
        },
        direction_name: trip.direction_name
      }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'gray';
      case 'current': return 'blue';
      case 'upcoming': return 'green';
      case 'missed': return 'red';
      default: return 'gray';
    }
  };

  const getVehicleStatusColor = (status: string) => {
    switch (status) {
      case 'on_time': return 'green';
      case 'early': return 'blue';
      case 'late': return 'yellow';
      case 'delayed': return 'red';
      default: return 'gray';
    }
  };

  // Fetch real data when route changes
  useEffect(() => {
    if (selectedRoute !== 'all') {
      fetchRealRouteData(selectedRoute);
    } else {
      setRouteStops([]);
      setActiveTripsData(null);
    }
  }, [selectedRoute]);

  if (selectedRoute === 'all') {
    return (
      <Box textAlign="center" py={12}>
        <Icon as={FiMapPin} fontSize="3xl" color="gray.400" mb={4} />
        <Text fontSize="lg" color="gray.500" mb={2}>
          Select a specific route to view the ladder diagram
        </Text>
        <Text fontSize="sm" color="gray.400">
          Choose a route from the selector above to see real-time stop progression
        </Text>
      </Box>
    );
  }

  const selectedRouteData = routes.find(r => r.route_id === selectedRoute);

  if (isLoading) {
    return (
      <VStack spacing={4} align="stretch">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} height="80px" />
        ))}
      </VStack>
    );
  }

  if (routeStops.length === 0) {
    return (
      <Box textAlign="center" py={12}>
        <Icon as={FiMapPin} fontSize="3xl" color="gray.400" mb={4} />
        <Text fontSize="lg" color="gray.500" mb={2}>
          No stop data available for this route
        </Text>
        <Text fontSize="sm" color="gray.400">
          Route {selectedRoute} has no active stops in the system
        </Text>
      </Box>
    );
  }

  return (
    <Box>
      {/* Route Header */}
      {selectedRouteData && (
        <MotionBox
          mb={6}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <Flex justify="space-between" align="center">
                <HStack spacing={4}>
                  <Badge colorScheme="blue" fontSize="lg" px={3} py={1}>
                    Route {selectedRouteData.route_short_name}
                  </Badge>
                  <Text fontWeight="bold" fontSize="lg">
                    {selectedRouteData.route_long_name}
                  </Text>
                </HStack>
                <HStack spacing={6}>
                  <HStack spacing={2}>
                    <Icon as={FiTruck} color="blue.500" />
                    <Text fontSize="sm" color="gray.600">
                      {selectedRouteData.active_trips} Active
                    </Text>
                  </HStack>
                  <HStack spacing={2}>
                    <Icon as={FiActivity} color="green.500" />
                    <Text fontSize="sm" color="gray.600">
                      {selectedRouteData.on_time_percentage.toFixed(1)}% On-Time
                    </Text>
                  </HStack>
                </HStack>
              </Flex>
            </CardBody>
          </Card>
        </MotionBox>
      )}

      {/* Real Route Ladder - NO MOCK DATA */}
      <VStack spacing={0} align="stretch">
        <AnimatePresence>
          {routeStops.map((stop, index) => {
            const vehiclesAtStop = getVehiclesAtStop(stop);
            
            return (
              <MotionCard
                key={stop.stop_id}
                bg={cardBg}
                borderColor={borderColor}
                mb={2}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ scale: 1.01 }}
              >
                <CardBody py={4}>
                  <Flex align="center" justify="space-between">
                    {/* Left side - Stop info and timeline */}
                    <Flex align="center" flex={1}>
                      {/* Timeline indicator */}
                      <VStack spacing={0} mr={4}>
                        <Circle
                          size="12px"
                          bg={`${getStatusColor(stop.status)}.500`}
                          border="2px"
                          borderColor={`${getStatusColor(stop.status)}.300`}
                        />
                        {index < routeStops.length - 1 && (
                          <Box
                            w="2px"
                            h="60px"
                            bg={`${getStatusColor(stop.status)}.200`}
                            mt={1}
                          />
                        )}
                      </VStack>

                      {/* Stop details */}
                      <Box flex={1}>
                        <HStack justify="space-between" mb={2}>
                          <Text fontWeight="bold" fontSize="md">
                            {stop.stop_name}
                          </Text>
                          <HStack spacing={4}>
                            <HStack spacing={2}>
                              <Icon as={FiMapPin} fontSize="sm" color="gray.500" />
                              <Text fontSize="sm" color="gray.600">
                                Stop {stop.stop_sequence}
                              </Text>
                            </HStack>
                            {stop.scheduled_arrival && (
                              <HStack spacing={2}>
                                <Icon as={FiClock} fontSize="sm" color="gray.500" />
                                <Text fontSize="sm" color="gray.600">
                                  Scheduled: {stop.scheduled_arrival}
                                </Text>
                              </HStack>
                            )}
                            {stop.predicted_arrival && (
                              <HStack spacing={2}>
                                <Icon as={FiNavigation} fontSize="sm" color="blue.500" />
                                <Text fontSize="sm" fontWeight="medium" color="blue.600">
                                  Predicted: {stop.predicted_arrival}
                                </Text>
                              </HStack>
                            )}
                          </HStack>
                        </HStack>

                        {/* Real vehicles at this stop */}
                        {vehiclesAtStop.length > 0 && (
                          <HStack spacing={3} flexWrap="wrap">
                            {vehiclesAtStop.map((vehicle) => (
                              <Tooltip
                                key={vehicle.vehicle_id}
                                label={`Bus ${vehicle.vehicle_id} - ${vehicle.trip_headsign} (${vehicle.direction_name})`}
                              >
                                <Badge
                                  colorScheme={getVehicleStatusColor(vehicle.status)}
                                  variant="solid"
                                  display="flex"
                                  alignItems="center"
                                  gap={1}
                                  px={3}
                                  py={1}
                                >
                                  <Icon as={FiTruck} fontSize="xs" />
                                  {vehicle.vehicle_id}
                                </Badge>
                              </Tooltip>
                            ))}
                          </HStack>
                        )}

                        {/* Real delay indicator (only if available) */}
                        {stop.delay_seconds !== undefined && (
                          <HStack spacing={2} mt={2}>
                            <Icon 
                              as={stop.delay_seconds > 60 ? FiAlertCircle : FiActivity} 
                              fontSize="sm" 
                              color={stop.delay_seconds > 60 ? 'red.500' : 'green.500'}
                            />
                            <Text 
                              fontSize="sm" 
                              color={stop.delay_seconds > 60 ? 'red.600' : 'green.600'}
                              fontWeight="medium"
                            >
                              {stop.delay_seconds > 0 
                                ? `${Math.floor(stop.delay_seconds / 60)}m ${stop.delay_seconds % 60}s late`
                                : `${Math.floor(Math.abs(stop.delay_seconds) / 60)}m ${Math.abs(stop.delay_seconds) % 60}s early`
                              }
                            </Text>
                          </HStack>
                        )}
                      </Box>
                    </Flex>

                    {/* Right side - Status badge */}
                    <Badge
                      colorScheme={getStatusColor(stop.status)}
                      variant="subtle"
                      fontSize="xs"
                      px={3}
                      py={1}
                      textTransform="capitalize"
                    >
                      {stop.status}
                    </Badge>
                  </Flex>
                </CardBody>
              </MotionCard>
            );
          })}
        </AnimatePresence>
      </VStack>
    </Box>
  );
};

export default RouteLadderView;
