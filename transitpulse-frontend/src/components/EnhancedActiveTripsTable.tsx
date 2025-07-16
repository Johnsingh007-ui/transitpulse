import React, { useState, useMemo } from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Text,
  HStack,
  VStack,
  Icon,
  Button,
  ButtonGroup,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Flex,
  Tooltip,
  Progress,
  useColorModeValue,
  Divider,
} from '@chakra-ui/react';
import { FiSearch, FiUsers, FiClock, FiNavigation, FiAlertTriangle, FiFilter } from 'react-icons/fi';

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
  blockId?: string;
  startTime?: string;
}

interface ActiveTripsTableProps {
  vehicles?: Vehicle[];
}

type StatusFilter = 'all' | 'missing' | 'early' | 'late' | 'on-time' | 'layover';

export const ActiveTripsTable: React.FC<ActiveTripsTableProps> = ({ vehicles = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const headerBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'early': return 'red';
      case 'on-time': return 'green';
      case 'late': return 'yellow';
      case 'missing': return 'gray';
      case 'layover': return 'blue';
      default: return 'gray';
    }
  };

  const getCrowdingIcon = (crowding?: string) => {
    switch (crowding) {
      case 'high': return { icon: FiUsers, color: 'red.500' };
      case 'medium': return { icon: FiUsers, color: 'yellow.500' };
      case 'low': return { icon: FiUsers, color: 'green.500' };
      default: return null;
    }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '-';
    return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDeviation = (deviation?: number) => {
    if (deviation === undefined) return '-';
    const sign = deviation >= 0 ? '+' : '';
    const minutes = Math.abs(deviation);
    const seconds = Math.round((minutes % 1) * 60);
    return `${sign}${Math.floor(minutes)}:${seconds.toString().padStart(2, '0')}m`;
  };

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle => {
      const matchesSearch = !searchTerm || 
        vehicle.vehicle_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.route_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.operator?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.trip_id?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchTerm, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts = {
      all: vehicles.length,
      missing: 0,
      early: 0,
      late: 0,
      'on-time': 0,
      layover: 0,
    };

    vehicles.forEach(vehicle => {
      if (vehicle.status && counts.hasOwnProperty(vehicle.status)) {
        counts[vehicle.status as keyof typeof counts]++;
      }
    });

    return counts;
  }, [vehicles]);

  return (
    <Box bg={bgColor} h="full" display="flex" flexDirection="column">
      {/* Header with filters */}
      <VStack spacing={4} p={4} align="stretch">
        <Text fontSize="lg" fontWeight="semibold">Active Trips</Text>
        
        {/* Status filter tabs */}
        <ButtonGroup size="sm" variant="outline" spacing={0}>
          <Button
            isActive={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
            borderRadius="md"
            borderRightRadius={0}
          >
            All ({statusCounts.all})
          </Button>
          <Button
            isActive={statusFilter === 'missing'}
            onClick={() => setStatusFilter('missing')}
            borderRadius={0}
            borderLeft="none"
            leftIcon={<Icon as={FiAlertTriangle} boxSize={3} />}
          >
            Missing ({statusCounts.missing})
          </Button>
          <Button
            isActive={statusFilter === 'early'}
            onClick={() => setStatusFilter('early')}
            borderRadius={0}
            borderLeft="none"
            colorScheme={statusFilter === 'early' ? 'red' : undefined}
          >
            Early ({statusCounts.early})
          </Button>
          <Button
            isActive={statusFilter === 'late'}
            onClick={() => setStatusFilter('late')}
            borderRadius={0}
            borderLeft="none"
            colorScheme={statusFilter === 'late' ? 'yellow' : undefined}
          >
            Late ({statusCounts.late})
          </Button>
          <Button
            isActive={statusFilter === 'on-time'}
            onClick={() => setStatusFilter('on-time')}
            borderRadius={0}
            borderLeft="none"
            colorScheme={statusFilter === 'on-time' ? 'green' : undefined}
          >
            On-Time ({statusCounts['on-time']})
          </Button>
          <Button
            isActive={statusFilter === 'layover'}
            onClick={() => setStatusFilter('layover')}
            borderRadius={0}
            borderLeft="none"
            borderLeftRadius={0}
            borderRightRadius="md"
            colorScheme={statusFilter === 'layover' ? 'blue' : undefined}
          >
            Layover/Deadhead ({statusCounts.layover})
          </Button>
        </ButtonGroup>

        {/* Search */}
        <InputGroup size="sm" maxW="300px">
          <InputLeftElement pointerEvents="none">
            <Icon as={FiSearch} color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Vehicle, block, stop, operator..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
      </VStack>

      <Divider />

      {/* Table */}
      <Box flex={1} overflowY="auto">
        <Table variant="simple" size="sm">
          <Thead bg={headerBg} position="sticky" top={0} zIndex={1}>
            <Tr>
              <Th border="none" color="gray.600" fontSize="xs" fontWeight="semibold">Vehicle</Th>
              <Th border="none" color="gray.600" fontSize="xs" fontWeight="semibold">Status</Th>
              <Th border="none" color="gray.600" fontSize="xs" fontWeight="semibold">Start Time</Th>
              <Th border="none" color="gray.600" fontSize="xs" fontWeight="semibold">Schedule Adherence</Th>
              <Th border="none" color="gray.600" fontSize="xs" fontWeight="semibold">Headway Deviation</Th>
              <Th border="none" color="gray.600" fontSize="xs" fontWeight="semibold">Crowding</Th>
              <Th border="none" color="gray.600" fontSize="xs" fontWeight="semibold">Route</Th>
              <Th border="none" color="gray.600" fontSize="xs" fontWeight="semibold">Operator ID</Th>
              <Th border="none" color="gray.600" fontSize="xs" fontWeight="semibold">Trip ID</Th>
              <Th border="none" color="gray.600" fontSize="xs" fontWeight="semibold">Block ID</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredVehicles.map((vehicle, index) => {
              const crowdingInfo = getCrowdingIcon(vehicle.crowding);
              
              return (
                <Tr 
                  key={vehicle.vehicle_id} 
                  borderBottom="1px" 
                  borderColor={borderColor}
                  _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
                >
                  <Td border="none" py={3}>
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="medium" fontSize="sm">{vehicle.vehicle_id}</Text>
                      {vehicle.operator && (
                        <Text fontSize="xs" color="gray.500">Operator: {vehicle.operator}</Text>
                      )}
                    </VStack>
                  </Td>
                  
                  <Td border="none">
                    <Badge
                      colorScheme={getStatusColor(vehicle.status)}
                      variant="subtle"
                      fontSize="xs"
                      textTransform="capitalize"
                    >
                      {vehicle.status || 'Unknown'}
                    </Badge>
                  </Td>
                  
                  <Td border="none">
                    <Text fontSize="sm">{formatTime(vehicle.startTime)}</Text>
                  </Td>
                  
                  <Td border="none">
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm" fontWeight="medium">
                        {formatDeviation(vehicle.scheduleAdherence)}
                      </Text>
                      {vehicle.scheduleAdherence !== undefined && (
                        <Progress 
                          value={Math.min(Math.abs(vehicle.scheduleAdherence), 10) * 10}
                          size="xs" 
                          colorScheme={
                            Math.abs(vehicle.scheduleAdherence) < 2 ? 'green' :
                            Math.abs(vehicle.scheduleAdherence) < 5 ? 'yellow' : 'red'
                          }
                          w="60px"
                        />
                      )}
                    </VStack>
                  </Td>
                  
                  <Td border="none">
                    <Text fontSize="sm">{formatDeviation(vehicle.headwayDeviation)}</Text>
                  </Td>
                  
                  <Td border="none">
                    {crowdingInfo && (
                      <Tooltip label={`Crowding: ${vehicle.crowding}`}>
                        <HStack spacing={1}>
                          <Icon as={crowdingInfo.icon} color={crowdingInfo.color} boxSize={4} />
                          <Icon as={crowdingInfo.icon} color={crowdingInfo.color} boxSize={4} />
                        </HStack>
                      </Tooltip>
                    )}
                  </Td>
                  
                  <Td border="none">
                    <Text fontSize="sm" fontWeight="medium">{vehicle.route_id}</Text>
                  </Td>
                  
                  <Td border="none">
                    <Text fontSize="sm">{vehicle.operator || '-'}</Text>
                  </Td>
                  
                  <Td border="none">
                    <Text fontSize="sm" fontFamily="mono">{vehicle.trip_id || '-'}</Text>
                  </Td>
                  
                  <Td border="none">
                    <Text fontSize="sm" fontFamily="mono">{vehicle.blockId || '-'}</Text>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
        
        {filteredVehicles.length === 0 && (
          <Box p={8} textAlign="center">
            <Text color="gray.500">No vehicles match your current filters</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};
