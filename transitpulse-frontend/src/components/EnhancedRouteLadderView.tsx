import React, { useState, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Progress,
  Icon,
  Button,
  ButtonGroup,
  Flex,
  Divider,
  useColorModeValue,
  Tooltip,
  Card,
  CardBody,
} from '@chakra-ui/react';
import { FiUsers, FiClock, FiNavigation, FiAlertTriangle } from 'react-icons/fi';

interface Vehicle {
  vehicle_id: string;
  route_id: string;
  latitude: number;
  longitude: number;
  status?: 'early' | 'on-time' | 'late' | 'missing' | 'layover';
  scheduleAdherence?: number;
  headwayDeviation?: number;
  crowding?: 'low' | 'medium' | 'high';
  operator?: string;
  trip_id?: string;
  blockId?: string;
  startTime?: string;
  direction?: 'inbound' | 'outbound';
  stopSequence?: number;
  nextStop?: string;
}

interface RouteStop {
  id: string;
  name: string;
  sequence: number;
  coordinates: [number, number];
}

interface EnhancedRouteLadderViewProps {
  vehicles?: Vehicle[];
  selectedRoutes?: string[];
}

// Mock route data - replace with real GTFS data
const ROUTE_DATA: Record<string, RouteStop[]> = {
  '101': [
    { id: 'stop1', name: 'Salesforce Transit Center-Bus Plaza', sequence: 1, coordinates: [-122.3962, 37.7894] },
    { id: 'stop2', name: 'Mission St & Fremont St', sequence: 2, coordinates: [-122.3942, 37.7884] },
    { id: 'stop3', name: 'Mission St & 1st St', sequence: 3, coordinates: [-122.3922, 37.7874] },
    { id: 'stop4', name: 'Piner Rd & Industrial Dr', sequence: 4, coordinates: [-122.3902, 37.7864] },
  ],
  '130': [
    { id: 'stop1', name: 'Salesforce Transit Center-Bus Plaza', sequence: 1, coordinates: [-122.3962, 37.7894] },
    { id: 'stop2', name: 'Mission St & Fremont St', sequence: 2, coordinates: [-122.3942, 37.7884] },
    { id: 'stop3', name: 'San Rafael Transit Center-Platform A', sequence: 3, coordinates: [-122.5322, 37.9734] },
  ],
  '150': [
    { id: 'stop1', name: 'San Rafael Transit Center', sequence: 1, coordinates: [-122.5322, 37.9734] },
    { id: 'stop2', name: 'Downtown San Rafael', sequence: 2, coordinates: [-122.5312, 37.9744] },
    { id: 'stop3', name: 'Larkspur Ferry Terminal', sequence: 3, coordinates: [-122.5082, 37.9454] },
  ],
};

