import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Grid, 
  Stat, 
  StatLabel, 
  StatNumber, 
  StatHelpText,
  StatArrow,
  useColorModeValue,
  Spinner,
  Text,
  Icon,
  Flex
} from '@chakra-ui/react';
import { FaBus, FaRoute, FaMapMarkerAlt, FaClock } from 'react-icons/fa';
import { getRoutes } from '../api/apiClient';

interface RouteStatsData {
  totalRoutes: number;
  totalStops: number;
  averageStopsPerRoute: number;
  routeTypes: { [key: number]: number };
}

const RouteStats: React.FC = () => {
  const [stats, setStats] = useState<RouteStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const routes = await getRoutes();
        
        // Calculate stats from routes data
        const routeTypes: { [key: number]: number } = {};
        routes.forEach(route => {
          routeTypes[route.route_type] = (routeTypes[route.route_type] || 0) + 1;
        });

        setStats({
          totalRoutes: routes.length,
          totalStops: 433, // We know this from the data loading
          averageStopsPerRoute: Math.round(433 / routes.length),
          routeTypes
        });
      } catch (error) {
        console.error('Failed to fetch route stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const getRouteTypeLabel = (routeType: number) => {
    switch(routeType) {
      case 3: return 'Bus Routes';
      case 0: return 'Tram Routes';
      case 1: return 'Subway Routes';
      case 2: return 'Rail Routes';
      default: return 'Other Routes';
    }
  };

  const getRouteTypeIcon = (routeType: number) => {
    switch(routeType) {
      case 3: return FaBus;
      case 0: return FaRoute;
      case 1: return FaRoute;
      case 2: return FaRoute;
      default: return FaRoute;
    }
  };

  if (loading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="lg" />
        <Text mt={4}>Loading statistics...</Text>
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box textAlign="center" py={8} color="red.500">
        <Text>Failed to load route statistics</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text fontSize="xl" fontWeight="bold" mb={4} color="gray.700">
        Transit Network Statistics
      </Text>
      
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap={4}>
        {/* Total Routes */}
        <Box
          p={4}
          bg={bgColor}
          borderRadius="lg"
          borderWidth="1px"
          borderColor={borderColor}
          borderLeftWidth="4px"
          borderLeftColor="blue.500"
        >
          <Stat>
            <Flex align="center" mb={2}>
              <Icon as={FaRoute} color="blue.500" mr={2} />
              <StatLabel fontSize="sm" color="gray.600">Total Routes</StatLabel>
            </Flex>
            <StatNumber fontSize="2xl" color="blue.600">
              {stats.totalRoutes}
            </StatNumber>
            <StatHelpText fontSize="xs">
              Active bus routes
            </StatHelpText>
          </Stat>
        </Box>

        {/* Total Stops */}
        <Box
          p={4}
          bg={bgColor}
          borderRadius="lg"
          borderWidth="1px"
          borderColor={borderColor}
          borderLeftWidth="4px"
          borderLeftColor="green.500"
        >
          <Stat>
            <Flex align="center" mb={2}>
              <Icon as={FaMapMarkerAlt} color="green.500" mr={2} />
              <StatLabel fontSize="sm" color="gray.600">Total Stops</StatLabel>
            </Flex>
            <StatNumber fontSize="2xl" color="green.600">
              {stats.totalStops}
            </StatNumber>
            <StatHelpText fontSize="xs">
              Bus stop locations
            </StatHelpText>
          </Stat>
        </Box>

        {/* Average Stops per Route */}
        <Box
          p={4}
          bg={bgColor}
          borderRadius="lg"
          borderWidth="1px"
          borderColor={borderColor}
          borderLeftWidth="4px"
          borderLeftColor="purple.500"
        >
          <Stat>
            <Flex align="center" mb={2}>
              <Icon as={FaClock} color="purple.500" mr={2} />
              <StatLabel fontSize="sm" color="gray.600">Avg Stops/Route</StatLabel>
            </Flex>
            <StatNumber fontSize="2xl" color="purple.600">
              {stats.averageStopsPerRoute}
            </StatNumber>
            <StatHelpText fontSize="xs">
              Network coverage
            </StatHelpText>
          </Stat>
        </Box>

        {/* Route Types */}
        <Box
          p={4}
          bg={bgColor}
          borderRadius="lg"
          borderWidth="1px"
          borderColor={borderColor}
          borderLeftWidth="4px"
          borderLeftColor="orange.500"
        >
          <Stat>
            <Flex align="center" mb={2}>
              <Icon as={FaBus} color="orange.500" mr={2} />
              <StatLabel fontSize="sm" color="gray.600">Service Types</StatLabel>
            </Flex>
            {Object.entries(stats.routeTypes).map(([routeType, count]) => (
              <Box key={routeType} mb={1}>
                <Text fontSize="sm" color="gray.700">
                  {getRouteTypeLabel(Number(routeType))}: {count}
                </Text>
              </Box>
            ))}
          </Stat>
        </Box>
      </Grid>
    </Box>
  );
};

export default RouteStats;
