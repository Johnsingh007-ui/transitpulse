import React, { useEffect, useState } from 'react';
import { getRoutes, Route } from '../api/apiClient';
import { Box, List, ListItem, Text, Heading, Spinner, useColorModeValue } from '@chakra-ui/react';
import RouteDetailsModal from './RouteDetailsModal';

const RouteList: React.FC = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
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

  const handleRouteClick = (routeId: string) => {
    setSelectedRoute(routeId);
    setIsModalOpen(true);
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
      <List spacing={0}>
        {routes.map((route) => (
          <ListItem 
            key={route.route_id}
            p={4}
            borderBottomWidth="1px"
            borderColor={borderColor}
            _last={{ borderBottom: 'none' }}
            _hover={{ bg: hoverBg, cursor: 'pointer' }}
            onClick={() => handleRouteClick(route.route_id)}
          >
            <Box>
              <Text fontWeight="bold" fontSize="lg">
                {route.route_short_name || 'N/A'}
              </Text>
              <Text color="gray.600" fontSize="sm">
                {route.route_long_name || 'No description available'}
              </Text>
              <Text fontSize="xs" color="gray.500" mt={1}>
                ID: {route.route_id} • Type: {route.route_type}
              </Text>
            </Box>
          </ListItem>
        ))}
      </List>
      
      {selectedRoute && (
        <RouteDetailsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          routeId={selectedRoute}
        />
      )}
    </Box>
  );
};

export default RouteList;
