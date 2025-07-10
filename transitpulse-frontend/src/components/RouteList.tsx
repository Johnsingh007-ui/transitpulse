import React, { useEffect, useState } from 'react';
import { getRoutes, Route } from '../api/apiClient';
import { 
  Box, 
  List, 
  ListItem, 
  Text, 
  Heading, 
  Spinner, 
  useColorModeValue, 
  Badge,
  HStack,
  VStack,
  Flex,
  Icon,
  Button
} from '@chakra-ui/react';
import { FaBus, FaLink, FaMapMarkerAlt } from 'react-icons/fa';
import RouteDetailsModal from './RouteDetailsModal';

interface RouteListProps {
  onRouteSelect?: (routeId: string | null) => void;
  selectedRouteId?: string | null;
}

const RouteList: React.FC<RouteListProps> = ({ onRouteSelect, selectedRouteId }) => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const data = await getRoutes();
        setRoutes(data);
      } catch (err) {
        console.error('Failed to load routes:', err);
        setError('Failed to load routes. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchRoutes();
  }, []);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  if (loading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="xl" />
        <Text mt={4}>Loading routes...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" py={8} color="red.500">
        <Text>{error}</Text>
      </Box>
    );
  }

  if (routes.length === 0) {
    return (
      <Box textAlign="center" py={8}>
        <Text>No routes available</Text>
      </Box>
    );
  }

  const handleRouteClick = (route: Route) => {
    setSelectedRoute(route);
    setIsModalOpen(true);
  };

  const getRouteTypeLabel = (routeType: number) => {
    switch(routeType) {
      case 3: return 'Bus';
      case 0: return 'Tram';
      case 1: return 'Subway';
      case 2: return 'Rail';
      default: return 'Transit';
    }
  };

  const formatRouteColor = (color: string | null | undefined): string => {
    if (!color || color.length !== 6) return '#3182CE'; // Default blue
    return `#${color}`;
  };

  return (
    <Box 
      borderWidth="1px" 
      borderRadius="lg" 
      overflow="hidden" 
      bg={bgColor}
      borderColor={borderColor}
    >
      <Box p={4} borderBottomWidth="1px" borderColor={borderColor}>
        <Heading size="md">Available Routes</Heading>
        <Text color="gray.500" mt={1}>
          {routes.length} route{routes.length !== 1 ? 's' : ''} found
        </Text>
      </Box>
      <List spacing={3}>
        {routes.map((route) => {
          const isSelected = selectedRouteId === route.route_id;
          
          return (
            <ListItem 
              key={route.route_id}
              p={0}
              borderRadius="lg"
              _hover={{ transform: 'translateY(-2px)', shadow: 'lg', cursor: 'pointer' }}
              transition="all 0.2s"
              bg={isSelected ? 'blue.50' : 'transparent'}
              borderWidth={isSelected ? '2px' : '1px'}
              borderColor={isSelected ? 'blue.400' : 'transparent'}
            >
              <Box
                p={4}
                borderRadius="lg"
                borderLeftWidth="4px"
                borderLeftColor={formatRouteColor(route.route_color)}
              >
                <Flex justify="space-between" align="start">
                  <VStack align="start" spacing={2} flex={1}>
                    <HStack spacing={3}>
                      <Box
                        bg={formatRouteColor(route.route_color)}
                        color={route.route_text_color === 'FFFFFF' ? 'white' : 'black'}
                        px={3}
                        py={1}
                        borderRadius="md"
                        fontWeight="bold"
                        fontSize="lg"
                        minW="60px"
                        textAlign="center"
                      >
                        {route.route_short_name || route.route_id}
                      </Box>
                      <Badge 
                        colorScheme="blue" 
                        variant="subtle"
                        fontSize="xs"
                      >
                        <Icon as={FaBus} mr={1} />
                        {getRouteTypeLabel(route.route_type)}
                      </Badge>
                    </HStack>
                    
                    <Text fontWeight="semibold" fontSize="md" color="gray.700">
                      {route.route_long_name || 'No description available'}
                    </Text>
                    
                    <HStack spacing={4} fontSize="xs" color="gray.500">
                      <Text>Route ID: {route.route_id}</Text>
                      <Text>Agency: {route.agency_id}</Text>
                      {route.route_url && (
                        <HStack spacing={1}>
                          <Icon as={FaLink} />
                          <Text>Schedule Available</Text>
                        </HStack>
                      )}
                    </HStack>

                    <HStack spacing={2} mt={2}>
                      <Button
                        size="xs"
                        colorScheme="blue"
                        variant="outline"
                        leftIcon={<FaMapMarkerAlt />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRouteSelect?.(isSelected ? null : route.route_id);
                        }}
                      >
                        {isSelected ? 'Hide on Map' : 'Show on Map'}
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRouteClick(route);
                        }}
                      >
                        Details
                      </Button>
                    </HStack>
                  </VStack>
                </Flex>
              </Box>
            </ListItem>
          );
        })}
      </List>
      
      {selectedRoute && (
        <RouteDetailsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          route={selectedRoute}
        />
      )}
    </Box>
  );
};

export default RouteList;
