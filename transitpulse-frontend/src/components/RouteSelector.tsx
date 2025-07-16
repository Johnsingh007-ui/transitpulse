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
import { motion } from 'framer-motion';

const MotionButton = motion(Button);

interface RouteData {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  active_trips: number;
  on_time_percentage: number;
  average_delay: number;
}

interface RouteSelectorProps {
  routes: RouteData[];
  selectedRoute: string;
  onRouteChange: (routeId: string) => void;
}

const RouteSelector: React.FC<RouteSelectorProps> = ({
  routes,
  selectedRoute,
  onRouteChange
}) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

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
          <MotionButton
            size="md"
            variant={selectedRoute === 'all' ? 'solid' : 'outline'}
            colorScheme="blue"
            onClick={() => onRouteChange('all')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            leftIcon={<FiTruck />}
          >
            <Box textAlign="left">
              <Text fontWeight="bold">All Routes</Text>
              <Text fontSize="xs" opacity={0.8}>
                {routes.reduce((sum, route) => sum + route.active_trips, 0)} buses
              </Text>
            </Box>
          </MotionButton>

          {/* Individual Route Buttons */}
          {routes.map((route) => (
            <Tooltip
              key={route.route_id}
              label={`${route.route_long_name} - ${route.active_trips} active buses`}
              placement="top"
            >
              <MotionButton
                size="md"
                variant={selectedRoute === route.route_id ? 'solid' : 'outline'}
                colorScheme={getPerformanceColor(route.on_time_percentage)}
                onClick={() => onRouteChange(route.route_id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                position="relative"
                overflow="hidden"
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
              </MotionButton>
            </Tooltip>
          ))}
        </Flex>
      </CardBody>
    </Card>
  );
};

export default RouteSelector;