export const EnhancedRouteLadderView: React.FC<EnhancedRouteLadderViewProps> = ({ 
  vehicles = [], 
  selectedRoutes = ['all'] 
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'timepoints'>('all');
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const stopBg = useColorModeValue('gray.50', 'gray.700');

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'early': return '#FF6B6B';
      case 'on-time': return '#51CF66';
      case 'late': return '#FFD93D';
      case 'missing': return '#868E96';
      case 'layover': return '#339AF0';
      default: return '#868E96';
    }
  };

  const getCrowdingIcon = (crowding?: string) => {
    switch (crowding) {
      case 'high': return { icon: FiUsers, color: 'red.500' };
      case 'medium': return { icon: FiUsers, color: 'yellow.500' };
      case 'low': return { icon: FiUsers, color: 'green.500' };
      default: return null;
    }
  };

  const routesToShow = useMemo(() => {
    if (selectedRoutes.includes('all')) {
      return [...new Set(vehicles.map(v => v.route_id))].sort();
    }
    return selectedRoutes;
  }, [vehicles, selectedRoutes]);

  const getVehiclesForRoute = (routeId: string) => {
    return vehicles.filter(v => v.route_id === routeId);
  };

  const getStatusCounts = (routeId: string) => {
    const routeVehicles = getVehiclesForRoute(routeId);
    return {
      missing: routeVehicles.filter(v => v.status === 'missing').length,
      early: routeVehicles.filter(v => v.status === 'early').length,
      late: routeVehicles.filter(v => v.status === 'late').length,
      onTime: routeVehicles.filter(v => v.status === 'on-time').length,
      layover: routeVehicles.filter(v => v.status === 'layover').length,
    };
  };

  const formatDeviation = (deviation?: number) => {
    if (deviation === undefined) return '';
    const sign = deviation >= 0 ? '+' : '';
    const minutes = Math.abs(deviation);
    const seconds = Math.round((minutes % 1) * 60);
    return `${sign}${Math.floor(minutes)}:${seconds.toString().padStart(2, '0')}m`;
  };

  return (
    <Box h="full" p={4} bg={useColorModeValue('gray.50', 'gray.900')}>
      <VStack spacing={4} align="stretch" h="full">
        {/* Header */}
        <HStack justify="space-between" align="center">
          <Text fontSize="lg" fontWeight="semibold">Route Ladder</Text>
          
          <HStack spacing={4}>
            {/* Status Legend */}
            <HStack spacing={4} fontSize="xs">
              <HStack>
                <Box w={3} h={3} bg="gray.400" rounded="full" />
                <Text>Missing ({vehicles.filter(v => v.status === 'missing').length})</Text>
              </HStack>
              <HStack>
                <Box w={3} h={3} bg="red.400" rounded="full" />
                <Text>Early ({vehicles.filter(v => v.status === 'early').length})</Text>
              </HStack>
              <HStack>
                <Box w={3} h={3} bg="yellow.400" rounded="full" />
                <Text>Late ({vehicles.filter(v => v.status === 'late').length})</Text>
              </HStack>
              <HStack>
                <Box w={3} h={3} bg="green.400" rounded="full" />
                <Text>On-Time ({vehicles.filter(v => v.status === 'on-time').length})</Text>
              </HStack>
              <HStack>
                <Box w={3} h={3} bg="blue.400" rounded="full" />
                <Text>Layover/Deadhead ({vehicles.filter(v => v.status === 'layover').length})</Text>
              </HStack>
            </HStack>

            {/* Filter buttons */}
            <ButtonGroup size="sm" variant="outline">
              <Button 
                isActive={selectedFilter === 'all'}
                onClick={() => setSelectedFilter('all')}
              >
                All Stops
              </Button>
              <Button 
                isActive={selectedFilter === 'timepoints'}
                onClick={() => setSelectedFilter('timepoints')}
              >
                Timepoints only
              </Button>
            </ButtonGroup>
          </HStack>
        </HStack>

        <Divider />

        {/* Route Ladders */}
        <VStack spacing={6} align="stretch" flex={1} overflowY="auto">
          {routesToShow.map(routeId => {
            const routeVehicles = getVehiclesForRoute(routeId);
            const routeStops = ROUTE_DATA[routeId] || [];
            const statusCounts = getStatusCounts(routeId);
            const hasIssues = statusCounts.missing > 0 || statusCounts.early > 0 || statusCounts.late > 0;

            if (routeVehicles.length === 0) {
              return (
                <Card key={routeId} bg={cardBg}>
                  <CardBody>
                    <VStack spacing={4}>
                      <HStack justify="space-between" w="full">
                        <Text fontSize="lg" fontWeight="semibold">Route {routeId}</Text>
                        <Badge colorScheme="gray" variant="subtle">No trips currently running</Badge>
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>
              );
            }

            return (
              <Card key={routeId} bg={cardBg} border={hasIssues ? '2px solid' : '1px solid'} borderColor={hasIssues ? 'red.200' : borderColor}>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    {/* Route Header */}
                    <HStack justify="space-between">
                      <HStack>
                        <Text fontSize="lg" fontWeight="semibold">Route {routeId}</Text>
                        {hasIssues && <Icon as={FiAlertTriangle} color="red.500" />}
                      </HStack>
                      
                      <HStack spacing={2} fontSize="xs">
                        {statusCounts.missing > 0 && (
                          <Badge colorScheme="gray">Missing: {statusCounts.missing}</Badge>
                        )}
                        {statusCounts.early > 0 && (
                          <Badge colorScheme="red">Early: {statusCounts.early}</Badge>
                        )}
                        {statusCounts.late > 0 && (
                          <Badge colorScheme="yellow">Late: {statusCounts.late}</Badge>
                        )}
                        {statusCounts.onTime > 0 && (
                          <Badge colorScheme="green">On-Time: {statusCounts.onTime}</Badge>
                        )}
                        {statusCounts.layover > 0 && (
                          <Badge colorScheme="blue">Layover: {statusCounts.layover}</Badge>
                        )}
                      </HStack>
                    </HStack>

                    {/* Route Ladder Visualization */}
                    <Box position="relative" minH="200px">
                      {/* Route line */}
                      <Box
                        position="absolute"
                        left="50px"
                        top="20px"
                        bottom="20px"
                        w="4px"
                        bg="gray.300"
                        rounded="full"
                      />

                      {/* Stops */}
                      {routeStops.map((stop, index) => (
                        <Box
                          key={stop.id}
                          position="absolute"
                          left="0"
                          top={`${20 + (index * 60)}px`}
                          w="full"
                        >
                          {/* Stop indicator */}
                          <Box
                            position="absolute"
                            left="46px"
                            w="12px"
                            h="12px"
                            bg={stopBg}
                            border="2px solid"
                            borderColor="gray.400"
                            rounded="full"
                            zIndex={2}
                          />

                          {/* Stop name */}
                          <Box ml="70px">
                            <Text fontSize="sm" fontWeight="medium">{stop.name}</Text>
                          </Box>

                          {/* Vehicles at this section */}
                          <HStack ml="70px" mt={1} spacing={2} flexWrap="wrap">
                            {routeVehicles
                              .filter(vehicle => {
                                // Simple logic to place vehicles between stops
                                // In real implementation, use actual position data
                                const vehiclePosition = Math.floor(Math.random() * routeStops.length);
                                return vehiclePosition === index;
                              })
                              .map(vehicle => {
                                const crowdingInfo = getCrowdingIcon(vehicle.crowding);
                                
                                return (
                                  <Tooltip
                                    key={vehicle.vehicle_id}
                                    label={
                                      <VStack spacing={1} align="start" fontSize="xs">
                                        <Text fontWeight="semibold">Vehicle {vehicle.vehicle_id}</Text>
                                        <Text>Status: {vehicle.status}</Text>
                                        <Text>Schedule: {formatDeviation(vehicle.scheduleAdherence)}</Text>
                                        <Text>Headway: {formatDeviation(vehicle.headwayDeviation)}</Text>
                                        {vehicle.operator && <Text>Operator: {vehicle.operator}</Text>}
                                      </VStack>
                                    }
                                  >
                                    <HStack
                                      bg={getStatusColor(vehicle.status)}
                                      color="white"
                                      px={2}
                                      py={1}
                                      rounded="md"
                                      fontSize="xs"
                                      fontWeight="semibold"
                                      cursor="pointer"
                                      _hover={{ transform: 'scale(1.05)' }}
                                      transition="transform 0.2s"
                                    >
                                      <Text>{vehicle.vehicle_id}</Text>
                                      {crowdingInfo && (
                                        <Icon as={crowdingInfo.icon} boxSize={3} />
                                      )}
                                    </HStack>
                                  </Tooltip>
                                );
                              })}
                          </HStack>
                        </Box>
                      ))}

                      {/* End terminals */}
                      <Box
                        position="absolute"
                        left="30px"
                        top="10px"
                        w="40px"
                        h="20px"
                        bg="blue.500"
                        color="white"
                        fontSize="xs"
                        fontWeight="bold"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        rounded="md"
                      >
                        START
                      </Box>

                      <Box
                        position="absolute"
                        left="30px"
                        bottom="10px"
                        w="40px"
                        h="20px"
                        bg="blue.500"
                        color="white"
                        fontSize="xs"
                        fontWeight="bold"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        rounded="md"
                      >
                        END
                      </Box>
                    </Box>
                  </VStack>
                </CardBody>
              </Card>
            );
          })}
        </VStack>
      </VStack>
    </Box>
  );
};
