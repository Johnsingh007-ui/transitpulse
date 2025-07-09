import React from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Shape, Stop } from '../api/apiClient';

type RouteMapProps = {
  shapes: Shape[];
  stops: Stop[];
};

const RouteMap: React.FC<RouteMapProps> = ({ shapes, stops }) => {
  const defaultCenter: [number, number] = stops.length > 0
    ? [stops[0].stop_lat, stops[0].stop_lon] as [number, number]
    : [37.7749, -122.4194] as [number, number]; // fallback: San Francisco

  const shapeLines = shapes.map((shape, idx) => (
    <Polyline
      key={idx}
      positions={shape.points.map(p => [p.lat, p.lon] as [number, number])}
      pathOptions={{ color: 'blue', weight: 3 }}
    />
  ));

  const stopMarkers = stops.map((stop) => (
    <Marker
      key={stop.stop_id}
      position={[stop.stop_lat, stop.stop_lon] as [number, number]}
      icon={L.icon({ iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', iconSize: [25, 41], iconAnchor: [12, 41] })}
    >
      <Popup>
        <strong>{stop.stop_name}</strong><br />
        Stop ID: {stop.stop_id}
      </Popup>
    </Marker>
  ));

  return (
    <MapContainer 
      center={defaultCenter} 
      zoom={13} 
      style={{ height: '400px', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer 
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {shapeLines}
      {stopMarkers}
    </MapContainer>
  );
};

export default RouteMap;
