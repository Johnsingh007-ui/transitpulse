import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Select,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Alert,
  AlertIcon,
  Button,
  ButtonGroup,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useColorModeValue,
  IconButton,
  Tooltip
} from '@chakra-ui/react';
import { CalendarIcon, TimeIcon, RepeatIcon } from '@chakra-ui/icons';
import RouteScheduleStats from './RouteScheduleStats';

interface Trip {
  trip_id: string;
  route_id: string;
  direction_id: number;
  headsign: string;
  departure_time: string;
  arrival_time?: string;
  stop_sequence: number;
  stop_name: string;
  scheduled_time: string;
  actual_time?: string;
  delay?: number;
  status: 'on_time' | 'delayed' | 'early' | 'scheduled' | 'cancelled';
}

interface RouteScheduleProps {
  routeId: string | null;
}

const RouteSchedule: React.FC<RouteScheduleProps> = ({ routeId }) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [viewMode, setViewMode] = useState<'schedule' | 'realtime' | 'comparison'>('comparison');
  const [selectedDirection, setSelectedDirection] = useState<'all' | '0' | '1'>('all');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Generate date options for the past week and next week
  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    
    // Past 7 days
    for (let i = 7; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    // Future 7 days
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dateString === today) return `Today (${date.toLocaleDateString()})`;
    if (dateString === yesterday.toISOString().split('T')[0]) return `Yesterday (${date.toLocaleDateString()})`;
    if (dateString === tomorrow.toISOString().split('T')[0]) return `Tomorrow (${date.toLocaleDateString()})`;
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const fetchScheduleData = async () => {
    if (!routeId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/v1/routes/${routeId}/schedule?date=${selectedDate}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.trips && data.trips.length > 0) {
        // Transform API data to component format
        const transformedTrips: Trip[] = [];
        
        data.trips.forEach((trip: any) => {
          trip.stops.forEach((stop: any, index: number) => {
            if (stop.departure_time) {
              transformedTrips.push({
                trip_id: trip.trip_id,
                route_id: trip.route_id,
                direction_id: trip.direction_id,
                headsign: trip.headsign || 'Unknown',
                departure_time: stop.departure_time,
                arrival_time: stop.arrival_time,
                stop_sequence: stop.stop_sequence,
                stop_name: stop.stop_name,
                scheduled_time: stop.departure_time,
                actual_time: stop.actual_departure,
                delay: stop.delay,
                status: stop.status || 'scheduled'
              });
            }
          });
        });
        
        setTrips(transformedTrips);
      } else {
        setTrips([]);
      }
    } catch (err) {
      setError('Failed to fetch schedule data');
      console.error('Error fetching schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduleData();
  }, [routeId, selectedDate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_time': return 'green';
      case 'delayed': return 'red';
      case 'early': return 'blue';
      case 'scheduled': return 'gray';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getDelayText = (delay?: number) => {
    if (delay === undefined) return '';
    if (delay === 0) return 'On time';
    if (delay > 0) return `${delay} min late`;
    return `${Math.abs(delay)} min early`;
  };

  const filteredTrips = trips.filter(trip => 
    selectedDirection === 'all' || trip.direction_id.toString() === selectedDirection
  );

  if (!routeId) {
    return (
      <Box p={6} textAlign="center">
        <CalendarIcon boxSize={8} color="gray.400" mb={4} />
        <Text color="gray.500">Select a route to view its schedule</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      {/* Controls */}
      <HStack spacing={4} wrap="wrap" justify="space-between">
        <HStack spacing={4} wrap="wrap">
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2}>Date</Text>
            <Select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              maxW="250px"
            >
              {generateDateOptions().map((date) => (
                <option key={date} value={date}>
                  {formatDate(date)}
                </option>
              ))}
            </Select>
          </Box>
          
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2}>View Mode</Text>
            <ButtonGroup size="sm" isAttached variant="outline">
              <Button
                colorScheme={viewMode === 'schedule' ? 'blue' : 'gray'}
                onClick={() => setViewMode('schedule')}
              >
                <TimeIcon mr={2} />
                Schedule
              </Button>
              <Button
                colorScheme={viewMode === 'realtime' ? 'blue' : 'gray'}
                onClick={() => setViewMode('realtime')}
              >
                🚌 Real-time
              </Button>
              <Button
                colorScheme={viewMode === 'comparison' ? 'blue' : 'gray'}
                onClick={() => setViewMode('comparison')}
              >
                📊 Compare
              </Button>
            </ButtonGroup>
          </Box>
          
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2}>Direction</Text>
            <Select
              value={selectedDirection}
              onChange={(e) => setSelectedDirection(e.target.value as 'all' | '0' | '1')}
              maxW="150px"
              size="sm"
            >
              <option value="all">All Directions</option>
              <option value="0">Outbound</option>
              <option value="1">Inbound</option>
            </Select>
          </Box>
        </HStack>
        
        <Tooltip label="Refresh schedule data" hasArrow>
          <IconButton
            aria-label="Refresh"
            icon={<RepeatIcon />}
            onClick={fetchScheduleData}
            isLoading={loading}
            size="sm"
            colorScheme="blue"
            variant="outline"
          />
        </Tooltip>
      </HStack>

      <Divider />

      {/* Content */}
      {loading ? (
        <Box textAlign="center" py={8}>
          <Spinner size="lg" />
          <Text mt={4} color="gray.500">Loading schedule data...</Text>
        </Box>
      ) : error ? (
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      ) : (
        <Box>
          {/* Schedule Stats */}
          <RouteScheduleStats trips={filteredTrips} date={selectedDate} />
          
          {viewMode === 'comparison' && (
            <VStack spacing={4} align="stretch">
              <HStack spacing={4}>
                <Stat size="sm">
                  <StatLabel>On Time</StatLabel>
                  <StatNumber color="green.500">
                    {filteredTrips.filter(t => t.status === 'on_time').length}
                  </StatNumber>
                  <StatHelpText>trips</StatHelpText>
                </Stat>
                <Stat size="sm">
                  <StatLabel>Delayed</StatLabel>
                  <StatNumber color="red.500">
                    {filteredTrips.filter(t => t.status === 'delayed').length}
                  </StatNumber>
                  <StatHelpText>trips</StatHelpText>
                </Stat>
                <Stat size="sm">
                  <StatLabel>Early</StatLabel>
                  <StatNumber color="blue.500">
                    {filteredTrips.filter(t => t.status === 'early').length}
                  </StatNumber>
                  <StatHelpText>trips</StatHelpText>
                </Stat>
              </HStack>
              
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Time</Th>
                    <Th>Direction</Th>
                    <Th>Stop</Th>
                    <Th>Scheduled</Th>
                    <Th>Actual</Th>
                    <Th>Status</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredTrips.map((trip) => (
                    <Tr key={trip.trip_id}>
                      <Td>{formatTime(trip.departure_time)}</Td>
                      <Td>
                        <HStack>
                          <Text fontSize="sm">{trip.headsign}</Text>
                          <Badge size="sm" colorScheme={trip.direction_id === 0 ? 'blue' : 'green'}>
                            {trip.direction_id === 0 ? 'Outbound' : 'Inbound'}
                          </Badge>
                        </HStack>
                      </Td>
                      <Td>{trip.stop_name}</Td>
                      <Td>{formatTime(trip.scheduled_time)}</Td>
                      <Td>
                        {trip.actual_time ? formatTime(trip.actual_time) : '-'}
                      </Td>
                      <Td>
                        <HStack>
                          <Badge colorScheme={getStatusColor(trip.status)}>
                            {trip.status.replace('_', ' ')}
                          </Badge>
                          {trip.delay !== undefined && (
                            <Text fontSize="xs" color="gray.500">
                              {getDelayText(trip.delay)}
                            </Text>
                          )}
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </VStack>
          )}
          
          {viewMode === 'schedule' && (
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Time</Th>
                  <Th>Direction</Th>
                  <Th>Stop</Th>
                  <Th>Trip ID</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredTrips.map((trip) => (
                  <Tr key={trip.trip_id}>
                    <Td>{formatTime(trip.scheduled_time)}</Td>
                    <Td>
                      <HStack>
                        <Text fontSize="sm">{trip.headsign}</Text>
                        <Badge size="sm" colorScheme={trip.direction_id === 0 ? 'blue' : 'green'}>
                          {trip.direction_id === 0 ? 'Outbound' : 'Inbound'}
                        </Badge>
                      </HStack>
                    </Td>
                    <Td>{trip.stop_name}</Td>
                    <Td>
                      <Text fontSize="xs" color="gray.500">{trip.trip_id}</Text>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
          
          {viewMode === 'realtime' && (
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Time</Th>
                  <Th>Direction</Th>
                  <Th>Stop</Th>
                  <Th>Status</Th>
                  <Th>Delay</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredTrips.filter(trip => trip.actual_time).map((trip) => (
                  <Tr key={trip.trip_id}>
                    <Td>{trip.actual_time ? formatTime(trip.actual_time) : '-'}</Td>
                    <Td>
                      <HStack>
                        <Text fontSize="sm">{trip.headsign}</Text>
                        <Badge size="sm" colorScheme={trip.direction_id === 0 ? 'blue' : 'green'}>
                          {trip.direction_id === 0 ? 'Outbound' : 'Inbound'}
                        </Badge>
                      </HStack>
                    </Td>
                    <Td>{trip.stop_name}</Td>
                    <Td>
                      <Badge colorScheme={getStatusColor(trip.status)}>
                        {trip.status.replace('_', ' ')}
                      </Badge>
                    </Td>
                    <Td>
                      <Text fontSize="sm" color={trip.delay && trip.delay > 0 ? 'red.500' : 'green.500'}>
                        {getDelayText(trip.delay)}
                      </Text>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
          
          {filteredTrips.length === 0 && (
            <Box textAlign="center" py={8}>
              <Text color="gray.500">
                {selectedDirection !== 'all' 
                  ? `No trips found for ${selectedDirection === '0' ? 'outbound' : 'inbound'} direction on this date`
                  : 'No schedule data available for this date'
                }
              </Text>
            </Box>
          )}
        </Box>
      )}
    </VStack>
  );
};

export default RouteSchedule;
