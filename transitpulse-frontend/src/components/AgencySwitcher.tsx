import React, { useState, useEffect } from 'react';
import {
  Box,
  Select,
  HStack,
  Text,
  Icon,
  Badge,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  VStack,
  Button,
  Image,
  Flex,
  useColorModeValue,
} from '@chakra-ui/react';
import { FaBuilding, FaInfoCircle, FaMapMarkerAlt, FaCog } from 'react-icons/fa';
import { agencyThemes, setAgencyTheme, getCurrentAgencyTheme, type AgencyTheme } from '../theme/agencyThemes';

interface AgencySwitcherProps {
  onAgencyChange?: (agencyId: string) => void;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const AgencySwitcher: React.FC<AgencySwitcherProps> = ({ 
  onAgencyChange, 
  showDetails = true,
  size = 'md' 
}) => {
  const [currentAgency, setCurrentAgency] = useState<string>(() => {
    return localStorage.getItem('agency_id') || 'default';
  });
  const [selectedTheme, setSelectedTheme] = useState<AgencyTheme>(getCurrentAgencyTheme());
  const { isOpen, onOpen, onClose } = useDisclosure();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    setSelectedTheme(getCurrentAgencyTheme());
  }, [currentAgency]);

  const handleAgencyChange = (agencyId: string) => {
    setCurrentAgency(agencyId);
    setAgencyTheme(agencyId);
    setSelectedTheme(agencyThemes[agencyId] || agencyThemes.default);
    onAgencyChange?.(agencyId);
    
    // Reload the page to apply new theme
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const getAgencyStatus = (agencyId: string): 'live' | 'demo' | 'coming_soon' => {
    switch (agencyId) {
      case 'golden_gate':
        return 'live';
      case 'sf_muni':
        return 'demo';
      case 'ac_transit':
        return 'demo';
      default:
        return 'demo';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'green';
      case 'demo':
        return 'blue';
      case 'coming_soon':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'live':
        return 'Live Data';
      case 'demo':
        return 'Demo Data';
      case 'coming_soon':
        return 'Coming Soon';
      default:
        return 'Demo';
    }
  };

  return (
    <>
      <Box>
        <HStack spacing={3}>
          <HStack spacing={2}>
            <Icon as={FaBuilding} color="brand.500" />
            <Text fontSize="sm" fontWeight="medium" color="gray.700">
              Transit Agency:
            </Text>
          </HStack>

          <Select
            value={currentAgency}
            onChange={(e) => handleAgencyChange(e.target.value)}
            size={size}
            maxW="250px"
            bg={bgColor}
            borderColor={borderColor}
            _focus={{
              borderColor: 'brand.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
            }}
          >
            {Object.entries(agencyThemes).map(([id, theme]) => (
              <option key={id} value={id}>
                {theme.displayName}
              </option>
            ))}
          </Select>

          {showDetails && (
            <>
              <Badge
                colorScheme={getStatusColor(getAgencyStatus(currentAgency))}
                size="sm"
                variant="subtle"
              >
                {getStatusLabel(getAgencyStatus(currentAgency))}
              </Badge>

              <Tooltip label="View agency details" hasArrow>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onOpen}
                  leftIcon={<FaInfoCircle />}
                >
                  Details
                </Button>
              </Tooltip>
            </>
          )}
        </HStack>
      </Box>

      {/* Agency Details Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader
            bg={`${selectedTheme.primaryColor}15`}
            borderTopRadius="md"
          >
            <HStack>
              <Icon as={FaBuilding} color={selectedTheme.primaryColor} />
              <Text>{selectedTheme.displayName}</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          
          <ModalBody pb={6}>
            <VStack spacing={6} align="stretch">
              {/* Agency Info */}
              <Box>
                <Text fontSize="lg" fontWeight="semibold" mb={3}>
                  Agency Information
                </Text>
                <VStack spacing={3} align="stretch">
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.600">Status:</Text>
                    <Badge
                      colorScheme={getStatusColor(getAgencyStatus(currentAgency))}
                      variant="subtle"
                    >
                      {getStatusLabel(getAgencyStatus(currentAgency))}
                    </Badge>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.600">Data Update Interval:</Text>
                    <Text fontSize="sm" fontWeight="medium">
                      {selectedTheme.config.autoRefreshInterval / 1000}s
                    </Text>
                  </HStack>

                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.600">Service Area:</Text>
                    <HStack>
                      <Icon as={FaMapMarkerAlt} color="gray.500" boxSize={3} />
                      <Text fontSize="sm" fontWeight="medium">
                        {selectedTheme.config.defaultMapCenter[0].toFixed(4)}, 
                        {selectedTheme.config.defaultMapCenter[1].toFixed(4)}
                      </Text>
                    </HStack>
                  </HStack>
                </VStack>
              </Box>

              {/* Features */}
              <Box>
                <Text fontSize="lg" fontWeight="semibold" mb={3}>
                  Available Features
                </Text>
                <VStack spacing={2} align="stretch">
                  <HStack justify="space-between">
                    <Text fontSize="sm">Real-time Vehicle Tracking</Text>
                    <Badge
                      colorScheme={selectedTheme.config.enableLiveData ? 'green' : 'gray'}
                      size="sm"
                    >
                      {selectedTheme.config.enableLiveData ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm">Service Alerts</Text>
                    <Badge
                      colorScheme={selectedTheme.config.enableAlerts ? 'green' : 'gray'}
                      size="sm"
                    >
                      {selectedTheme.config.enableAlerts ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm">Arrival Predictions</Text>
                    <Badge
                      colorScheme={selectedTheme.config.enablePredictions ? 'green' : 'gray'}
                      size="sm"
                    >
                      {selectedTheme.config.enablePredictions ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm">Advanced Analytics</Text>
                    <Badge
                      colorScheme={selectedTheme.config.showAdvancedFeatures ? 'green' : 'gray'}
                      size="sm"
                    >
                      {selectedTheme.config.showAdvancedFeatures ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </HStack>
                </VStack>
              </Box>

              {/* Theme Preview */}
              <Box>
                <Text fontSize="lg" fontWeight="semibold" mb={3}>
                  Theme Preview
                </Text>
                <HStack spacing={3} mb={3}>
                  <Box
                    w={8}
                    h={8}
                    bg={selectedTheme.primaryColor}
                    borderRadius="md"
                    border="2px solid white"
                    boxShadow="sm"
                  />
                  <Box
                    w={8}
                    h={8}
                    bg={selectedTheme.secondaryColor}
                    borderRadius="md"
                    border="2px solid white"
                    boxShadow="sm"
                  />
                  <Box
                    w={8}
                    h={8}
                    bg={selectedTheme.accentColor}
                    borderRadius="md"
                    border="2px solid white"
                    boxShadow="sm"
                  />
                  <Text fontSize="sm" color="gray.600" ml={2}>
                    Primary, Secondary, Accent Colors
                  </Text>
                </HStack>
                
                <Text fontSize="sm" color="gray.600">
                  <strong>Header Style:</strong> {selectedTheme.headerStyle} • 
                  <strong> Map Style:</strong> {selectedTheme.mapStyle}
                </Text>
              </Box>

              {/* Action Buttons */}
              <Flex gap={3}>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<FaCog />}
                  flex={1}
                  isDisabled
                >
                  Customize Theme
                </Button>
                <Button
                  size="sm"
                  colorScheme="brand"
                  onClick={onClose}
                  flex={1}
                >
                  Apply Changes
                </Button>
              </Flex>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default AgencySwitcher;
