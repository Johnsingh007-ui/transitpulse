import React from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  HStack,
  Badge,
  Icon,
  Tooltip,
  useColorModeValue,
  Container
} from '@chakra-ui/react';
import { 
  FiWifi, 
  FiWifiOff, 
  FiClock, 
  FiTruck,
  FiActivity
} from 'react-icons/fi';
// Removed motion import to fix deprecation warning

interface LiveOperationsHeaderProps {
  selectedAgency: string;
  onAgencyChange: (agency: string) => void;
  selectedRoute: string | null;
  onRouteChange: (route: string | null) => void;
}

const LiveOperationsHeader: React.FC<LiveOperationsHeaderProps> = ({
  selectedAgency,
  onAgencyChange,
  selectedRoute,
  onRouteChange
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Mock data for now - these could be fetched from API
  const totalTrips = 156;
  const onTimePercentage = 87.3;
  const lastUpdated = new Date();
  const isConnected = true; // Default to connected for now
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 90) return 'green';
    if (percentage >= 80) return 'yellow';
    return 'red';
  };

  return (
    <Box
      bg={bgColor}
      borderBottom="1px"
      borderColor={borderColor}
      py={4}
      px={6}
      shadow="sm"
    >
      <Container maxW="7xl">
        <Flex justify="space-between" align="center">
          {/* Left side - Title and Live indicator */}
          <HStack spacing={4}>
            <Box>
              <Heading size="lg" color="blue.600" fontWeight="bold">
                TransitPulse
              </Heading>
              <Text fontSize="sm" color="gray.500">
                Live Operations Dashboard
              </Text>
            </Box>
            
            <Tooltip label={isConnected ? 'Connected to real-time feed' : 'Connection lost'}>
              <HStack 
                spacing={2} 
                px={3} 
                py={1} 
                rounded="full" 
                bg={isConnected ? 'green.50' : 'red.50'}
                border="1px"
                borderColor={isConnected ? 'green.200' : 'red.200'}
              >
                <Icon 
                  as={isConnected ? FiWifi : FiWifiOff} 
                  color={isConnected ? 'green.500' : 'red.500'}
                  fontSize="sm"
                />
                <Text 
                  fontSize="xs" 
                  fontWeight="medium"
                  color={isConnected ? 'green.700' : 'red.700'}
                >
                  {isConnected ? 'LIVE' : 'OFFLINE'}
                </Text>
              </HStack>
            </Tooltip>
          </HStack>

          {/* Right side - Stats and Status */}
          <HStack spacing={6}>
            {/* Active Buses */}
            <HStack spacing={2}>
              <Icon as={FiTruck} color="blue.500" />
              <Box>
                <Text fontSize="xs" color="gray.500" fontWeight="medium">
                  ACTIVE BUSES
                </Text>
                <Text fontSize="lg" fontWeight="bold" color="blue.600">
                  {totalTrips}
                </Text>
              </Box>
            </HStack>

            {/* On-Time Performance */}
            <HStack spacing={2}>
              <Icon as={FiActivity} color={getPerformanceColor(onTimePercentage) + '.500'} />
              <Box>
                <Text fontSize="xs" color="gray.500" fontWeight="medium">
                  ON-TIME
                </Text>
                <Text 
                  fontSize="lg" 
                  fontWeight="bold" 
                  color={getPerformanceColor(onTimePercentage) + '.600'}
                >
                  {onTimePercentage.toFixed(1)}%
                </Text>
              </Box>
            </HStack>

            {/* Last Update */}
            <HStack spacing={2}>
              <Icon as={FiClock} color="gray.500" />
              <Box>
                <Text fontSize="xs" color="gray.500" fontWeight="medium">
                  LAST UPDATE
                </Text>
                <Text fontSize="sm" fontWeight="medium" color="gray.700">
                  {formatTime(lastUpdated)}
                </Text>
              </Box>
            </HStack>

            {/* Live Badge */}
            <Box>
              <Badge
                colorScheme={isConnected ? 'green' : 'red'}
                variant="solid"
                fontSize="xs"
                px={3}
                py={1}
                rounded="full"
                textTransform="uppercase"
                letterSpacing="wide"
              >
                ● {isConnected ? 'Real-Time' : 'Disconnected'}
              </Badge>
            </Box>
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
};

export default LiveOperationsHeader;
