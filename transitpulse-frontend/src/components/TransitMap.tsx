import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  Box, 
  VStack, 
  HStack, 
  Text, 
  Badge, 
  Spinner, 
  Alert, 
  AlertIcon,
  Button,
  Select,
  Checkbox,
  Switch,
  FormControl,
  FormLabel,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup
} from '@chakra-ui/react';
import { getRoutes } from '../api/apiClient';
import type { Route } from '../types';

// Vehicle interface matching the API response
interface Vehicle {
  vehicle_id: string;
  route_id: string;
  trip_id: string;
  latitude: number;
  longitude: number;
  bearing?: number | null;
  speed?: number | null;
  timestamp: string;
  agency: string;
  status: number;
}

// Fix Leaflet default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom bus icon
const createBusIcon = (routeColor: string = '#3366FF', status: number = 1) => {
  const color = status === 1 ? routeColor : '#808080';
  return new L.DivIcon({
    className: 'custom-bus-marker',
    html: `
      <div style="
        background: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        color: white;
        font-weight: bold;
      ">🚌</div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

interface TransitMapProps {
  selectedRouteId?: string | null;
}

// Map bounds for San Francisco Bay Area
const DEFAULT_CENTER: [number, number] = [37.8651, -122.2585];
const DEFAULT_ZOOM = 10;

// Component to update map view when route is selected
function MapController({ vehicles, selectedRouteId }: { vehicles: Vehicle[], selectedRouteId?: string | null }) {
  const map = useMap();

  useEffect(() => {
    if (selectedRouteId && vehicles.length > 0) {
      const routeVehicles = vehicles.filter(v => v.route_id === selectedRouteId);
      if (routeVehicles.length > 0) {
        const bounds = L.latLngBounds(
          routeVehicles.map(v => [v.latitude, v.longitude])
        );
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [map, vehicles, selectedRouteId]);

  return null;
}

const TransitMap: React.FC<TransitMapProps> = ({ selectedRouteId }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch routes data
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const routesData = await getRoutes();
        setRoutes(routesData);
      } catch (err) {
        console.error('Failed to load routes:', err);
      }
    };
    fetchRoutes();
  }, []);

  // Fetch vehicle data
  const fetchVehicles = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/vehicles/realtime');
      const data = await response.json();
      
      if (data.status === 'success' && data.data) {
        setVehicles(data.data);
        setLastUpdate(new Date());
        setError(null);
      } else {
        throw new Error(data.message || 'Failed to fetch vehicles');
      }
    } catch (err) {
      console.error('Failed to load vehicles:', err);
      setError('Failed to load live vehicle data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and auto-refresh
  useEffect(() => {
    fetchVehicles();
    
    if (autoRefresh) {
      const interval = setInterval(fetchVehicles, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [fetchVehicles, autoRefresh]);

  // Filter vehicles based on selected route
  const displayVehicles = selectedRouteId 
    ? vehicles.filter(v => v.route_id === selectedRouteId)
    : vehicles;

  // Filter routes for display
  const displayRoutes = selectedRouteId
    ? routes.filter(r => r.route_id === selectedRouteId)
    : showAllRoutes ? routes : [];

  // Get route info for selected route
  const selectedRoute = selectedRouteId ? routes.find(r => r.route_id === selectedRouteId) : null;

  // Group vehicles by route for stats
  const vehiclesByRoute = vehicles.reduce((acc, vehicle) => {
    acc[vehicle.route_id] = (acc[vehicle.route_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading && vehicles.length === 0) {
    return (
      <Box h="full" display="flex" alignItems="center" justifyContent="center">
        <VStack>
          <Spinner size="xl" color="blue.500" />
          <Text>Loading live vehicle data...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box h="full" position="relative">
      {/* Map Controls */}
      <Box
        position="absolute"
        top={4}
        left={4}
        zIndex={1000}
        bg="white"
        p={3}
        borderRadius="md"
        boxShadow="md"
        minW="250px"
      >
        <VStack align="stretch" spacing={3}>
          <HStack justify="space-between">
            <Text fontWeight="bold" fontSize="sm">Live Transit Map</Text>
            <Badge colorScheme={vehicles.length > 0 ? "green" : "red"}>
              {vehicles.length} vehicles
            </Badge>
          </HStack>

          {selectedRoute && (
            <Box p={2} bg="blue.50" borderRadius="md">
              <Text fontSize="sm" fontWeight="semibold" color="blue.700">
                Route {selectedRoute.route_short_name}
              </Text>
              <Text fontSize="xs" color="blue.600">
                {selectedRoute.route_long_name}
              </Text>
              <Badge colorScheme="blue" size="sm">
                {displayVehicles.length} vehicles
              </Badge>
            </Box>
          )}

          <FormControl display="flex" alignItems="center">
            <FormLabel htmlFor="auto-refresh" mb="0" fontSize="sm">
              Auto-refresh
            </FormLabel>
            <Switch
              id="auto-refresh"
              isChecked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              size="sm"
            />
          </FormControl>

          {!selectedRouteId && (
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="show-routes" mb="0" fontSize="sm">
                Show routes
              </FormLabel>
              <Switch
                id="show-routes"
                isChecked={showAllRoutes}
                onChange={(e) => setShowAllRoutes(e.target.checked)}
                size="sm"
              />
            </FormControl>
          )}

          {lastUpdate && (
            <Text fontSize="xs" color="gray.500">
              Last update: {lastUpdate.toLocaleTimeString()}
            </Text>
          )}

          <Button size="xs" onClick={fetchVehicles} isLoading={loading}>
            Refresh Now
          </Button>
        </VStack>
      </Box>

      {/* Stats Panel */}
      {!selectedRouteId && (
        <Box
          position="absolute"
          top={4}
          right={4}
          zIndex={1000}
          bg="white"
          p={3}
          borderRadius="md"
          boxShadow="md"
          minW="200px"
        >
          <StatGroup size="sm">
            <Stat>
              <StatLabel fontSize="xs">Active Routes</StatLabel>
              <StatNumber fontSize="lg">{Object.keys(vehiclesByRoute).length}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel fontSize="xs">Live Vehicles</StatLabel>
              <StatNumber fontSize="lg">{vehicles.length}</StatNumber>
            </Stat>
          </StatGroup>
        </Box>
      )}

      {error && (
        <Alert status="error" position="absolute" top={4} left={4} right={4} zIndex={1000}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      {/* Map */}
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController vehicles={displayVehicles} selectedRouteId={selectedRouteId} />

        {/* Vehicle Markers */}
        {displayVehicles.map((vehicle) => {
          const route = routes.find(r => r.route_id === vehicle.route_id);
          const routeColor = route?.route_color ? `#${route.route_color}` : '#3366FF';
          
          return (
            <Marker
              key={vehicle.vehicle_id}
              position={[vehicle.latitude, vehicle.longitude]}
              icon={createBusIcon(routeColor, vehicle.status)}
            >
              <Popup>
                <VStack align="start" spacing={1}>
                  <Text fontWeight="bold">
                    Route {vehicle.route_id} - Bus #{vehicle.vehicle_id}
                  </Text>
                  {route && (
                    <Text fontSize="sm" color="gray.600">
                      {route.route_long_name}
                    </Text>
                  )}
                  <Text fontSize="xs">
                    Status: {vehicle.status === 1 ? "In Transit" : "Stopped"}
                  </Text>
                  <Text fontSize="xs">
                    Last update: {new Date(vehicle.timestamp).toLocaleTimeString()}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    Lat: {vehicle.latitude.toFixed(4)}, Lng: {vehicle.longitude.toFixed(4)}
                  </Text>
                </VStack>
              </Popup>
            </Marker>
          );
        })}

        {/* Route Shapes - if we have shape data */}
        {displayRoutes.map((route) => (
          route.shapes?.map((shape, shapeIdx) => (
            <Polyline
              key={`${route.route_id}-${shapeIdx}`}
              positions={shape}
              pathOptions={{
                color: route.route_color ? `#${route.route_color}` : '#3366FF',
                weight: 3,
                opacity: 0.7,
                lineJoin: 'round',
                lineCap: 'round',
              }}
            />
          ))
        ))}
      </MapContainer>
    </Box>
  );
};

export default TransitMap;
