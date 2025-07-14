import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Box, Text, Badge, VStack, HStack, Spinner } from '@chakra-ui/react';

// Fix default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
  const [vehicles, setVehicles] = useState<RealTimeVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/v1/vehicles/realtime');
      if (response.ok) {
        const data = await response.json();
        // API returns {status: "success", message: "...", data: [...vehicles...]}
        setVehicles(data.data || []);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setVehicles([]);
    } finally {
      setLoading(false);
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

  const getOccupancyText = (occupancyStatus?: number): string => {
    if (!occupancyStatus) return 'Unknown';
    
    switch (occupancyStatus) {
      case 0: return 'Empty';
      case 1: return 'Many seats available';
      case 2: return 'Few seats available';
      case 3: return 'Standing room only';
      case 4: return 'Crushed standing room';
      case 5: return 'Full';
      case 6: return 'Not accepting passengers';
      default: return 'Unknown';
    }
  };

  const createVehicleIcon = (status: number) => {
    const color = getStatusColor(status);
    
    return L.divIcon({
      html: `
        <div style="
          background-color: ${color};
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: white;
          font-weight: bold;
        ">
          🚌
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      className: 'vehicle-marker'
    });
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

  const formatLastUpdate = (timestamp: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    return `${Math.floor(diffInSeconds / 3600)}h ago`;
  };

  if (loading) {
    return (
      <Box height="400px" display="flex" alignItems="center" justifyContent="center">
        <VStack>
          <Spinner size="lg" />
          <Text>Loading real-time vehicle data...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box position="relative">
      <Box position="absolute" top={2} right={2} zIndex={1000} bg="white" p={2} borderRadius="md" shadow="md">
        <VStack spacing={1} align="start">
          <Text fontSize="xs" fontWeight="bold">Live Vehicles: {validVehicles.length}</Text>
          <Text fontSize="xs" color="gray.600">Updated: {formatLastUpdate(lastUpdate)}</Text>
        </VStack>
      </Box>
      
      <MapContainer
        center={mapCenter}
        zoom={validVehicles.length > 0 ? 11 : 9}
        style={{ height: '400px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {validVehicles.map((vehicle) => (
          <Marker
            key={vehicle.vehicle_id}
            position={[vehicle.latitude, vehicle.longitude]}
            icon={createVehicleIcon(vehicle.status)}
          >
            <Popup>
              <VStack align="start" spacing={2} minW="200px">
                <HStack justify="space-between" w="full">
                  <Text fontWeight="bold">Vehicle {vehicle.vehicle_id}</Text>
                  <Badge colorScheme="blue" variant="outline">
                    Route {vehicle.route_id}
                  </Badge>
                </HStack>
                
                <VStack align="start" spacing={1} w="full">
                  <HStack>
                    <Text fontSize="sm" fontWeight="medium">Status:</Text>
                    <Badge 
                      colorScheme={vehicle.status === 1 ? 'green' : vehicle.status === 2 ? 'blue' : 'yellow'}
                      variant="subtle"
                    >
                      {getStatusText(vehicle.status)}
                    </Badge>
                  </HStack>
                  
                  <HStack>
                    <Text fontSize="sm" fontWeight="medium">Trip:</Text>
                    <Text fontSize="sm" fontFamily="mono">{vehicle.trip_id}</Text>
                  </HStack>
                  
                  {vehicle.speed && (
                    <HStack>
                      <Text fontSize="sm" fontWeight="medium">Speed:</Text>
                      <Text fontSize="sm">{Math.round(vehicle.speed)} km/h</Text>
                    </HStack>
                  )}
                  
                  <HStack>
                    <Text fontSize="sm" fontWeight="medium">Occupancy:</Text>
                    <Text fontSize="sm">{getOccupancyText(vehicle.occupancy_status)}</Text>
                  </HStack>
                  
                  <HStack>
                    <Text fontSize="sm" fontWeight="medium">Location:</Text>
                    <Text fontSize="xs" fontFamily="mono">
                      {vehicle.latitude.toFixed(4)}, {vehicle.longitude.toFixed(4)}
                    </Text>
                  </HStack>
                  
                  <Text fontSize="xs" color="gray.500">
                    Last updated: {formatLastUpdate(new Date(vehicle.timestamp))}
                  </Text>
                </VStack>
              </VStack>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </Box>
  );
};

export default RealTimeMap;
