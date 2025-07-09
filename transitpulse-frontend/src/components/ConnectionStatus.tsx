import React from 'react';
import { Box, HStack, Text, Spinner, Tooltip } from '@chakra-ui/react';

type ConnectionStatusProps = {
  isConnected: boolean;
  isLoading: boolean;
  lastUpdate?: Date | null;
};

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isLoading,
  lastUpdate,
}) => {
  const getStatusColor = () => {
    if (isLoading) return 'yellow.500';
    return isConnected ? 'green.500' : 'red.500';
  };

  const getStatusText = () => {
    if (isLoading) return 'Connecting...';
    return isConnected ? 'Connected' : 'Disconnected';
  };

  const formatLastUpdate = (date: Date | null | undefined, full = false) => {
    if (!date) return 'Never updated';
    
    const timeString = date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    if (full) {
      const dateString = date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      return `Last updated: ${dateString}`;
    }
    
    return `Last updated: ${timeString}`;
  };

  return (
    <Box
      position="absolute"
      bottom="4"
      right="4"
      bg="white"
      p={2}
      borderRadius="md"
      boxShadow="md"
      zIndex={1000}
    >
      <HStack spacing={2}>
        <Box
          w="12px"
          h="12px"
          borderRadius="full"
          bg={getStatusColor()}
          flexShrink={0}
        />
        <Box>
          <Text fontSize="sm" fontWeight="medium">
            {getStatusText()}
            {isLoading && <Spinner size="xs" ml={2} aria-label="Connecting..." />}
          </Text>
          <Tooltip 
            label={formatLastUpdate(lastUpdate, true)} 
            placement="top"
            hasArrow
            bg="gray.700"
            color="white"
            fontSize="xs"
            px={2}
            py={1}
            borderRadius="md"
          >
            <Text 
              fontSize="xs" 
              color="gray.500"
              _hover={{ textDecoration: 'underline', cursor: 'help' }}
            >
              {formatLastUpdate(lastUpdate)}
            </Text>
          </Tooltip>
        </Box>
      </HStack>
    </Box>
  );
};

export default ConnectionStatus;
