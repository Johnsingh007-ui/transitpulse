import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import L from 'leaflet';
import { Box, Spinner, VStack, Text } from '@chakra-ui/react';
import type { Vehicle, Route } from '../types';
import useWebSocket from '../hooks/useWebSocket';
import ConnectionStatus from './ConnectionStatus';

// Helper function to check if a point is in the current viewport
const isInViewport = (bounds: L.LatLngBounds, point: [number, number]): boolean => {
  return bounds.contains(L.latLng(point));
};

// Custom hook for viewport-based filtering
const useViewportFilteredShapes = (routes: Route[]) => {
  const map = useMap();
  const [visibleRoutes, setVisibleRoutes] = useState<Route[]>([]);
  const updateTimeout = useRef<NodeJS.Timeout>();

  const updateVisibleShapes = useCallback(() => {
    if (!routes.length) return;
    
    const bounds = map.getBounds();
    const zoom = map.getZoom();
    
    // Only update if zoom level is appropriate for showing routes
    if (zoom < 10) {
      setVisibleRoutes([]);
      return;
    }
    
    // Filter routes that have at least one point in the viewport
    const filtered = routes.filter(route => 
      route.shapes.some(shape => 
        shape.some(point => isInViewport(bounds, point))
      )
    );
    
    setVisibleRoutes(filtered);
  }, [map, routes]);

  // Update visible shapes when map moves
  useEffect(() => {
    const onMove = () => {
      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current);
      }
      updateTimeout.current = setTimeout(updateVisibleShapes, 100);
    };

    map.on('moveend', onMove);
    map.on('zoomend', onMove);
    
    // Initial update
    updateVisibleShapes();
    
    return () => {
      map.off('moveend', onMove);
      map.off('zoomend', onMove);
      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current);
      }
    };
  }, [map, updateVisibleShapes]);

  return { visibleRoutes };
};

// Component to render routes with viewport-based filtering
const RouteRenderer = ({ routes }: { routes: Route[] }) => {
  const { visibleRoutes } = useViewportFilteredShapes(routes);
  const [hoveredRoute, setHoveredRoute] = useState<string | null>(null);
  
  return (
    <>
      {visibleRoutes.map((route, idx) => {
        const isHovered = hoveredRoute === route.route_id;
        const opacity = isHovered ? 1 : 0.7;
        const weight = isHovered ? 5 : 3;
        
        return (
          <div key={`${route.route_id}-${idx}`}>
            {route.shapes.map((shape, shapeIdx) => (
              <Polyline
                key={`${route.route_id}-${shapeIdx}`}
                positions={shape}
                pathOptions={{
                  color: route.route_color,
                  weight,
                  opacity,
                  lineJoin: 'round',
                  lineCap: 'round',
                }}
                eventHandlers={{
                  mouseover: () => setHoveredRoute(route.route_id),
                  mouseout: () => setHoveredRoute(null),
                }}
              />
            ))}
            {isHovered && route.shapes.length > 0 && (
              <Popup
                position={route.shapes[0][Math.floor(route.shapes[0].length / 2)]}
                closeButton={false}
                className="route-popup"
                autoClose={false}
                closeOnClick={false}
              >
                <div className="text-sm font-medium">
                  {route.route_short_name ? `Route ${route.route_short_name}` : 'Route'}
                  {route.route_long_name && `: ${route.route_long_name}`}
                </div>
              </Popup>
            )}
          </div>
        );
      })}
    </>
  );
};

interface RouteData {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_color: string;
  shapes: Array<Array<[number, number]>>;
}

interface MapViewProps {
  vehicles: Vehicle[];
  center: [number, number];
  zoom: number;
  isLoading: boolean;
  error: { message: string } | null;
}

