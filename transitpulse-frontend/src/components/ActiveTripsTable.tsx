import React, { useState } from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Box,
  Badge,
  Text,
  HStack,
  Icon,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Flex,
  useColorModeValue,
  Avatar,
  AvatarBadge,
  Progress,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton
} from '@chakra-ui/react';
import {
  FiTruck,
  FiClock,
  FiMapPin,
  FiActivity,
  FiSearch,
  FiFilter,
  FiMoreVertical,
  FiEye,
  FiNavigation,
  FiTrendingUp,
  FiTrendingDown,
  FiMinus,
  FiUsers
} from 'react-icons/fi';
import { motion } from 'framer-motion';

const MotionTr = motion(Tr);

interface ActiveTrip {
  vehicle_id: string;
  route_id: string;
  route_short_name: string;
  trip_headsign: string;
  status: 'on_time' | 'late' | 'early' | 'delayed';
  delay_minutes: number;
  progress_percentage: number;
  current_stop_name?: string;
  last_updated: string;
}

interface ActiveTripsTableProps {
  trips: ActiveTrip[];
}

const ActiveTripsTable: React.FC<ActiveTripsTableProps> = ({ trips }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'vehicle_id' | 'route' | 'status' | 'delay'>('vehicle_id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const tableBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  // Enhanced trips with additional computed data
  const enhancedTrips = trips.map(trip => ({
    ...trip,
    // Generate mock additional data for demo
    start_time: generateStartTime(),
    schedule_adherence: generateScheduleAdherence(),
    headway_deviation: generateHeadwayDeviation(),
    crowding: generateCrowdingLevel(),
    trip_id: `${trip.route_id}_${trip.vehicle_id}_${Date.now()}`,
    block_id: Math.floor(Math.random() * 9000) + 1000,
    operator_id: '-'
  }));

  function generateStartTime(): string {
    const now = new Date();
    const start = new Date(now.getTime() - Math.random() * 4 * 60 * 60 * 1000); // 0-4 hours ago
    return start.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  function generateScheduleAdherence(): string {
    const adherence = Math.random() * 20 - 10; // -10 to +10 minutes
    const sign = adherence >= 0 ? '+' : '';
    return `${sign}${adherence.toFixed(1)}m`;
  }

  function generateHeadwayDeviation(): string {
    const deviation = Math.random() * 10 - 5; // -5 to +5 minutes
    const minutes = Math.floor(Math.abs(deviation));
    const seconds = Math.floor((Math.abs(deviation) % 1) * 60);
    const sign = deviation >= 0 ? '+' : '-';
    return `${sign}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}m`;
  }

  function generateCrowdingLevel(): 'low' | 'medium' | 'high' {
    const levels: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
    return levels[Math.floor(Math.random() * levels.length)];
  }

  // Filter and sort trips
  const filteredTrips = enhancedTrips
    .filter(trip => {
      const matchesSearch = 
        trip.vehicle_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.route_short_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.trip_headsign.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (trip.current_stop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      
      const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortBy) {
        case 'vehicle_id':
          aVal = parseInt(a.vehicle_id) || 0;
          bVal = parseInt(b.vehicle_id) || 0;
          break;
        case 'route':
          aVal = parseInt(a.route_short_name) || 0;
          bVal = parseInt(b.route_short_name) || 0;
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'delay':
          aVal = a.delay_minutes;
          bVal = b.delay_minutes;
          break;
        default:
          aVal = a.vehicle_id;
          bVal = b.vehicle_id;
      }
      
      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_time': return 'green';
      case 'early': return 'blue';
      case 'late': return 'yellow';
      case 'delayed': return 'red';
      default: return 'gray';
    }
  };

  const getCrowdingColor = (level: string) => {
    switch (level) {
      case 'low': return 'green';
      case 'medium': return 'yellow';
      case 'high': return 'red';
      default: return 'gray';
    }
  };

  const formatLastUpdated = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getDeviationIcon = (deviation: string) => {
    if (deviation.startsWith('+')) return FiTrendingUp;
    if (deviation.startsWith('-')) return FiTrendingDown;
    return FiMinus;
  };

  const getDeviationColor = (deviation: string) => {
    if (deviation.startsWith('+')) return 'red';
    if (deviation.startsWith('-')) return 'green';
    return 'gray';
  };

  return (
    <Box>
      {/* Filters and Search */}
      <Flex mb={6} gap={4} wrap="wrap" align="center" justify="space-between">
        <HStack spacing={4} flex={1}>
          <InputGroup maxW="300px">
            <InputLeftElement pointerEvents="none">
              <Icon as={FiSearch} color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Search vehicles, routes, or destinations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            maxW="150px"
          >
            <option value="all">All Status</option>
            <option value="on_time">On-Time</option>
            <option value="early">Early</option>
            <option value="late">Late</option>
            <option value="delayed">Delayed</option>
          </Select>
        </HStack>

        <HStack spacing={2}>
          <Text fontSize="sm" color="gray.500">
            {filteredTrips.length} of {trips.length} trips
          </Text>
          <Menu>
            <MenuButton
              as={IconButton}
              icon={<FiFilter />}
              variant="outline"
              size="sm"
            />
            <MenuList>
              <MenuItem onClick={() => setSortBy('vehicle_id')}>
                Sort by Vehicle ID
              </MenuItem>
              <MenuItem onClick={() => setSortBy('route')}>
                Sort by Route
              </MenuItem>
              <MenuItem onClick={() => setSortBy('status')}>
                Sort by Status
              </MenuItem>
              <MenuItem onClick={() => setSortBy('delay')}>
                Sort by Delay
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Flex>

      {/* Table */}
      <Box bg={tableBg} rounded="lg" overflow="hidden" border="1px" borderColor={borderColor}>
        <Table variant="simple" size="md">
          <Thead bg={useColorModeValue('gray.50', 'gray.700')}>
            <Tr>
              <Th>Vehicle</Th>
              <Th>Status</Th>
              <Th>Start Time</Th>
              <Th>Schedule Adherence</Th>
              <Th>Headway Deviation</Th>
              <Th>Crowding</Th>
              <Th>Route</Th>
              <Th>Operator ID</Th>
              <Th>Trip ID</Th>
              <Th>Block ID</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredTrips.map((trip, index) => (
              <MotionTr
                key={trip.vehicle_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                _hover={{ bg: hoverBg }}
              >
                {/* Vehicle */}
                <Td>
                  <HStack spacing={3}>
                    <Avatar size="sm" bg={`${getStatusColor(trip.status)}.500`}>
                      <Text color="white" fontWeight="bold" fontSize="xs">
                        {trip.vehicle_id}
                      </Text>
                      <AvatarBadge boxSize="1.25em" bg={`${getStatusColor(trip.status)}.500`}>
                        <Icon as={FiTruck} fontSize="xs" color="white" />
                      </AvatarBadge>
                    </Avatar>
                    <Box>
                      <Text fontWeight="bold">{trip.vehicle_id}</Text>
                      <Text fontSize="xs" color="gray.500">
                        {formatLastUpdated(trip.last_updated)}
                      </Text>
                    </Box>
                  </HStack>
                </Td>

                {/* Status */}
                <Td>
                  <Badge
                    colorScheme={getStatusColor(trip.status)}
                    variant="solid"
                    textTransform="capitalize"
                    display="flex"
                    alignItems="center"
                    w="fit-content"
                    gap={1}
                  >
                    <Icon as={FiActivity} fontSize="xs" />
                    {trip.status.replace('_', ' ')}
                  </Badge>
                </Td>

                {/* Start Time */}
                <Td>
                  <HStack spacing={2}>
                    <Icon as={FiClock} fontSize="sm" color="gray.500" />
                    <Text>{trip.start_time}</Text>
                  </HStack>
                </Td>

                {/* Schedule Adherence */}
                <Td>
                  <HStack spacing={2}>
                    <Icon 
                      as={getDeviationIcon(trip.schedule_adherence)} 
                      fontSize="sm" 
                      color={`${getDeviationColor(trip.schedule_adherence)}.500`}
                    />
                    <Text 
                      fontWeight="medium"
                      color={`${getDeviationColor(trip.schedule_adherence)}.600`}
                    >
                      {trip.schedule_adherence}
                    </Text>
                  </HStack>
                </Td>

                {/* Headway Deviation */}
                <Td>
                  <HStack spacing={2}>
                    <Icon 
                      as={getDeviationIcon(trip.headway_deviation)} 
                      fontSize="sm" 
                      color={`${getDeviationColor(trip.headway_deviation)}.500`}
                    />
                    <Text 
                      fontWeight="medium"
                      color={`${getDeviationColor(trip.headway_deviation)}.600`}
                    >
                      {trip.headway_deviation}
                    </Text>
                  </HStack>
                </Td>

                {/* Crowding */}
                <Td>
                  <Badge
                    colorScheme={getCrowdingColor(trip.crowding)}
                    variant="subtle"
                    textTransform="capitalize"
                    display="flex"
                    alignItems="center"
                    w="fit-content"
                    gap={1}
                  >
                    <Icon as={FiUsers} fontSize="xs" />
                    {trip.crowding}
                  </Badge>
                </Td>

                {/* Route */}
                <Td>
                  <HStack spacing={2}>
                    <Badge colorScheme="blue" variant="outline">
                      {trip.route_short_name}
                    </Badge>
                    <Box>
                      <Text fontSize="sm" fontWeight="medium">
                        {trip.trip_headsign}
                      </Text>
                      {trip.current_stop_name && (
                        <Text fontSize="xs" color="gray.500">
                          at {trip.current_stop_name}
                        </Text>
                      )}
                    </Box>
                  </HStack>
                </Td>

                {/* Operator ID */}
                <Td>
                  <Text color="gray.500">{trip.operator_id}</Text>
                </Td>

                {/* Trip ID */}
                <Td>
                  <Text fontFamily="mono" fontSize="xs" color="gray.600">
                    {trip.trip_id.slice(-6)}
                  </Text>
                </Td>

                {/* Block ID */}
                <Td>
                  <Text fontFamily="mono" fontSize="sm">
                    {trip.block_id}
                  </Text>
                </Td>

                {/* Actions */}
                <Td>
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      icon={<FiMoreVertical />}
                      variant="ghost"
                      size="sm"
                    />
                    <MenuList>
                      <MenuItem icon={<FiEye />}>
                        View Details
                      </MenuItem>
                      <MenuItem icon={<FiMapPin />}>
                        Track on Map
                      </MenuItem>
                      <MenuItem icon={<FiNavigation />}>
                        Route Progress
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </Td>
              </MotionTr>
            ))}
          </Tbody>
        </Table>

        {filteredTrips.length === 0 && (
          <Box textAlign="center" py={12}>
            <Icon as={FiTruck} fontSize="3xl" color="gray.400" mb={4} />
            <Text fontSize="lg" color="gray.500" mb={2}>
              No trips found
            </Text>
            <Text fontSize="sm" color="gray.400">
              Try adjusting your search or filter criteria
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ActiveTripsTable;
