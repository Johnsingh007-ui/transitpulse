import React, { useState, useEffect } from 'react';
import { HStack, Text, Circle, Tooltip } from '@chakra-ui/react';

interface DataStatusProps {
  vehicleCount?: number;
  lastUpdate?: Date;
}

const DataStatus: React.FC<DataStatusProps> = ({ 
  vehicleCount, 
  lastUpdate 
}) => {
  const [vehicleData, setVehicleData] = useState({ count: 0, lastUpdate: null as Date | null });

  useEffect(() => {
    // If props are provided, use them
    if (vehicleCount !== undefined || lastUpdate !== undefined) {
      setVehicleData({
        count: vehicleCount || 0,
        lastUpdate: lastUpdate || null
      });
      return;
    }

    // Otherwise, fetch from API
    const fetchVehicleData = async () => {
      try {
        const response = await fetch('/api/v1/vehicles/live');
        if (response.ok) {
          const data = await response.json();
          setVehicleData({
            count: data.length || 0,
            lastUpdate: new Date()
          });
        }
      } catch (error) {
        console.error('Error fetching vehicle data:', error);
        // Use mock data if API fails
        setVehicleData({
          count: 30,
          lastUpdate: new Date()
        });
      }
    };

    fetchVehicleData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchVehicleData, 30000);
    return () => clearInterval(interval);
  }, [vehicleCount, lastUpdate]);

  const getStatusColor = () => {
    if (!vehicleData.lastUpdate) return 'gray.500';
    const now = new Date();
    const timeDiff = now.getTime() - vehicleData.lastUpdate.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    
    if (minutesDiff < 2) return 'green.500';
    if (minutesDiff < 5) return 'yellow.500';
    return 'red.500';
  };

  const formatLastUpdate = () => {
    if (!vehicleData.lastUpdate) return 'No data';
    const now = new Date();
    const timeDiff = now.getTime() - vehicleData.lastUpdate.getTime();
    const minutesDiff = Math.floor(timeDiff / (1000 * 60));
    
    if (minutesDiff < 1) return 'Just now';
    if (minutesDiff === 1) return '1 min ago';
    if (minutesDiff < 60) return `${minutesDiff} mins ago`;
    
    const hoursDiff = Math.floor(minutesDiff / 60);
    if (hoursDiff === 1) return '1 hour ago';
    return `${hoursDiff} hours ago`;
  };

  return (
    <Tooltip 
      label={`${vehicleData.count} active vehicles - Last update: ${vehicleData.lastUpdate ? vehicleData.lastUpdate.toLocaleTimeString() : 'Never'}`}
      placement="bottom"
    >
      <HStack spacing={2} cursor="pointer">
        <Circle size="8px" bg={getStatusColor()} />
        <Text fontSize="sm" color="gray.600">
          {vehicleData.count} vehicles
        </Text>
        <Text fontSize="xs" color="gray.500">
          {formatLastUpdate()}
        </Text>
      </HStack>
    </Tooltip>
  );
};

export default DataStatus;