// Create a custom bus icon with rotation
const createBusIcon = useCallback((bearing: number = 0) => {
  return L.divIcon({
    className: 'bus-icon',
    html: `
      <div style="
        width: 20px;
        height: 20px;
        background-color: #007bff;
        border-radius: 50%;
        border: 2px solid white;
        transform: rotate(${bearing}deg);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 10px;
        font-weight: bold;
      ">
        🚌
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}, []);

const MapView = ({ vehicles: initialVehicles, center, zoom, isLoading, error }: MapViewProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(true);
  const [routesError, setRoutesError] = useState<{ message: string } | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  // Handle WebSocket messages for real-time updates
  const handleWebSocketMessage = useCallback((message: any) => {
    if (message.type === 'vehicle_update' && message.data) {
      setVehicles(prevVehicles => {
        const updated = [...prevVehicles];
        const vehicleData = message.data;
        const vehicleId = vehicleData.vehicle_id || vehicleData.id;
        
        if (!vehicleId) return prevVehicles; // Skip if no vehicle ID
        
        const existingIndex = updated.findIndex(v => v.vehicle_id === vehicleId);
        const now = new Date().toISOString();
        
        try {
          // Create or update vehicle object
          const updatedVehicle: Vehicle = {
            vehicle_id: String(vehicleId),
            latitude: parseFloat(vehicleData.latitude) || 0,
            longitude: parseFloat(vehicleData.longitude) || 0,
            bearing: typeof vehicleData.bearing === 'number' ? vehicleData.bearing : 0,
            route_id: vehicleData.route_id || selectedRouteId || null,
            trip_id: vehicleData.trip_id || null,
            current_status: vehicleData.current_status || 'IN_TRANSIT_TO',
            speed: typeof vehicleData.speed === 'number' ? vehicleData.speed : null,
            timestamp: vehicleData.timestamp ? 
              (typeof vehicleData.timestamp === 'string' ? 
                vehicleData.timestamp : 
                new Date(vehicleData.timestamp * 1000).toISOString()) : 
              now,
            label: vehicleData.label || `Bus ${vehicleId}`,
            updated_at: now
          };
          
          if (existingIndex >= 0) {
            // Update existing vehicle
            updated[existingIndex] = {
              ...updated[existingIndex],
              ...updatedVehicle
            };
          } else {
            // Add new vehicle
            updated.push(updatedVehicle);
          }
        } catch (err) {
          console.error('Error processing vehicle update:', err);
        }
        
        return updated;
      });
    }
  }, [selectedRouteId]);

  // Set up WebSocket connection
  useWebSocket(selectedRouteId, handleWebSocketMessage);

  // Fetch routes with shapes and colors
  useEffect(() => {
    const fetchRoutes = async () => {
      setIsLoadingRoutes(true);
      setRoutesError(null);
      
      try {
        const response = await fetch('/api/v1/routes');
        if (!response.ok) {
          if (response.status === 404) {
            console.warn('No routes found. The API might not be properly configured.');
            setRoutes([]);
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const routesData = data.data || [];
        setRoutes(routesData);
        
        // Select the first route by default if none selected
        if (routesData.length > 0 && !selectedRouteId) {
          setSelectedRouteId(routesData[0].route_id);
        }
      } catch (err) {
        console.error('Error fetching routes:', err);
        const errorMessage = err instanceof Error ? err.message : 
                           typeof err === 'string' ? err : 
                           'An unknown error occurred';
        setRoutesError({ message: errorMessage });
      } finally {
        setIsLoadingRoutes(false);
      }
    };

    fetchRoutes();
  }, [selectedRouteId]);

  // Handle route selection change
  const handleRouteChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const routeId = e.target.value;
    setSelectedRouteId(routeId);
  }, []);

  if (isLoading || isLoadingRoutes) {
    return (
      <VStack 
        spacing={4}
        justify="center" 
        align="center" 
        height="100%"
        bg="gray.50"
        borderRadius="md"
        p={8}
      >
        <Spinner size="xl" color="blue.500" />
        <Text fontSize="lg" color="gray.600">
          Loading transit data...
        </Text>
        <Text fontSize="sm" color="gray.500">
          Connecting to real-time updates...
        </Text>
      </VStack>
    );
  }

  if (error || routesError) {
    const errorMessage = error?.message || routesError?.message || 'Unknown error';
    return (
      <div style={{
        padding: '20px',
        margin: '20px',
        backgroundColor: '#fff0f0',
        border: '1px solid #ffcccc',
        borderRadius: '4px',
        color: '#d32f2f'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Error loading map data</div>
        <div>{errorMessage}</div>
      </div>
    );
  }
    
    return (
      <div style={{ 
        padding: '20px', 
        color: 'red',
        background: '#fff0f0',
        border: '1px solid #ffcccc',
        borderRadius: '4px',
        margin: '10px'
      }}>
        <strong>Error loading map data:</strong> {errorMessage}
      </div>
    );
  }

  return (
    <div className="map-container" style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '10px', 
        background: '#f0f0f0', 
        borderBottom: '1px solid #ddd',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div>
          <label htmlFor="route-select" style={{ marginRight: '10px', fontWeight: 'bold' }}>Select Route:</label>
          <select
            id="route-select"
            value={selectedRouteId || ''}
            onChange={handleRouteChange}
            style={{ 
              padding: '8px', 
              borderRadius: '4px', 
              border: '1px solid #ccc',
              minWidth: '200px'
            }}
          >
            <option value="">-- Select a route --</option>
            {routes.map(route => (
              <option key={route.route_id} value={route.route_id}>
                {route.route_short_name || route.route_long_name || route.route_id}
              </option>
            ))}
          </select>
        </div>
        
        {selectedRouteId && (
          <div style={{ 
            background: '#e8f4fd', 
            padding: '5px 10px', 
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <span style={{ fontWeight: 'bold' }}>Active Vehicles:</span>
            <span style={{ 
              background: '#4a90e2', 
              color: 'white', 
              borderRadius: '10px', 
              padding: '2px 8px',
              fontSize: '0.9em'
            }}>
              {vehicles.length}
            </span>
          </div>
        )}
      </div>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: 'calc(100% - 50px)', width: '100%' }}
        zoomControl={false}
        minZoom={10}
        maxZoom={18}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Route Shapes with Colors and Names */}
        {!isLoadingRoutes && routes.length > 0 && <RouteRenderer routes={routes} />}

        {/* Loading and Error States */}
        {isLoadingRoutes && (
          <div className="absolute top-4 right-4 bg-white bg-opacity-80 p-2 rounded shadow z-[1000]">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="text-sm">Loading routes...</span>
            </div>
          </div>
        )}

        {routesError && (
          <div className="absolute top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded z-[1000] max-w-xs">
            <p className="text-sm">Error loading routes: {routesError.message}</p>
          </div>
        )}

        {/* Vehicle Markers */}
        {vehicles
          .filter(vehicle => !selectedRouteId || vehicle.route_id === selectedRouteId)
          .map((vehicle) => {
            const position: [number, number] = [vehicle.latitude, vehicle.longitude];
            const icon = createBusIcon(vehicle.bearing || 0);
            const lastUpdated = new Date(vehicle.timestamp);
            const now = new Date();
            const minutesAgo = Math.floor((now.getTime() - lastUpdated.getTime()) / 60000);
            
            return (
              <Marker
                key={`${vehicle.vehicle_id}-${vehicle.timestamp}`}
                position={position}
                icon={icon}
              >
                <Popup>
                  <div style={{ minWidth: '200px' }}>
                    <div style={{ 
                      fontWeight: 'bold', 
                      marginBottom: '8px',
                      color: '#1a73e8',
                      fontSize: '16px'
                    }}>
                      {vehicle.label || `Bus ${vehicle.vehicle_id}`}
                    </div>
                    <div style={{ marginBottom: '4px' }}>
                      <span style={{ fontWeight: '500' }}>Route:</span> {vehicle.route_id}
                    </div>
                    {vehicle.direction_name && (
                      <div style={{ marginBottom: '4px' }}>
                        <span style={{ fontWeight: '500' }}>Direction:</span> 
                        <span style={{ 
                          backgroundColor: vehicle.direction_id === 0 ? '#e3f2fd' : '#e8f5e8',
                          color: vehicle.direction_id === 0 ? '#1976d2' : '#388e3c',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          marginLeft: '4px',
                          fontSize: '12px'
                        }}>
                          {vehicle.direction_name}
                        </span>
                      </div>
                    )}
                    {vehicle.headsign && (
                      <div style={{ marginBottom: '4px' }}>
                        <span style={{ fontWeight: '500' }}>Destination:</span> 
                        <span style={{ fontStyle: 'italic', marginLeft: '4px' }}>
                          {vehicle.headsign}
                        </span>
                      </div>
                    )}
                    <div style={{ marginBottom: '4px' }}>
                      <span style={{ fontWeight: '500' }}>Status:</span> {vehicle.current_status}
                    </div>
                    {vehicle.speed && (
                      <div style={{ marginBottom: '4px' }}>
                        <span style={{ fontWeight: '500' }}>Speed:</span> {Math.round(vehicle.speed)} km/h
                      </div>
                    )}
                    <div style={{ 
                      fontSize: '0.8em', 
                      color: '#666',
                      marginTop: '5px',
                      fontStyle: 'italic'
                    }}>
                      Updated {minutesAgo === 0 ? 'just now' : `${minutesAgo} min${minutesAgo === 1 ? '' : 's'} ago`}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
};

export default MapView;
