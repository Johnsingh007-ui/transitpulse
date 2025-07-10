import React from 'react';
import {
  Box,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useColorModeValue
} from '@chakra-ui/react';

interface Trip {
  trip_id: string;
  route_id: string;
  direction_id: number;
  headsign: string;
  departure_time: string;
  status: 'on_time' | 'delayed' | 'early' | 'scheduled' | 'cancelled';
  delay?: number;
}

interface RouteScheduleStatsProps {
  trips: Trip[];
  date: string;
}

const RouteScheduleStats: React.FC<RouteScheduleStatsProps> = ({ trips, date }) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const totalTrips = trips.length;
  const outboundTrips = trips.filter(t => t.direction_id === 0).length;
  const inboundTrips = trips.filter(t => t.direction_id === 1).length;
  
  const onTimeTrips = trips.filter(t => t.status === 'on_time').length;
  const delayedTrips = trips.filter(t => t.status === 'delayed').length;
  const earlyTrips = trips.filter(t => t.status === 'early').length;
  
  const avgDelay = trips
    .filter(t => t.delay !== undefined)
    .reduce((sum, t) => sum + (t.delay || 0), 0) / 
    Math.max(1, trips.filter(t => t.delay !== undefined).length);
  
  const onTimePercentage = totalTrips > 0 ? 
    Math.round((onTimeTrips / totalTrips) * 100) : 0;

  // Find service span
  const departureTimes = trips
    .map(t => t.departure_time)
    .filter(Boolean)
    .sort();
  
  const firstDeparture = departureTimes[0];
  const lastDeparture = departureTimes[departureTimes.length - 1];

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (totalTrips === 0) {
    return null;
  }

  return (
    <Box
      p={4}
      bg={bgColor}
      borderRadius="md"
      border="1px"
      borderColor={borderColor}
      mb={4}
    >
      <SimpleGrid columns={{ base: 2, md: 4, lg: 6 }} spacing={4}>
        <Stat size="sm">
          <StatLabel>Total Trips</StatLabel>
          <StatNumber>{totalTrips}</StatNumber>
          <StatHelpText>{new Date(date).toLocaleDateString()}</StatHelpText>
        </Stat>
        
        <Stat size="sm">
          <StatLabel>Outbound</StatLabel>
          <StatNumber color="blue.500">{outboundTrips}</StatNumber>
          <StatHelpText>trips</StatHelpText>
        </Stat>
        
        <Stat size="sm">
          <StatLabel>Inbound</StatLabel>
          <StatNumber color="green.500">{inboundTrips}</StatNumber>
          <StatHelpText>trips</StatHelpText>
        </Stat>
        
        <Stat size="sm">
          <StatLabel>On-Time Performance</StatLabel>
          <StatNumber color={onTimePercentage >= 80 ? 'green.500' : onTimePercentage >= 60 ? 'yellow.500' : 'red.500'}>
            {onTimePercentage}%
          </StatNumber>
          <StatHelpText>{onTimeTrips} of {totalTrips}</StatHelpText>
        </Stat>
        
        <Stat size="sm">
          <StatLabel>Service Span</StatLabel>
          <StatNumber fontSize="sm">
            {firstDeparture && lastDeparture ? 
              `${formatTime(firstDeparture)} - ${formatTime(lastDeparture)}` : 
              'N/A'
            }
          </StatNumber>
          <StatHelpText>operating hours</StatHelpText>
        </Stat>
        
        <Stat size="sm">
          <StatLabel>Avg Delay</StatLabel>
          <StatNumber color={avgDelay > 2 ? 'red.500' : avgDelay < -1 ? 'blue.500' : 'green.500'}>
            {avgDelay > 0 ? '+' : ''}{Math.round(avgDelay)}m
          </StatNumber>
          <StatHelpText>minutes</StatHelpText>
        </Stat>
      </SimpleGrid>
    </Box>
  );
};

export default RouteScheduleStats;
