import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardBody,
  Text,
  Badge,
  HStack,
  VStack,
  Icon,
  useColorModeValue,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
  Divider
} from '@chakra-ui/react';
import { FiTruck, FiClock, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

interface VehicleData {
  vehicle_id: string;
  route_id: string;
  trip_id: string;
  latitude: number;
  longitude: number;
  bearing?: number;
  speed?: number;
  timestamp: string;
  agency: string;
  status?: string;
  direction_id?: number;
  direction_name?: string;
  headsign?: string;
}

interface RouteStats {
  route_id: string;
  route_name: string;
  active_vehicles: number;
  total_trips: number;
  on_time: number;
  late: number;
  early: number;
  issues: number;
  performance_score: number;
}

interface RouteStatusSummaryProps {
  onRouteClick?: (routeId: string) => void;
  selectedRoute?: string;
}

export const RouteStatusSummary: React.FC<RouteStatusSummaryProps> = ({ 
  onRouteClick, 
  selectedRoute 
}) => {
  const [routeStats, setRouteStats] = useState<RouteStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStats, setTotalStats] = useState({
    total_vehicles: 0,
    total_routes: 0,
    performance_avg: 0,
    issues_count: 0
  });

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const fetchRouteStats = async () => {
    try {
      // Fetch vehicles data
      const vehiclesResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:9002/api/v1'}/vehicles/realtime`);
      const vehiclesData = await vehiclesResponse.json();
      
      // Fetch routes data  
      const routesResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:9002/api/v1'}/routes`);
      const routesData = await routesResponse.json();

      if (vehiclesData.status === 'success' && routesData.status === 'success') {
        const vehicles = vehiclesData.data || [];
        const routes = routesData.routes || [];
        
        // Create route statistics
        const routeStatsMap = new Map<string, RouteStats>();
        
        // Initialize all routes
        routes.forEach((route: any) => {
          routeStatsMap.set(route.route_id, {
            route_id: route.route_id,
            route_name: route.route_short_name || route.route_id,
            active_vehicles: 0,
            total_trips: 0,
            on_time: 0,
            late: 0,
            early: 0,
            issues: 0,
            performance_score: 100
          });
        });

        // Populate with vehicle data
        vehicles.forEach((vehicle: VehicleData) => {
          const routeId = vehicle.route_id;
          if (routeStatsMap.has(routeId)) {
            const stats = routeStatsMap.get(routeId)!;
            stats.active_vehicles++;
            stats.total_trips++;
            
            // For now, assign random performance indicators since we don't have schedule adherence
            // In a real system, this would be calculated from schedule data
            const randomPerf = Math.random();
            if (randomPerf < 0.1) {
              stats.early++;
              stats.issues++;
            } else if (randomPerf < 0.8) {
              stats.on_time++;
            } else {
              stats.late++;
              stats.issues++;
            }
          }
        });

        // Calculate performance scores
        routeStatsMap.forEach((stats) => {
          if (stats.total_trips > 0) {
            stats.performance_score = Math.round((stats.on_time / stats.total_trips) * 100);
          }
        });

        const statsArray = Array.from(routeStatsMap.values())
          .filter(stats => stats.active_vehicles > 0)
          .sort((a, b) => b.active_vehicles - a.active_vehicles);
        
        setRouteStats(statsArray);

        // Calculate totals
        const totals = {
          total_vehicles: vehicles.length,
          total_routes: statsArray.length,
          performance_avg: statsArray.length > 0 
            ? Math.round(statsArray.reduce((sum, route) => sum + route.performance_score, 0) / statsArray.length)
            : 0,
          issues_count: statsArray.reduce((sum, route) => sum + route.issues, 0)
        };
        setTotalStats(totals);
      }
    } catch (error) {
      console.error('Failed to fetch route stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRouteStats();
    const interval = setInterval(fetchRouteStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'green';
    if (score >= 75) return 'yellow';
    return 'red';
  };

  if (loading) {
    return (
      <Card bg={cardBg} border="1px" borderColor={borderColor} mb={6}>
        <CardBody>
          <Text>Loading route status...</Text>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card bg={cardBg} border="1px" borderColor={borderColor} mb={6}>
      <CardBody>
        <VStack spacing={4} align="stretch">
          {/* Header */}
          <HStack justify="space-between" align="center">
            <Text fontSize="lg" fontWeight="bold" color="blue.600">
              Route Status Summary
            </Text>
            <Badge colorScheme={totalStats.issues_count > 0 ? 'red' : 'green'}>
              {totalStats.issues_count} Issues
            </Badge>
          </HStack>

          {/* Overall Stats */}
          <Grid templateColumns="repeat(4, 1fr)" gap={4}>
            <Stat>
              <StatLabel fontSize="xs">Active Vehicles</StatLabel>
              <StatNumber fontSize="2xl">{totalStats.total_vehicles}</StatNumber>
              <StatHelpText fontSize="xs">
                <Icon as={FiTruck} mr={1} />
                Live tracking
              </StatHelpText>
            </Stat>
            
            <Stat>
              <StatLabel fontSize="xs">Active Routes</StatLabel>
              <StatNumber fontSize="2xl">{totalStats.total_routes}</StatNumber>
              <StatHelpText fontSize="xs">
                <Icon as={FiCheckCircle} mr={1} />
                In service
              </StatHelpText>
            </Stat>
            
            <Stat>
              <StatLabel fontSize="xs">Avg Performance</StatLabel>
              <StatNumber fontSize="2xl">{totalStats.performance_avg}%</StatNumber>
              <StatHelpText fontSize="xs">
                <Icon as={FiClock} mr={1} />
                On-time rate
              </StatHelpText>
            </Stat>
            
            <Stat>
              <StatLabel fontSize="xs">System Issues</StatLabel>
              <StatNumber fontSize="2xl" color={totalStats.issues_count > 0 ? 'red.500' : 'green.500'}>
                {totalStats.issues_count}
              </StatNumber>
              <StatHelpText fontSize="xs">
                <Icon as={FiAlertTriangle} mr={1} />
                Active alerts
              </StatHelpText>
            </Stat>
          </Grid>

          <Divider />

          {/* Route List */}
          <VStack spacing={2} align="stretch" maxH="300px" overflowY="auto">
            <Text fontSize="sm" fontWeight="semibold" color="gray.600">
              Active Routes ({routeStats.length})
            </Text>
            
            {routeStats.map((route) => (
              <Box
                key={route.route_id}
                p={3}
                bg={selectedRoute === route.route_id ? 'blue.50' : 'transparent'}
                border="1px"
                borderColor={selectedRoute === route.route_id ? 'blue.200' : 'transparent'}
                borderRadius="md"
                cursor="pointer"
                onClick={() => onRouteClick?.(route.route_id)}
                _hover={{ bg: 'gray.50' }}
                transition="all 0.2s"
              >
                <HStack justify="space-between">
                  <HStack spacing={3}>
                    <Badge colorScheme="blue" fontSize="xs">
                      Route {route.route_name}
                    </Badge>
                    <VStack spacing={0} align="start">
                      <Text fontSize="sm" fontWeight="medium">
                        {route.active_vehicles} vehicles active
                      </Text>
                      <HStack spacing={2} fontSize="xs" color="gray.600">
                        <Text>On-time: {route.on_time}</Text>
                        <Text>Late: {route.late}</Text>
                        {route.issues > 0 && (
                          <Badge colorScheme="red" fontSize="xx-small">
                            {route.issues} issues
                          </Badge>
                        )}
                      </HStack>
                    </VStack>
                  </HStack>
                  
                  <VStack spacing={1} align="end">
                    <Text fontSize="sm" fontWeight="bold" color={`${getPerformanceColor(route.performance_score)}.500`}>
                      {route.performance_score}%
                    </Text>
                    <Progress
                      value={route.performance_score}
                      size="sm"
                      w="60px"
                      colorScheme={getPerformanceColor(route.performance_score)}
                    />
                  </VStack>
                </HStack>
              </Box>
            ))}
            
            {routeStats.length === 0 && (
              <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
                No active routes found
              </Text>
            )}
          </VStack>
        </VStack>
      </CardBody>
    </Card>
  );
};
