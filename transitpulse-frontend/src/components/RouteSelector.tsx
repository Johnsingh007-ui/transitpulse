import React from 'react';
import {
  Card,
  CardBody,
  Flex,
  HStack,
  Button,
  Text,
  Badge,
  useColorModeValue,
  Box,
  Icon,
  Tooltip
} from '@chakra-ui/react';
import { FiMap, FiTruck, FiActivity } from 'react-icons/fi';
// Removed framer-motion to fix deprecation warnings

interface RouteData {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  active_trips: number;
  on_time_percentage: number;
  average_delay: number;
}

interface RouteSelectorProps {
  selectedRoute: string | null;
  onRouteChange: (routeId: string | null) => void;
  selectedAgency: string;
}

const RouteSelector: React.FC<RouteSelectorProps> = ({
  selectedRoute,
  onRouteChange,
  selectedAgency
}) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Mock routes data for now
  const routes: RouteData[] = [
    { route_id: '101', route_short_name: '101', route_long_name: 'San Rafael Transit Center - Larkspur Landing', active_trips: 12, on_time_percentage: 89, average_delay: 3 },
    { route_id: '4', route_short_name: '4', route_long_name: 'San Francisco - Sausalito', active_trips: 8, on_time_percentage: 92, average_delay: 1 },
    { route_id: '10', route_short_name: '10', route_long_name: 'San Rafael - Novato', active_trips: 6, on_time_percentage: 85, average_delay: 4 }
  ];

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 90) return 'green';
    if (percentage >= 80) return 'yellow';
    return 'red';
  };

  return (
    <Card bg={cardBg} borderColor={borderColor}>
      <CardBody>
        <Flex justify="space-between" align="center" mb={4}>
          <HStack spacing={2}>
            <Icon as={FiMap} color="blue.500" />
            <Text fontWeight="bold" fontSize="lg">
              Route Operations
            </Text>
          </HStack>
          <Badge colorScheme="blue" variant="subtle">
            {routes.length} Routes Active
          </Badge>
        </Flex>

        <Flex wrap="wrap" gap={3}>
          {/* All Routes Button */}
          <Button
            size="md"
            variant={selectedRoute === 'all' ? 'solid' : 'outline'}
            colorScheme="blue"
            onClick={() => onRouteChange('all')}
            leftIcon={<FiTruck />}
            _hover={{
              transform: 'scale(1.02)',
            }}
            _active={{
              transform: 'scale(0.98)',
            }}
            transition="all 0.2s"
          >
            <Box textAlign="left">
              <Text fontWeight="bold">All Routes</Text>
              <Text fontSize="xs" opacity={0.8}>
                {routes.reduce((sum, route) => sum + route.active_trips, 0)} buses
              </Text>
            </Box>
          </Button>

          {/* Individual Route Buttons */}
          {routes.map((route) => (
            <Tooltip
              key={route.route_id}
              label={`${route.route_long_name} - ${route.active_trips} active buses`}
              placement="top"
            >
              <Button
                size="md"
                variant={selectedRoute === route.route_id ? 'solid' : 'outline'}
                colorScheme={getPerformanceColor(route.on_time_percentage)}
                onClick={() => onRouteChange(route.route_id)}
                position="relative"
                overflow="hidden"
                _hover={{
                  transform: 'scale(1.02)',
                }}
                _active={{
                  transform: 'scale(0.98)',
                }}
                transition="all 0.2s"
              >
                <Box textAlign="left">
                  <HStack spacing={2}>
                    <Text fontWeight="bold" fontSize="lg">
                      {route.route_short_name}
                    </Text>
                    <Badge
                      size="sm"
                      colorScheme={getPerformanceColor(route.on_time_percentage)}
                      variant="subtle"
                    >
                      {route.on_time_percentage.toFixed(0)}%
                    </Badge>
                  </HStack>
                  <HStack spacing={3} fontSize="xs">
                    <HStack spacing={1}>
                      <Icon as={FiTruck} />
                      <Text>{route.active_trips}</Text>
                    </HStack>
                    <HStack spacing={1}>
                      <Icon as={FiActivity} />
                      <Text>{route.on_time_percentage.toFixed(0)}%</Text>
                    </HStack>
                  </HStack>
                </Box>

                {/* Performance indicator bar */}
                <Box
                  position="absolute"
                  bottom={0}
                  left={0}
                  height="2px"
                  width={`${route.on_time_percentage}%`}
                  bg={`${getPerformanceColor(route.on_time_percentage)}.400`}
                  transition="width 0.3s ease"
                />
              </Button>
            </Tooltip>
          ))}
        </Flex>
      </CardBody>
    </Card>
  );
};

export default RouteSelector;
