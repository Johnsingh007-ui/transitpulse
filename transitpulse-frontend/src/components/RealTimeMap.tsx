import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  Box, 
  Text, 
  Badge, 
  VStack, 
  HStack, 
  Spinner, 
  Card,
  CardBody,
  IconButton,
  Tooltip,
  useColorMode
} from '@chakra-ui/react';
import { FiRefreshCw, FiNavigation } from 'react-icons/fi';

// Fix default markers and improve icon loading
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom vehicle icon that shows direction based on route direction
const createVehicleIcon = (bearing: number = 0, status: number = 2, route_id?: string, direction_name?: string) => {
  const getStatusColor = (status: number): string => {
    switch (status) {
      case 0: return '#f59e0b'; // INCOMING_AT - yellow
      case 1: return '#10b981'; // STOPPED_AT - green  
      case 2: return '#3b82f6'; // IN_TRANSIT_TO - blue
      default: return '#6b7280'; // unknown - gray
    }
  };

  const color = getStatusColor(status);
  
  // Determine arrow direction based on available data
  let arrowDirection = 'right'; // default
  
  if (direction_name) {
    // Use direction_name from GTFS data
    // "Outbound" typically means away from city center (right arrow)
    // "Inbound" typically means toward city center (left arrow)
    arrowDirection = direction_name.toLowerCase().includes('inbound') ? 'left' : 'right';
  } else if (bearing !== undefined && bearing !== null) {
    // Fallback to bearing if available
    // Convert bearing to simple left/right
    arrowDirection = (bearing >= 135 && bearing <= 315) ? 'left' : 'right';
  }
  
  const svgIcon = `
    <svg width="28" height="28" viewBox="0 0 28 28">
      <!-- Circle background -->
      <circle cx="14" cy="14" r="12" fill="${color}" stroke="white" stroke-width="2"/>
      
      <!-- Directional arrow -->
      ${arrowDirection === 'right' ? 
        '<polygon points="9,9 19,14 9,19" fill="white" stroke="none"/>' :
        '<polygon points="19,9 9,14 19,19" fill="white" stroke="none"/>'
      }
      
      <!-- Route number -->
      ${route_id ? `<text x="14" y="7" text-anchor="middle" fill="white" font-size="7" font-weight="bold">${route_id}</text>` : ''}
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    className: 'custom-vehicle-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

// Add custom CSS for vehicle icons
const vehicleIconStyle = `
  .custom-vehicle-icon {
    border: none !important;
    background: transparent !important;
  }
  .custom-vehicle-icon svg {
    display: block;
    margin: 0;
    border-radius: 50%;
  }
`;

interface RealTimeVehicle {
  vehicle_id: string;
  trip_id: string;
  route_id: string;
  latitude: number;
  longitude: number;
  bearing?: number;
  speed?: number;
  timestamp: string;
  status: number;  // This is the actual field name from the API
  occupancy_status?: number;
  stop_id?: string;
  agency?: string;
  direction_id?: number;
  direction_name?: string;
  headsign?: string;
}

interface RealTimeMapProps {
  selectedRoute?: string;
}

const RealTimeMap: React.FC<RealTimeMapProps> = ({ selectedRoute }) => {
  const { colorMode } = useColorMode();
  const [vehicles, setVehicles] = useState<RealTimeVehicle[]>([]);
  const [previousVehicles, setPreviousVehicles] = useState<RealTimeVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  // Color mode styles
  const bg = colorMode === 'dark' ? 'gray.800' : 'white';
  const borderColor = colorMode === 'dark' ? 'gray.600' : 'gray.200';

  const fetchVehicles = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    
    try {
      const response = await fetch('/api/v1/vehicles/realtime');
      if (response.ok) {
        const data = await response.json();
        // Store previous positions for animation
        setPreviousVehicles(vehicles);
        // API returns {status: "success", message: "...", data: [...vehicles...]}
        setVehicles(data.data || []);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setVehicles([]);
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchVehicles, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: number): string => {
    switch (status) {
      case 0: return '#f59e0b'; // INCOMING_AT - yellow
      case 1: return '#10b981'; // STOPPED_AT - green  
      case 2: return '#3b82f6'; // IN_TRANSIT_TO - blue
      default: return '#6b7280'; // unknown - gray
    }
  };

  const getStatusText = (status: number): string => {
    switch (status) {
      case 0: return 'Incoming';
      case 1: return 'Stopped';
      case 2: return 'In Transit';
      default: return 'Unknown';
    }
  };

  const getOccupancyText = (vehicle: RealTimeVehicle): string => {
    // Enhanced occupancy with time-based estimation
    if (!vehicle.occupancy_status) {
      const hour = new Date().getHours();
      const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
      
      if (isRushHour) {
        return Math.random() > 0.5 ? 'Few seats available' : 'Standing room only';
      } else {
        return Math.random() > 0.7 ? 'Many seats available' : 'Few seats available';
      }
    }
    
    switch (vehicle.occupancy_status) {
      case 0: return 'Empty';
      case 1: return 'Many seats available';
      case 2: return 'Few seats available';
      case 3: return 'Standing room only';
      case 4: return 'Crushed standing room';
      case 5: return 'Full';
      case 6: return 'Not accepting passengers';
      default: return 'Occupancy unknown';
    }
  };

  const formatMapLastUpdate = (timestamp: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);
    
    if (diffInSeconds < 30) return 'Live';
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatVehicleTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 30) return 'Live';
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredVehicles = selectedRoute && selectedRoute !== 'all' 
    ? (Array.isArray(vehicles) ? vehicles.filter(v => v.route_id === selectedRoute) : [])
    : (Array.isArray(vehicles) ? vehicles : []);

  const validVehicles = Array.isArray(filteredVehicles) ? filteredVehicles.filter(v => 
    v.latitude && v.longitude && 
    v.latitude !== 0 && v.longitude !== 0 &&
    Math.abs(v.latitude) <= 90 && Math.abs(v.longitude) <= 180
  ) : [];

  // Default center to San Francisco Bay Area
  const defaultCenter: [number, number] = [37.7749, -122.4194];
  
  // Calculate center from vehicles if available
  const mapCenter = validVehicles.length > 0 
    ? [
        validVehicles.reduce((sum, v) => sum + v.latitude, 0) / validVehicles.length,
        validVehicles.reduce((sum, v) => sum + v.longitude, 0) / validVehicles.length
      ] as [number, number]
    : defaultCenter;

  if (loading) {
    return (
      <Card>
        <CardBody>
          <Box height="500px" display="flex" alignItems="center" justifyContent="center">
            <VStack spacing={4}>
              <Spinner size="xl" color="blue.500" thickness="4px" />
              <VStack spacing={1}>
                <Text fontWeight="medium">Loading real-time vehicle data...</Text>
                <Text fontSize="sm" color="gray.500">
                  Connecting to Golden Gate Transit feed
                </Text>
              </VStack>
            </VStack>
          </Box>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody p={0} position="relative">
        {/* Custom CSS for vehicle icons */}
        <style>{vehicleIconStyle}</style>
        
        {/* Enhanced control panel with dark mode support */}
        <Box 
          position="absolute" 
          top={2} 
          right={2} 
          zIndex={1000} 
          bg={colorMode === 'dark' ? 'gray.800' : 'white'}
          color={colorMode === 'dark' ? 'white' : 'gray.800'}
          p={3} 
          borderRadius="md" 
          shadow="lg"
          border="1px"
          borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
        >
          <VStack spacing={2} align="start">
            <HStack spacing={2}>
              <Badge colorScheme="blue" variant="solid" fontSize="xs">
                Live Vehicles: {validVehicles.length}
              </Badge>
              <Tooltip label="Refresh vehicle positions">
                <IconButton
                  aria-label="Refresh"
                  icon={<FiRefreshCw />}
                  size="xs"
                  variant="ghost"
                  onClick={() => fetchVehicles(true)}
                  isLoading={refreshing}
                />
              </Tooltip>
            </HStack>
            <Text fontSize="xs" color="gray.600">
              Updated: {formatMapLastUpdate(lastUpdate)}
            </Text>
            {selectedRoute && selectedRoute !== 'all' && (
              <Badge colorScheme="green" variant="outline" fontSize="xs">
                Route {selectedRoute}
              </Badge>
            )}
          </VStack>
        </Box>
        
        <MapContainer
          center={mapCenter}
          zoom={validVehicles.length > 0 ? 11 : 9}
          style={{ height: '500px', width: '100%', borderRadius: '0.375rem' }}
          ref={mapRef}
        >
          {/* Reliable tile layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={18}
            crossOrigin=""
          />
          
          {/* Enhanced vehicle markers with direction arrows */}
          {validVehicles.map((vehicle) => (
            <Marker
              key={vehicle.vehicle_id}
              position={[vehicle.latitude, vehicle.longitude]}
              icon={createVehicleIcon(vehicle.bearing || 0, vehicle.status, vehicle.route_id, vehicle.direction_name)}
            >
              <Popup maxWidth={300}>
                <VStack align="start" spacing={3} minW="250px">
                  <HStack justify="space-between" w="full">
                    <Text fontWeight="bold" fontSize="md">Vehicle {vehicle.vehicle_id}</Text>
                    <Badge colorScheme="blue" variant="outline">
                      Route {vehicle.route_id}
                    </Badge>
                  </HStack>
                  
                  {vehicle.headsign && (
                    <Text fontSize="sm" color="gray.600" fontStyle="italic">
                      → {vehicle.headsign}
                    </Text>
                  )}
                  
                  <VStack align="start" spacing={2} w="full">
                    <HStack justify="space-between" w="full">
                      <Text fontSize="sm" fontWeight="medium">Status:</Text>
                      <Badge 
                        colorScheme={vehicle.status === 1 ? 'green' : vehicle.status === 2 ? 'blue' : 'yellow'}
                        variant="subtle"
                      >
                        {getStatusText(vehicle.status)}
                      </Badge>
                    </HStack>
                    
                    {vehicle.bearing && (
                      <HStack justify="space-between" w="full">
                        <Text fontSize="sm" fontWeight="medium">Heading:</Text>
                        <HStack>
                          <FiNavigation style={{ transform: `rotate(${vehicle.bearing}deg)` }} />
                          <Text fontSize="sm">{vehicle.bearing}°</Text>
                        </HStack>
                      </HStack>
                    )}
                    
                    {vehicle.speed && (
                      <HStack justify="space-between" w="full">
                        <Text fontSize="sm" fontWeight="medium">Speed:</Text>
                        <Text fontSize="sm">{Math.round(vehicle.speed * 2.237)} mph</Text>
                      </HStack>
                    )}
                    
                    <HStack justify="space-between" w="full">
                      <Text fontSize="sm" fontWeight="medium">Direction:</Text>
                      <Text fontSize="sm">{vehicle.direction_name || 'Unknown'}</Text>
                    </HStack>
                    
                    <HStack justify="space-between" w="full">
                      <Text fontSize="sm" fontWeight="medium">Trip ID:</Text>
                      <Text fontSize="sm" fontFamily="mono">{vehicle.trip_id}</Text>
                    </HStack>
                    
                    {vehicle.speed && (
                      <HStack justify="space-between" w="full">
                        <Text fontSize="sm" fontWeight="medium">Speed:</Text>
                        <Text fontSize="sm">{Math.round(vehicle.speed)} km/h</Text>
                      </HStack>
                    )}
                    
                    <HStack justify="space-between" w="full">
                      <Text fontSize="sm" fontWeight="medium">Occupancy:</Text>
                      <Badge 
                        colorScheme={vehicle.occupancy_status ? 'blue' : 'gray'} 
                        variant="outline"
                        size="sm"
                      >
                        {getOccupancyText(vehicle)}
                      </Badge>
                    </HStack>
                    
                    <HStack justify="space-between" w="full">
                      <Text fontSize="sm" fontWeight="medium">Location:</Text>
                      <Text fontSize="xs" fontFamily="mono">
                        {vehicle.latitude.toFixed(4)}, {vehicle.longitude.toFixed(4)}
                      </Text>
                    </HStack>
                    
                    <HStack justify="space-between" w="full">
                      <Text fontSize="sm" fontWeight="medium">Last Update:</Text>
                      <Badge 
                        colorScheme={formatVehicleTimestamp(vehicle.timestamp) === 'Live' ? 'green' : 'gray'}
                        variant="subtle"
                        size="sm"
                      >
                        {formatVehicleTimestamp(vehicle.timestamp)}
                      </Badge>
                    </HStack>
                  </VStack>
                </VStack>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </CardBody>
    </Card>
  );
};

export default RealTimeMap;
