import React, { useEffect, useState } from 'react';
import { getRoutesWithDirections, getRealTimeVehicles } from '../api/apiClient';
import { RouteWithDirections, Vehicle } from '../types';
import { 
  Box, 
  Text, 
  Heading, 
  Spinner, 
  useColorModeValue, 
  Badge,
  HStack,
  VStack,
  Flex,
  Icon,
  Button,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Divider,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { FaBus, FaArrowRight, FaArrowLeft, FaMapMarkerAlt } from 'react-icons/fa';

interface RouteDirectionsProps {
  onRouteSelect?: (routeId: string | null) => void;
  selectedRouteId?: string | null;
}

const RouteDirections: React.FC<RouteDirectionsProps> = ({ onRouteSelect, selectedRouteId }) => {
  const [routesWithDirections, setRoutesWithDirections] = useState<RouteWithDirections[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoutesWithDirections = async () => {
      try {
        setLoading(true);
        const response = await getRoutesWithDirections();
        
        if (response.status === 'success') {
          setRoutesWithDirections(response.data);
        } else {
          throw new Error(response.message || 'Failed to fetch routes with directions');
        }
      } catch (err) {
        console.error('Failed to load routes with directions:', err);
        setError('Failed to load routes with directions. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchRoutesWithDirections();
  }, []);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setVehicleLoading(true);
        const response = await getRealTimeVehicles();
        
        if (response.status === 'success') {
          setVehicles(response.data);
        } else {
          console.warn('Failed to fetch vehicles:', response.message);
          setVehicles([]);
        }
      } catch (err) {
        console.error('Failed to load vehicles:', err);
        setVehicles([]);
      } finally {
        setVehicleLoading(false);
      }
    };

    fetchVehicles();
    
    // Update vehicles every 30 seconds
    const interval = setInterval(fetchVehicles, 30000);
    return () => clearInterval(interval);
  }, []);

  const getVehiclesForRouteDirection = (routeId: string, directionId: number): Vehicle[] => {
    return vehicles.filter(vehicle => 
      vehicle.route_id === routeId && vehicle.direction_id === directionId
    );
  };

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBgColor = useColorModeValue('gray.50', 'gray.700');

  if (loading) {
    return (
      <Box p={4} textAlign="center">
        <Spinner size="lg" />
        <Text mt={2}>Loading routes with directions...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error" m={4}>
        <AlertIcon />
        {error}
      </Alert>
    );
  }

  return (
    <Box bg={bgColor} border="1px" borderColor={borderColor} borderRadius="md" overflow="hidden">
      <Box p={4} borderBottom="1px" borderColor={borderColor}>
        <Heading size="md">Routes & Directions</Heading>
        {vehicleLoading && (
          <HStack mt={2}>
            <Spinner size="sm" />
            <Text fontSize="sm" color="gray.500">Updating vehicles...</Text>
          </HStack>
        )}
      </Box>

      <Accordion allowMultiple>
        {routesWithDirections.map((route) => (
          <AccordionItem key={route.route_id}>
            <h2>
              <AccordionButton
                _hover={{ bg: hoverBgColor }}
                onClick={() => onRouteSelect?.(route.route_id)}
              >
                <Box flex="1" textAlign="left">
                  <HStack>
                    <Badge
                      bg={`#${route.route_color || '3182ce'}`}
                      color={`#${route.route_text_color || 'ffffff'}`}
                      px={2}
                      py={1}
                      borderRadius="md"
                      fontSize="sm"
                      fontWeight="bold"
                    >
                      {route.route_short_name}
                    </Badge>
                    <Text fontWeight="medium" noOfLines={1}>
                      {route.route_long_name}
                    </Text>
                  </HStack>
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </h2>
            <AccordionPanel pb={4}>
              <VStack spacing={3} align="stretch">
                {route.directions.map((direction) => {
                  const directionVehicles = getVehiclesForRouteDirection(route.route_id, direction.direction_id);
                  
                  return (
                    <Box key={direction.direction_id} p={3} bg={hoverBgColor} borderRadius="md">
                      <HStack justify="space-between" mb={2}>
                        <HStack>
                          <Icon 
                            as={direction.direction_id === 0 ? FaArrowRight : FaArrowLeft} 
                            color={direction.direction_id === 0 ? 'green.500' : 'blue.500'}
                          />
                          <Text fontWeight="semibold">{direction.direction_name}</Text>
                          <Badge colorScheme="gray" size="sm">
                            {direction.trip_count} trips
                          </Badge>
                        </HStack>
                        
                        <HStack>
                          <Icon as={FaBus} color="gray.500" />
                          <Text fontSize="sm" color="gray.600">
                            {directionVehicles.length} active
                          </Text>
                        </HStack>
                      </HStack>
                      
                      <VStack align="stretch" spacing={2}>
                        <Text fontSize="sm" color="gray.600">
                          <strong>Destinations:</strong> {direction.headsigns.join(', ')}
                        </Text>
                        
                        {directionVehicles.length > 0 && (
                          <Box>
                            <Text fontSize="sm" fontWeight="medium" mb={1}>Active Vehicles:</Text>
                            <VStack spacing={1} align="stretch">
                              {directionVehicles.slice(0, 3).map((vehicle) => (
                                <HStack key={vehicle.vehicle_id} fontSize="xs" color="gray.600">
                                  <Icon as={FaMapMarkerAlt} />
                                  <Text>Bus {vehicle.vehicle_id}</Text>
                                  {vehicle.headsign && (
                                    <Text>→ {vehicle.headsign}</Text>
                                  )}
                                </HStack>
                              ))}
                              {directionVehicles.length > 3 && (
                                <Text fontSize="xs" color="gray.500">
                                  +{directionVehicles.length - 3} more vehicles
                                </Text>
                              )}
                            </VStack>
                          </Box>
                        )}
                      </VStack>
                    </Box>
                  );
                })}
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </Box>
  );
};

export default RouteDirections;
