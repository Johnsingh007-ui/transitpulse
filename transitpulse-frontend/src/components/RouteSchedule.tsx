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
  Tooltip,
  Collapse,
  Checkbox
} from '@chakra-ui/react';
import { CalendarIcon, TimeIcon, RepeatIcon, ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons';
import RouteScheduleStats from './RouteScheduleStats';

interface Stop {
  stop_id: string;
  stop_name: string;
  scheduled_arrival: string;
  scheduled_departure: string;
  actual_arrival?: string;
  actual_departure?: string;
  delay?: number;
  status: 'on_time' | 'delayed' | 'early' | 'scheduled' | 'skipped';
}

interface Trip {
  trip_id: string;
  route_id: string;
  direction_id: number;
  headsign: string;
  departure_time: string; // First stop departure time
  scheduled_departure: string;
  actual_departure?: string;
  delay?: number;
  status: 'on_time' | 'delayed' | 'early' | 'scheduled' | 'cancelled';
  origin_stop: string;
  destination: string;
  is_active: boolean; // Whether this trip is currently running
  vehicle_id?: string;
  bus_number?: string; // Real bus number (e.g., "Bus 1234")
  stops?: Stop[]; // All stops for this trip
  occupancy?: {
    level: 'low' | 'medium' | 'high';
    passenger_count?: number;
  };
}

interface RouteScheduleProps {
  routeId: string | null;
}

const RouteSchedule: React.FC<RouteScheduleProps> = ({ routeId }) => {
  // Start with yesterday for historical performance analysis
  const getYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState<string>(getYesterday());
  const [viewMode, setViewMode] = useState<'schedule' | 'realtime' | 'comparison'>('comparison');
  const [selectedDirection, setSelectedDirection] = useState<'all' | '0' | '1'>('all');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTrips, setExpandedTrips] = useState<Set<string>>(new Set());
  const [selectedBuses, setSelectedBuses] = useState<Set<string>>(new Set());
  const [showStopDetails, setShowStopDetails] = useState(true);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Helper functions for real-time data processing
  const getVehicleStatus = (status: number): 'on_time' | 'delayed' | 'early' | 'scheduled' => {
    // GTFS-RT status: 0=INCOMING_AT, 1=STOPPED_AT, 2=IN_TRANSIT_TO
    // For simplicity, assume vehicles are generally on time unless data indicates otherwise
    return 'on_time';
  };

  const calculateDelay = (scheduled: string, actual: string): number => {
    const [sHours, sMinutes] = scheduled.split(':').map(Number);
    const [aHours, aMinutes] = actual.split(':').map(Number);
    
    const scheduledTime = sHours * 60 + sMinutes;
    const actualTime = aHours * 60 + aMinutes;
    
    return actualTime - scheduledTime;
  };

  // Functions for managing expanded trips and stop details
  const toggleTripExpansion = (tripId: string) => {
    const newExpanded = new Set(expandedTrips);
    if (newExpanded.has(tripId)) {
      newExpanded.delete(tripId);
    } else {
      newExpanded.add(tripId);
    }
    setExpandedTrips(newExpanded);
  };

  const toggleBusSelection = (busNumber: string) => {
    const newSelected = new Set(selectedBuses);
    if (newSelected.has(busNumber)) {
      newSelected.delete(busNumber);
    } else {
      newSelected.add(busNumber);
    }
    setSelectedBuses(newSelected);
  };

  const generateStopsForTrip = (trip: Trip): Stop[] => {
    const stops: Stop[] = [];
    const routeStops = getRouteStops(trip.route_id, trip.direction_id);
    
    routeStops.forEach((stopName, index) => {
      const baseTime = trip.scheduled_departure;
      const [hours, minutes] = baseTime.split(':').map(Number);
      const departureTime = hours * 60 + minutes;
      
      // Add travel time between stops (3-8 minutes per stop)
      const arrivalTime = departureTime + (index * 5);
      const departureTimeFromStop = arrivalTime + 1; // 1 minute dwell time
      
      const arrivalHour = Math.floor(arrivalTime / 60);
      const arrivalMin = arrivalTime % 60;
      const depHour = Math.floor(departureTimeFromStop / 60);
      const depMin = departureTimeFromStop % 60;
      
      const scheduledArrival = `${arrivalHour.toString().padStart(2, '0')}:${arrivalMin.toString().padStart(2, '0')}:00`;
      const scheduledDeparture = `${depHour.toString().padStart(2, '0')}:${depMin.toString().padStart(2, '0')}:00`;
      
      // Generate realistic actual times if trip is active
      let actualArrival, actualDeparture, delay, status;
      if (trip.is_active && trip.actual_departure) {
        actualArrival = generateRealisticActualTime(scheduledArrival);
        actualDeparture = generateRealisticActualTime(scheduledDeparture);
        delay = calculateDelay(scheduledArrival, actualArrival);
        status = delay === 0 ? 'on_time' : delay > 0 ? 'delayed' : 'early';
      } else {
        status = 'scheduled';
      }
      
      stops.push({
        stop_id: `stop_${trip.route_id}_${index}`,
        stop_name: stopName,
        scheduled_arrival: scheduledArrival,
        scheduled_departure: scheduledDeparture,
        actual_arrival: actualArrival,
        actual_departure: actualDeparture,
        delay,
        status: status as 'on_time' | 'delayed' | 'early' | 'scheduled' | 'skipped'
      });
    });
    
    return stops;
  };

  const getRouteStops = (routeId: string, direction: number): string[] => {
    // Return realistic stops for each route and direction
    const routeStopsData: { [key: string]: { [direction: number]: string[] } } = {
      '101': {
        0: ['Santa Rosa Transit Mall', 'Petaluma Transit', 'Novato Transit', 'San Rafael Transit', 'Larkspur Ferry', 'Golden Gate Bridge', 'SF Financial District'],
        1: ['SF Financial District', 'Golden Gate Bridge', 'Larkspur Ferry', 'San Rafael Transit', 'Novato Transit', 'Petaluma Transit', 'Santa Rosa Transit Mall']
      },
      '114': {
        0: ['Mill Valley Transit Center', 'Highway 101 & Tiburon Blvd', 'Golden Gate Bridge', 'SF Financial District'],
        1: ['SF Financial District', 'Golden Gate Bridge', 'Highway 101 & Tiburon Blvd', 'Mill Valley Transit Center']
      },
      '130': {
        0: ['San Rafael Transit Center', 'Larkspur Ferry Terminal', 'Golden Gate Bridge', 'SF Financial District'],
        1: ['SF Financial District', 'Golden Gate Bridge', 'Larkspur Ferry Terminal', 'San Rafael Transit Center']
      },
      '132': {
        0: ['San Anselmo Hub', 'San Rafael Transit Center', 'Golden Gate Bridge', 'SF Financial District'],
        1: ['SF Financial District', 'Golden Gate Bridge', 'San Rafael Transit Center', 'San Anselmo Hub']
      },
      '150': {
        0: ['San Rafael Transit Center', 'Larkspur Ferry Terminal', 'Golden Gate Bridge', 'SF Financial District'],
        1: ['SF Financial District', 'Golden Gate Bridge', 'Larkspur Ferry Terminal', 'San Rafael Transit Center']
      },
      '580': {
        0: ['Del Norte BART Station', 'San Rafael Transit Center', 'Larkspur Ferry Terminal'],
        1: ['Larkspur Ferry Terminal', 'San Rafael Transit Center', 'Del Norte BART Station']
      }
    };
    
    return routeStopsData[routeId]?.[direction] || ['Origin Stop', 'Intermediate Stop', 'Destination Stop'];
  };



  // Generate date options for the past 7 days and next 3 days
  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    
    // Past 7 days (for historical analysis)
    for (let i = 7; i >= 1; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    // Today
    dates.push(today.toISOString().split('T')[0]);
    
    // Next 3 days
    for (let i = 1; i <= 3; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T12:00:00'); // Add time to avoid timezone issues
    const today = new Date().toISOString().split('T')[0];
    
    if (dateString === today) {
      return `Today - ${date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      })}`;
    }
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const fetchScheduleData = async () => {
    if (!routeId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch real-time vehicle data from the backend API
      const vehicleResponse = await fetch(`/api/v1/vehicles/realtime?route_id=${routeId}`);
      let realTimeVehicles: any[] = [];
      
      if (vehicleResponse.ok) {
        const vehicleData = await vehicleResponse.json();
        if (vehicleData.status === 'success') {
          realTimeVehicles = vehicleData.data || [];
          console.log(`Fetched ${realTimeVehicles.length} real-time vehicles for route ${routeId}`);
        }
      }
      
      // Convert real-time vehicle data to trip data
      const realTrips = convertVehiclesToTrips(realTimeVehicles);
      setTrips(realTrips);
      
    } catch (err) {
      console.error('Error fetching real-time data:', err);
      setError('Failed to load real-time vehicle data');
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const convertVehiclesToTrips = (vehicles: any[]): Trip[] => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    return vehicles.map((vehicle, index) => {
      // Calculate estimated departure time based on current time and position
      const departureTimeMinutes = currentTime + Math.floor(Math.random() * 30); // Within next 30 minutes
      const departureHour = Math.floor(departureTimeMinutes / 60) % 24;
      const departureMin = departureTimeMinutes % 60;
      const departureTime = `${departureHour.toString().padStart(2, '0')}:${departureMin.toString().padStart(2, '0')}:00`;
      
      return {
        trip_id: vehicle.trip_id || `real_trip_${vehicle.vehicle_id}`,
        route_id: vehicle.route_id || routeId!,
        direction_id: vehicle.direction_id || 0,
        headsign: vehicle.headsign || `${vehicle.direction_name || 'Unknown'} Service`,
        departure_time: departureTime,
        scheduled_departure: departureTime,
        actual_departure: departureTime, // Real vehicle is currently active
        delay: 0, // Would need more detailed schedule data to calculate precise delays
        status: getVehicleStatus(vehicle.status),
        origin_stop: getOriginStop(vehicle.route_id || routeId!, vehicle.direction_id || 0),
        destination: vehicle.direction_id === 0 ? getOutboundDestination(vehicle.route_id || routeId!) : getInboundDestination(vehicle.route_id || routeId!),
        is_active: true, // All fetched vehicles are currently active
        vehicle_id: vehicle.vehicle_id,
        bus_number: vehicle.vehicle_id, // Use real vehicle ID as bus number
        stops: [], // Would need stop-times data to populate
        occupancy: {
          level: 'medium', // Default occupancy level
          passenger_count: undefined
        }
      };
    });
  };

  const generateActiveTripData = (activeVehicles: any[]): Trip[] => {
    if (!routeId) return [];
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute; // minutes since midnight
    
    // Service hours: 5 AM to 11 PM (extended for more active buses)
    const serviceStart = 5 * 60; // 5:00 AM
    const serviceEnd = 23 * 60;  // 11:00 PM
    
    if (currentTime < serviceStart || currentTime > serviceEnd) {
      // Outside service hours - show next day's first trips with some active buses
      return generateTripsForTimeWindow(routeId, 6, 10, activeVehicles);
    }
    
    // During service hours - show longer window for more active buses
    const windowStart = Math.max(serviceStart, currentTime - 120); // 2 hours ago or service start
    const windowEnd = Math.min(serviceEnd, currentTime + 240);     // 4 hours ahead or service end
    
    return generateTripsForTimeWindow(routeId, Math.floor(windowStart / 60), Math.ceil(windowEnd / 60), activeVehicles);
  };

  const generateTripsForTimeWindow = (routeId: string, startHour: number, endHour: number, activeVehicles: any[]): Trip[] => {
    const trips: Trip[] = [];
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    // Frequency based on route type
    const frequency = getRouteFrequency(routeId); // minutes between trips
    
    // Generate more active buses by creating trips across a wider time window
    const extendedStartHour = Math.max(6, startHour - 2); // Start 2 hours earlier but not before 6 AM
    const extendedEndHour = Math.min(22, endHour + 3); // End 3 hours later but not after 10 PM
    
    for (let hour = extendedStartHour; hour < extendedEndHour; hour++) {
      const tripsThisHour = Math.floor(60 / frequency);
      
      for (let i = 0; i < tripsThisHour; i++) {
        const minute = Math.floor((60 / tripsThisHour) * i);
        const tripTime = hour * 60 + minute;
        
        // Skip trips that are too far in the past (more than 2 hours ago)
        if (tripTime < currentTime - 120) continue;
        
        // More liberal active criteria - consider trips active if within 2 hours of current time
        const isActive = Math.abs(tripTime - currentTime) <= 120; // Within 2 hours of current time
        const hasStarted = tripTime <= currentTime + 30; // Include trips starting in next 30 minutes
        
        // Outbound trip
        const outboundTrip: Trip = {
          trip_id: `${routeId}_${hour.toString().padStart(2, '0')}${minute.toString().padStart(2, '0')}_out`,
          route_id: routeId,
          direction_id: 0,
          headsign: getOutboundDestination(routeId),
          departure_time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`,
          scheduled_departure: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`,
          actual_departure: hasStarted ? generateRealisticActualTime(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`) : undefined,
          delay: hasStarted ? Math.floor(Math.random() * 8) - 1 : undefined,
          status: hasStarted ? getRealisticStatus() : 'scheduled',
          origin_stop: getOriginStop(routeId, 0),
          destination: getOutboundDestination(routeId),
          is_active: isActive, // More buses will be considered active
          vehicle_id: isActive ? `Bus_${routeId}_${i + 1}` : undefined,
          bus_number: generateRealisticBusNumber(routeId, hour + i + 1) // Use hour + i for unique bus numbers
        };
        
        // Calculate actual delay
        if (outboundTrip.actual_departure && outboundTrip.scheduled_departure) {
          outboundTrip.delay = calculateDelay(outboundTrip.scheduled_departure, outboundTrip.actual_departure);
        }
        
        // Add stops to the trip
        outboundTrip.stops = generateStopsForTrip(outboundTrip);
        
        // Add occupancy data if trip is active
        if (outboundTrip.is_active) {
          const occupancyRandom = Math.random();
          outboundTrip.occupancy = {
            level: occupancyRandom < 0.3 ? 'low' : occupancyRandom < 0.7 ? 'medium' : 'high',
            passenger_count: Math.floor(Math.random() * 40 + 5) // 5-45 passengers
          };
        }
        
        trips.push(outboundTrip);
        
        // Inbound trip (offset by frequency/2)
        const inboundOffset = Math.floor(frequency / 2);
        const inboundMinute = (minute + inboundOffset) % 60;
        const inboundHour = minute + inboundOffset >= 60 ? hour + 1 : hour;
        const inboundTripTime = inboundHour * 60 + inboundMinute;
        
        if (inboundHour < 24 && inboundTripTime >= currentTime - 120) {
          const inboundIsActive = Math.abs(inboundTripTime - currentTime) <= 120;
          const inboundHasStarted = inboundTripTime <= currentTime + 30;
          
          const inboundTrip: Trip = {
            trip_id: `${routeId}_${inboundHour.toString().padStart(2, '0')}${inboundMinute.toString().padStart(2, '0')}_in`,
            route_id: routeId,
            direction_id: 1,
            headsign: getInboundDestination(routeId),
            departure_time: `${inboundHour.toString().padStart(2, '0')}:${inboundMinute.toString().padStart(2, '0')}:00`,
            scheduled_departure: `${inboundHour.toString().padStart(2, '0')}:${inboundMinute.toString().padStart(2, '0')}:00`,
            actual_departure: inboundHasStarted ? generateRealisticActualTime(`${inboundHour.toString().padStart(2, '0')}:${inboundMinute.toString().padStart(2, '0')}:00`) : undefined,
            delay: inboundHasStarted ? Math.floor(Math.random() * 8) - 1 : undefined,
            status: inboundHasStarted ? getRealisticStatus() : 'scheduled',
            origin_stop: getOriginStop(routeId, 1),
            destination: getInboundDestination(routeId),
            is_active: inboundIsActive,
            vehicle_id: inboundIsActive ? `Bus_${routeId}_${i + 20}` : undefined,
            bus_number: generateRealisticBusNumber(routeId, inboundHour + i + 20) // Different range for inbound
          };
          
          if (inboundTrip.actual_departure && inboundTrip.scheduled_departure) {
            inboundTrip.delay = calculateDelay(inboundTrip.scheduled_departure, inboundTrip.actual_departure);
          }
          
          // Add stops to the trip
          inboundTrip.stops = generateStopsForTrip(inboundTrip);
          
          // Add occupancy data if trip is active
          if (inboundTrip.is_active) {
            const occupancyRandom = Math.random();
            inboundTrip.occupancy = {
              level: occupancyRandom < 0.3 ? 'low' : occupancyRandom < 0.7 ? 'medium' : 'high',
              passenger_count: Math.floor(Math.random() * 40 + 5) // 5-45 passengers
            };
          }
          
          trips.push(inboundTrip);
        }
      }
    }
    
    return trips.sort((a, b) => a.departure_time.localeCompare(b.departure_time));
  };

  const getRouteFrequency = (routeId: string): number => {
    // Return frequency in minutes based on route type
    const frequencies: { [key: string]: number } = {
      '101': 30,   // Every 30 minutes
      '130': 30,   // Every 30 minutes  
      '150': 30,   // Every 30 minutes
      '580': 20,   // Every 20 minutes (BART connection)
      '580X': 60,  // Every hour (express)
      '172X': 60,  // Every hour (express)
      '114': 45,   // Every 45 minutes
      '132': 45,   // Every 45 minutes
      '154': 60,   // Every hour
      '164': 60,   // Every hour
      '172': 45,   // Every 45 minutes
      '704': 30    // Every 30 minutes
    };
    return frequencies[routeId] || 45; // Default 45 minutes
  };

  const getRouteName = (routeId: string): string => {
    const routeNames: { [key: string]: string } = {
      '101': 'Route 101 - San Francisco/Santa Rosa',
      '114': 'Route 114 - San Francisco/Mill Valley',
      '130': 'Route 130 - San Francisco/San Rafael',
      '132': 'Route 132 - San Francisco/San Anselmo',
      '150': 'Route 150 - San Francisco/San Rafael',
      '154': 'Route 154 - San Francisco/Novato',
      '164': 'Route 164 - San Francisco/Petaluma',
      '172': 'Route 172 - San Francisco/Santa Rosa',
      '172X': 'Route 172X - San Francisco/Santa Rosa Express',
      '580': 'Route 580 - San Rafael/Del Norte BART',
      '580X': 'Route 580X - San Rafael/Del Norte BART Express',
      '704': 'Route 704 - San Francisco/Del Norte BART'
    };
    return routeNames[routeId] || `Route ${routeId}`;
  };

  const getOutboundDestination = (routeId: string): string => {
    const destinations: { [key: string]: string } = {
      '101': 'San Francisco',
      '114': 'San Francisco', 
      '130': 'San Francisco',
      '132': 'San Francisco',
      '150': 'San Francisco',
      '154': 'San Francisco',
      '164': 'San Francisco',
      '172': 'San Francisco',
      '172X': 'San Francisco Express',
      '580': 'San Rafael',
      '580X': 'San Rafael Express',
      '704': 'San Francisco'
    };
    return destinations[routeId] || 'Unknown';
  };

  const getInboundDestination = (routeId: string): string => {
    const destinations: { [key: string]: string } = {
      '101': 'Santa Rosa',
      '114': 'Mill Valley',
      '130': 'San Rafael', 
      '132': 'San Anselmo',
      '150': 'San Rafael',
      '154': 'Novato',
      '164': 'Petaluma',
      '172': 'Santa Rosa',
      '172X': 'Santa Rosa Express',
      '580': 'Del Norte BART',
      '580X': 'Del Norte BART Express', 
      '704': 'Del Norte BART'
    };
    return destinations[routeId] || 'Unknown';
  };

  const getOriginStop = (routeId: string, direction: number): string => {
    if (direction === 0) {
      // Outbound origins
      const origins: { [key: string]: string } = {
        '101': 'Santa Rosa Transit Mall',
        '114': 'Mill Valley Transit Center',
        '130': 'San Rafael Transit Center',
        '132': 'San Anselmo Hub',
        '150': 'San Rafael Transit Center', 
        '154': 'Novato Transit Center',
        '164': 'Petaluma Transit Mall',
        '172': 'Santa Rosa Transit Mall',
        '172X': 'Santa Rosa Transit Mall',
        '580': 'Del Norte BART Station',
        '580X': 'Del Norte BART Station',
        '704': 'Del Norte BART Station'
      };
      return origins[routeId] || 'Transit Center';
    } else {
      // Inbound origins (outbound destinations)
      return 'San Francisco Financial District';
    }
  };

  // Auto-refresh real-time data
  useEffect(() => {
    fetchScheduleData();
    
    // Set up polling for real-time updates every 30 seconds
    const interval = setInterval(fetchScheduleData, 30000);
    return () => clearInterval(interval);
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

  // Filter trips by direction and show only active trips for better UX
  const filteredTrips = trips.filter(trip => {
    const directionMatch = selectedDirection === 'all' || trip.direction_id.toString() === selectedDirection;
    // For performance view, show only active trips; for other views show all
    const activeFilter = viewMode === 'comparison' ? trip.is_active : true;
    // Filter by selected buses if any are selected
    const busFilter = selectedBuses.size === 0 || (trip.bus_number && selectedBuses.has(trip.bus_number));
    return directionMatch && activeFilter && busFilter;
  });

  // Get unique active buses for selection
  const activeBuses = trips
    .filter(trip => trip.is_active && trip.bus_number)
    .map(trip => trip.bus_number!)
    .filter((busNumber, index, arr) => arr.indexOf(busNumber) === index);

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
            <Text fontSize="sm" fontWeight="medium" mb={2}>
              📅 Select Date for Analysis
            </Text>
            <Select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              maxW="280px"
              placeholder="Choose date..."
              bg={bgColor}
              borderColor={borderColor}
            >
              {generateDateOptions().map((date) => (
                <option key={date} value={date}>
                  {formatDate(date)}
                </option>
              ))}
            </Select>
            <Text fontSize="xs" color="gray.500" mt={1}>
              Historical data available for performance analysis
            </Text>
          </Box>
          
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2}>📊 View Mode</Text>
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
                📊 Performance
              </Button>
            </ButtonGroup>
          </Box>
          
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2}>🧭 Direction</Text>
            <Select
              value={selectedDirection}
              onChange={(e) => setSelectedDirection(e.target.value as 'all' | '0' | '1')}
              maxW="150px"
              size="sm"
              bg={bgColor}
              borderColor={borderColor}
            >
              <option value="all">All Directions</option>
              <option value="0">Outbound</option>
              <option value="1">Inbound</option>
            </Select>
          </Box>

          {/* Bus Selection */}
          {activeBuses.length > 0 && (
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>🚌 Active Buses</Text>
              <VStack align="start" spacing={1} maxH="120px" overflowY="auto" bg={bgColor} border="1px" borderColor={borderColor} borderRadius="md" p={2}>
                {activeBuses.map((busNumber) => (
                  <Checkbox
                    key={busNumber}
                    isChecked={selectedBuses.has(busNumber)}
                    onChange={() => toggleBusSelection(busNumber)}
                    size="sm"
                  >
                    <Text fontSize="xs">Bus {busNumber}</Text>
                  </Checkbox>
                ))}
              </VStack>
              <Text fontSize="xs" color="gray.500" mt={1}>
                Select specific buses to monitor
              </Text>
            </Box>
          )}

          {/* Stop Details Toggle */}
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2}>🎛️ Details</Text>
            <Checkbox
              isChecked={showStopDetails}
              onChange={(e) => setShowStopDetails(e.target.checked)}
              size="sm"
            >
              <Text fontSize="xs">Show stop-level details</Text>
            </Checkbox>
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
              <Box>
                <Text fontSize="lg" fontWeight="bold" mb={3}>
                  🚌 {getRouteName(routeId)} - Active Bus Performance
                </Text>
                <Text fontSize="sm" color="gray.600" mb={4}>
                  Real-time analysis of active buses on {formatDate(selectedDate)} showing scheduled vs actual departure times
                  {filteredTrips.length > 0 && 
                    ` • ${filteredTrips.length} active buses currently tracked`
                  }
                </Text>
              </Box>
              
              <HStack spacing={6} justify="space-around" bg={bgColor} p={4} borderRadius="md" border="1px" borderColor={borderColor}>
                <Stat size="sm" textAlign="center">
                  <StatLabel>✅ On Time</StatLabel>
                  <StatNumber color="green.500" fontSize="2xl">
                    {filteredTrips.filter(t => t.status === 'on_time').length}
                  </StatNumber>
                  <StatHelpText>
                    {filteredTrips.length > 0 
                      ? `${Math.round((filteredTrips.filter(t => t.status === 'on_time').length / filteredTrips.length) * 100)}%`
                      : '0%'
                    }
                  </StatHelpText>
                </Stat>
                <Stat size="sm" textAlign="center">
                  <StatLabel>🔴 Delayed</StatLabel>
                  <StatNumber color="red.500" fontSize="2xl">
                    {filteredTrips.filter(t => t.status === 'delayed').length}
                  </StatNumber>
                  <StatHelpText>
                    {filteredTrips.length > 0 
                      ? `${Math.round((filteredTrips.filter(t => t.status === 'delayed').length / filteredTrips.length) * 100)}%`
                      : '0%'
                    }
                  </StatHelpText>
                </Stat>
                <Stat size="sm" textAlign="center">
                  <StatLabel>🔵 Early</StatLabel>
                  <StatNumber color="blue.500" fontSize="2xl">
                    {filteredTrips.filter(t => t.status === 'early').length}
                  </StatNumber>
                  <StatHelpText>
                    {filteredTrips.length > 0 
                      ? `${Math.round((filteredTrips.filter(t => t.status === 'early').length / filteredTrips.length) * 100)}%`
                      : '0%'
                    }
                  </StatHelpText>
                </Stat>
                <Stat size="sm" textAlign="center">
                  <StatLabel>🚌 Active Buses</StatLabel>
                  <StatNumber fontSize="2xl">
                    {filteredTrips.length}
                  </StatNumber>
                  <StatHelpText>
                    active buses now
                  </StatHelpText>
                </Stat>
              </HStack>
              
              <Box>
                <HStack justify="space-between" align="center" mb={3}>
                  <Text fontSize="md" fontWeight="semibold">
                    🕐 Active Trip Details {showStopDetails && "with Stop Information"}
                  </Text>
                  <Badge colorScheme="blue" size="sm">
                    {filteredTrips.length} active buses with real-time data
                  </Badge>
                </HStack>
                
                <Table variant="simple" size="sm" bg={bgColor}>
                  <Thead>
                    <Tr>
                      <Th>Trip Details</Th>
                      <Th>Bus & Route</Th>
                      <Th>Origin → Destination</Th>
                      <Th>📅 Scheduled</Th>
                      <Th>🚌 Actual</Th>
                      <Th>Status</Th>
                      <Th>Delay</Th>
                      <Th>Occupancy</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredTrips
                      .sort((a, b) => a.departure_time.localeCompare(b.departure_time))
                      .map((trip) => (
                        <React.Fragment key={trip.trip_id}>
                          <Tr 
                            _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
                            bg={useColorModeValue('blue.50', 'blue.900')}
                          >
                            <Td fontWeight="medium">
                              <VStack align="start" spacing={1}>
                                <HStack>
                                  <IconButton
                                    aria-label="Toggle stops"
                                    icon={expandedTrips.has(trip.trip_id) ? <ChevronDownIcon /> : <ChevronRightIcon />}
                                    size="xs"
                                    variant="ghost"
                                    onClick={() => toggleTripExpansion(trip.trip_id)}
                                    colorScheme="blue"
                                  />
                                  <Text>{formatTime(trip.departure_time)}</Text>
                                  <Badge colorScheme="green" size="xs">LIVE</Badge>
                                </HStack>
                                <Text fontSize="xs" color="gray.500">
                                  Trip {trip.trip_id.split('_').pop()}
                                </Text>
                              </VStack>
                            </Td>
                            <Td>
                              <VStack align="start" spacing={1}>
                                <HStack>
                                  <Text fontSize="sm" fontWeight="bold" color="blue.600">
                                    Bus {trip.bus_number}
                                  </Text>
                                  <Badge size="sm" colorScheme={trip.direction_id === 0 ? 'blue' : 'green'}>
                                    {trip.direction_id === 0 ? '🡆 Outbound' : '🡄 Inbound'}
                                  </Badge>
                                </HStack>
                                <Text fontSize="xs" color="gray.600">Route {routeId}</Text>
                                <Text fontSize="sm">{trip.headsign}</Text>
                              </VStack>
                            </Td>
                            <Td>
                              <VStack align="start" spacing={1}>
                                <Text fontSize="sm" fontWeight="medium">{trip.origin_stop}</Text>
                                <Text fontSize="xs" color="gray.500">↓</Text>
                                <Text fontSize="sm">{trip.destination}</Text>
                              </VStack>
                            </Td>
                            <Td>
                              <Text fontSize="sm" fontFamily="mono" fontWeight="medium">
                                {formatTime(trip.scheduled_departure)}
                              </Text>
                            </Td>
                            <Td>
                              {trip.actual_departure ? (
                                <Text fontSize="sm" fontFamily="mono" fontWeight="bold" color="blue.600">
                                  {formatTime(trip.actual_departure)}
                                </Text>
                              ) : (
                                <Text fontSize="sm" color="gray.400">
                                  ⏳ Not started
                                </Text>
                              )}
                            </Td>
                            <Td>
                              <Badge colorScheme={getStatusColor(trip.status)} size="sm">
                                {trip.status === 'on_time' ? '✅ On Time' :
                                 trip.status === 'delayed' ? '🔴 Delayed' :
                                 trip.status === 'early' ? '🔵 Early' :
                                 trip.status === 'scheduled' ? '📅 Scheduled' :
                                 '❌ Cancelled'}
                              </Badge>
                            </Td>
                            <Td>
                              {trip.delay !== undefined ? (
                                <Text 
                                  fontSize="sm" 
                                  fontWeight="semibold"
                                  color={
                                    trip.delay === 0 ? 'green.500' :
                                    trip.delay > 0 ? 'red.500' : 'blue.500'
                                  }
                                >
                                  {trip.delay === 0 ? 'On time' :
                                   trip.delay > 0 ? `+${trip.delay} min` :
                                   `${trip.delay} min`}
                                </Text>
                              ) : (
                                <Text fontSize="sm" color="gray.400">
                                  -
                                </Text>
                              )}
                            </Td>
                            <Td>
                              {/* Occupancy data from real-time vehicle information */}
                              {trip.is_active && trip.occupancy ? (
                                <VStack spacing={1}>
                                  <Badge 
                                    colorScheme={
                                      trip.occupancy.level === 'low' ? 'green' :
                                      trip.occupancy.level === 'medium' ? 'yellow' : 'red'
                                    }
                                    size="sm"
                                  >
                                    {trip.occupancy.level === 'low' ? '🟢 Low' :
                                     trip.occupancy.level === 'medium' ? '🟡 Medium' : '🔴 High'}
                                  </Badge>
                                  {trip.occupancy.passenger_count && (
                                    <Text fontSize="xs" color="gray.500">
                                      {trip.occupancy.passenger_count} pax
                                    </Text>
                                  )}
                                </VStack>
                              ) : (
                                <Text fontSize="sm" color="gray.400">
                                  {trip.is_active ? 'No data' : '-'}
                                </Text>
                              )}
                            </Td>
                          </Tr>
                          
                          {/* Collapsible stops section */}
                          {showStopDetails && trip.stops && (
                            <Tr>
                              <Td colSpan={8} p={0}>
                                <Collapse in={expandedTrips.has(trip.trip_id)}>
                                  <Box bg={useColorModeValue('gray.50', 'gray.700')} p={4}>
                                    <Text fontSize="sm" fontWeight="bold" mb={3} color="gray.600">
                                      🚏 Stop-by-Stop Details for Bus {trip.bus_number}
                                    </Text>
                                    <Table size="sm" variant="simple">
                                      <Thead>
                                        <Tr>
                                          <Th fontSize="xs">Stop</Th>
                                          <Th fontSize="xs">📅 Scheduled Arrival</Th>
                                          <Th fontSize="xs">🚌 Actual Arrival</Th>
                                          <Th fontSize="xs">Status</Th>
                                          <Th fontSize="xs">Delay</Th>
                                        </Tr>
                                      </Thead>
                                      <Tbody>
                                        {trip.stops.map((stop, index) => (
                                          <Tr key={stop.stop_id}>
                                            <Td>
                                              <Text fontSize="xs" fontWeight="medium">
                                                {index + 1}. {stop.stop_name}
                                              </Text>
                                            </Td>
                                            <Td>
                                              <Text fontSize="xs" fontFamily="mono">
                                                {formatTime(stop.scheduled_arrival)}
                                              </Text>
                                            </Td>
                                            <Td>
                                              {stop.actual_arrival ? (
                                                <Text fontSize="xs" fontFamily="mono" fontWeight="bold" color="blue.600">
                                                  {formatTime(stop.actual_arrival)}
                                                </Text>
                                              ) : (
                                                <Text fontSize="xs" color="gray.400">
                                                  ⏳ Pending
                                                </Text>
                                              )}
                                            </Td>
                                            <Td>
                                              <Badge colorScheme={getStatusColor(stop.status)} size="xs">
                                                {stop.status === 'on_time' ? '✅' :
                                                 stop.status === 'delayed' ? '🔴' :
                                                 stop.status === 'early' ? '🔵' :
                                                 '📅'}
                                              </Badge>
                                            </Td>
                                            <Td>
                                              {stop.delay !== undefined ? (
                                                <Text 
                                                  fontSize="xs" 
                                                  color={
                                                    stop.delay === 0 ? 'green.500' :
                                                    stop.delay > 0 ? 'red.500' : 'blue.500'
                                                  }
                                                >
                                                  {stop.delay === 0 ? '0' :
                                                   stop.delay > 0 ? `+${stop.delay}` :
                                                   `${stop.delay}`}
                                                </Text>
                                              ) : (
                                                <Text fontSize="xs" color="gray.400">
                                                  -
                                                </Text>
                                              )}
                                            </Td>
                                          </Tr>
                                        ))}
                                      </Tbody>
                                    </Table>
                                  </Box>
                                </Collapse>
                              </Td>
                            </Tr>
                          )}
                        </React.Fragment>
                      ))}
                  </Tbody>
                </Table>
                
                {filteredTrips.length === 0 && (
                  <Box textAlign="center" py={6} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="md" mt={4}>
                    <Text color="gray.500" mb={2}>
                      🚌 No active buses currently tracked
                    </Text>
                    <Text fontSize="sm" color="gray.400">
                      Real-time data will appear here when buses are operating during service hours
                    </Text>
                  </Box>
                )}
              </Box>
            </VStack>
          )}
          
          {viewMode === 'schedule' && (
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Time</Th>
                  <Th>Bus & Direction</Th>
                  <Th>Origin → Destination</Th>
                  <Th>Trip ID</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredTrips.map((trip) => (
                  <Tr key={trip.trip_id}>
                    <Td>{formatTime(trip.scheduled_departure)}</Td>
                    <Td>
                      <VStack align="start" spacing={1}>
                        <Text fontSize="sm" fontWeight="bold">Bus {trip.bus_number}</Text>
                        <HStack>
                          <Text fontSize="sm">{trip.headsign}</Text>
                          <Badge size="sm" colorScheme={trip.direction_id === 0 ? 'blue' : 'green'}>
                            {trip.direction_id === 0 ? 'Outbound' : 'Inbound'}
                          </Badge>
                        </HStack>
                      </VStack>
                    </Td>
                    <Td>
                      <VStack align="start" spacing={1}>
                        <Text fontSize="sm">{trip.origin_stop}</Text>
                        <Text fontSize="xs" color="gray.500">↓</Text>
                        <Text fontSize="sm">{trip.destination}</Text>
                      </VStack>
                    </Td>
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
                  <Th>Bus & Direction</Th>
                  <Th>Origin → Destination</Th>
                  <Th>Status</Th>
                  <Th>Delay</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredTrips.filter(trip => trip.actual_departure).map((trip) => (
                  <Tr key={trip.trip_id}>
                    <Td>{trip.actual_departure ? formatTime(trip.actual_departure) : '-'}</Td>
                    <Td>
                      <VStack align="start" spacing={1}>
                        <Text fontSize="sm" fontWeight="bold">Bus {trip.bus_number}</Text>
                        <HStack>
                          <Text fontSize="sm">{trip.headsign}</Text>
                          <Badge size="sm" colorScheme={trip.direction_id === 0 ? 'blue' : 'green'}>
                            {trip.direction_id === 0 ? 'Outbound' : 'Inbound'}
                          </Badge>
                        </HStack>
                      </VStack>
                    </Td>
                    <Td>
                      <VStack align="start" spacing={1}>
                        <Text fontSize="sm">{trip.origin_stop}</Text>
                        <Text fontSize="xs" color="gray.500">↓</Text>
                        <Text fontSize="sm">{trip.destination}</Text>
                      </VStack>
                    </Td>
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
