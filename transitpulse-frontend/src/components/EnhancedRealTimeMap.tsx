import React, { useEffect, useRef, useState } from 'react';
import { Box, VStack, HStack, Text, Badge, Card, CardBody, useColorModeValue } from '@chakra-ui/react';
// @ts-ignore
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet with Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Vehicle {
  vehicle_id: string;
  route_id: string;
  latitude: number;
  longitude: number;
  bearing?: number;
  speed?: number;
  timestamp: string;
  trip_id?: string;
  stop_id?: string;
  status?: 'early' | 'on-time' | 'late' | 'missing' | 'layover';
  scheduleAdherence?: number;
  headwayDeviation?: number;
  crowding?: 'low' | 'medium' | 'high';
  operator?: string;
}

interface EnhancedRealTimeMapProps {
  vehicles?: Vehicle[];
  showStops?: boolean;
  selectedVehicle?: string;
  onVehicleSelect?: (vehicleId: string) => void;
}

export const EnhancedRealTimeMap: React.FC<EnhancedRealTimeMapProps> = ({
  vehicles = [],
  showStops = true,
  selectedVehicle,
  onVehicleSelect,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const vehicleMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const [mapStats, setMapStats] = useState({
    totalVehicles: 0,
    routesVisible: 0,
    lastUpdate: new Date(),
  });

  const cardBg = useColorModeValue('white', 'gray.800');

  // Create custom vehicle icons based on status
  const createVehicleIcon = (vehicle: Vehicle) => {
    const getStatusColor = (status?: string) => {
      switch (status) {
        case 'early': return '#FF6B6B';
        case 'on-time': return '#51CF66';
        case 'late': return '#FFD93D';
        case 'missing': return '#868E96';
        case 'layover': return '#339AF0';
        default: return '#868E96';
      }
    };

    const color = getStatusColor(vehicle.status);
    const isSelected = selectedVehicle === vehicle.vehicle_id;
    const size = isSelected ? 28 : 20;
    const strokeWidth = isSelected ? 3 : 2;

    // Create SVG icon with rotation for bearing
    const rotation = vehicle.bearing || 0;
    const svgIcon = `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" style="transform: rotate(${rotation}deg);">
        <circle 
          cx="12" 
          cy="12" 
          r="9" 
          fill="${color}" 
          stroke="white" 
          stroke-width="${strokeWidth}"
        />
        <text 
          x="12" 
          y="16" 
          text-anchor="middle" 
          fill="white" 
          font-size="8" 
          font-weight="bold"
        >
          ${vehicle.route_id}
        </text>
        ${vehicle.bearing ? `
          <polygon 
            points="12,3 15,9 9,9" 
            fill="white" 
            opacity="0.8"
          />
        ` : ''}
      </svg>
    `;

    return L.divIcon({
      html: svgIcon,
      className: 'custom-vehicle-icon',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [37.7749, -122.4194], // San Francisco Bay Area
      zoom: 10,
      zoomControl: true,
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    // Add a more detailed tile layer for transit
    L.tileLayer('https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=YOUR_API_KEY', {
      attribution: '© Thunderforest, © OpenStreetMap contributors',
      maxZoom: 18,
      opacity: 0.7,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update vehicle markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    const existingMarkers = vehicleMarkersRef.current;

    // Remove markers for vehicles that no longer exist
    const currentVehicleIds = new Set(vehicles.map(v => v.vehicle_id));
    existingMarkers.forEach((marker, vehicleId) => {
      if (!currentVehicleIds.has(vehicleId)) {
        map.removeLayer(marker);
        existingMarkers.delete(vehicleId);
      }
    });

    // Add or update markers for current vehicles
    vehicles.forEach(vehicle => {
      const existingMarker = existingMarkers.get(vehicle.vehicle_id);
      const icon = createVehicleIcon(vehicle);
      const position: L.LatLngTuple = [vehicle.latitude, vehicle.longitude];

      if (existingMarker) {
        // Update existing marker
        existingMarker.setLatLng(position);
        existingMarker.setIcon(icon);
      } else {
        // Create new marker
        const marker = L.marker(position, { icon })
          .bindPopup(`
            <div style="font-family: sans-serif; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; color: #2D3748;">Vehicle ${vehicle.vehicle_id}</h3>
              <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 8px; font-size: 12px;">
                <strong>Route:</strong> <span>${vehicle.route_id}</span>
                <strong>Status:</strong> <span style="text-transform: capitalize;">${vehicle.status || 'Unknown'}</span>
                <strong>Speed:</strong> <span>${vehicle.speed ? `${vehicle.speed} mph` : 'N/A'}</span>
                <strong>Bearing:</strong> <span>${vehicle.bearing ? `${vehicle.bearing}°` : 'N/A'}</span>
                ${vehicle.operator ? `<strong>Operator:</strong> <span>${vehicle.operator}</span>` : ''}
                ${vehicle.trip_id ? `<strong>Trip ID:</strong> <span>${vehicle.trip_id}</span>` : ''}
                ${vehicle.scheduleAdherence !== undefined ? `
                  <strong>Schedule:</strong> 
                  <span>${vehicle.scheduleAdherence >= 0 ? '+' : ''}${vehicle.scheduleAdherence.toFixed(1)}m</span>
                ` : ''}
              </div>
              <div style="margin-top: 8px; font-size: 11px; color: #718096;">
                Last updated: ${new Date(vehicle.timestamp).toLocaleTimeString()}
              </div>
            </div>
          `)
          .on('click', () => {
            onVehicleSelect?.(vehicle.vehicle_id);
          });

        marker.addTo(map);
        existingMarkers.set(vehicle.vehicle_id, marker);
      }
    });

    // Update map stats
    const uniqueRoutes = new Set(vehicles.map(v => v.route_id));
    setMapStats({
      totalVehicles: vehicles.length,
      routesVisible: uniqueRoutes.size,
      lastUpdate: new Date(),
    });

    // Auto-fit bounds if vehicles exist
    if (vehicles.length > 0) {
      const group = new L.FeatureGroup(Array.from(existingMarkers.values()));
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }, [vehicles, selectedVehicle, onVehicleSelect]);

  return (
    <Box position="relative" h="full" w="full">
      {/* Map container */}
      <Box ref={mapRef} h="full" w="full" rounded="md" overflow="hidden" />

      {/* Map overlay stats */}
      <Card
        position="absolute"
        top={4}
        right={4}
        bg={cardBg}
        shadow="lg"
        size="sm"
        minW="200px"
        zIndex={1000}
      >
        <CardBody p={3}>
          <VStack spacing={2} align="stretch">
            <Text fontSize="sm" fontWeight="semibold">Map Overview</Text>
            
            <HStack justify="space-between" fontSize="xs">
              <Text color="gray.600">Vehicles:</Text>
              <Badge colorScheme="blue" variant="subtle">{mapStats.totalVehicles}</Badge>
            </HStack>
            
            <HStack justify="space-between" fontSize="xs">
              <Text color="gray.600">Routes:</Text>
              <Badge colorScheme="green" variant="subtle">{mapStats.routesVisible}</Badge>
            </HStack>
            
            <Text fontSize="xs" color="gray.500">
              Updated: {mapStats.lastUpdate.toLocaleTimeString()}
            </Text>
          </VStack>
        </CardBody>
      </Card>

      {/* Vehicle status legend */}
      <Card
        position="absolute"
        bottom={4}
        left={4}
        bg={cardBg}
        shadow="lg"
        size="sm"
        zIndex={1000}
      >
        <CardBody p={3}>
          <VStack spacing={2} align="stretch">
            <Text fontSize="sm" fontWeight="semibold">Vehicle Status</Text>
            
            <VStack spacing={1} align="stretch" fontSize="xs">
              <HStack>
                <Box w={3} h={3} bg="#51CF66" rounded="full" />
                <Text>On-Time</Text>
              </HStack>
              
              <HStack>
                <Box w={3} h={3} bg="#FFD93D" rounded="full" />
                <Text>Late</Text>
              </HStack>
              
              <HStack>
                <Box w={3} h={3} bg="#FF6B6B" rounded="full" />
                <Text>Early</Text>
              </HStack>
              
              <HStack>
                <Box w={3} h={3} bg="#339AF0" rounded="full" />
                <Text>Layover</Text>
              </HStack>
              
              <HStack>
                <Box w={3} h={3} bg="#868E96" rounded="full" />
                <Text>Missing</Text>
              </HStack>
            </VStack>
          </VStack>
        </CardBody>
      </Card>

      {/* Custom CSS for vehicle icons */}
      <style>
        {`
          .custom-vehicle-icon {
            border: none !important;
            background: transparent !important;
          }
          
          .leaflet-popup-content-wrapper {
            border-radius: 8px !important;
            box-shadow: 0 10px 25px rgba(0,0,0,0.15) !important;
          }
          
          .leaflet-popup-tip {
            box-shadow: 0 2px 5px rgba(0,0,0,0.1) !important;
          }
        `}
      </style>
    </Box>
  );
};
