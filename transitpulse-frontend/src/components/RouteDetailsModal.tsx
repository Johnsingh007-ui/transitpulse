import React, { useEffect, useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalCloseButton, ModalBody, ModalFooter, Button,
  Text, Spinner, Box, VStack, HStack, Badge, Tabs, 
  TabList, TabPanels, Tab, TabPanel, Alert, AlertIcon,
  Icon, Stat, StatLabel, StatNumber, StatGroup
} from '@chakra-ui/react';
import { FaBus, FaMapMarkerAlt, FaWheelchair, FaExternalLinkAlt } from 'react-icons/fa';
import { getRouteStops, Route, Stop } from '../api/apiClient';

interface RouteDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  route: Route | null;
}

const RouteDetailsModal: React.FC<RouteDetailsModalProps> = ({ isOpen, onClose, route }) => {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && route?.route_id) {
      setLoading(true);
      setError(null);
      getRouteStops(route.route_id)
        .then(res => {
          if (res.status === 'success') {
            setStops(res.data);
          } else {
            setError(res.message || 'Failed to load stops');
          }
        })
        .catch(err => {
          console.error('Error loading stops:', err);
          setError('Failed to load stops');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, route?.route_id]);

  const formatRouteColor = (color: string | null): string => {
    if (!color || color.length !== 6) return '#3182CE'; // Default blue
    return `#${color}`;
  };

  const getRouteTypeLabel = (routeType: number) => {
    switch(routeType) {
      case 0: return 'Tram';
      case 1: return 'Subway';
      case 2: return 'Rail';
      case 3: return 'Bus';
      case 4: return 'Ferry';
      case 5: return 'Cable Car';
      case 6: return 'Gondola';
      case 7: return 'Funicular';
      default: return 'Transit';
    }
  };

  if (!route) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="80vh">
        <ModalHeader
          bg={formatRouteColor(route.route_color)}
          color={route.route_text_color ? `#${route.route_text_color}` : 'white'}
          borderTopRadius="md"
        >
          <HStack spacing={3}>
            <Icon as={FaBus} boxSize={6} />
            <VStack align="start" spacing={0}>
              <Text fontSize="xl" fontWeight="bold">
                Route {route.route_short_name}
              </Text>
              <Text fontSize="md" fontWeight="normal">
                {route.route_long_name}
              </Text>
            </VStack>
          </HStack>
        </ModalHeader>
        <ModalCloseButton color={route.route_text_color ? `#${route.route_text_color}` : 'white'} />
        
        <ModalBody p={6}>
          {loading ? (
            <Box textAlign="center" py={8}>
              <Spinner size="lg" />
              <Text mt={4}>Loading route details...</Text>
            </Box>
          ) : error ? (
            <Alert status="error">
              <AlertIcon />
              {error}
            </Alert>
          ) : (
            <VStack spacing={6} align="stretch">
              {/* Route Information */}
              <Box>
                <Text fontSize="lg" fontWeight="semibold" mb={3}>Route Information</Text>
                <StatGroup>
                  <Stat>
                    <StatLabel>Type</StatLabel>
                    <StatNumber fontSize="md">
                      <Badge colorScheme="blue" variant="subtle">
                        {getRouteTypeLabel(route.route_type)}
                      </Badge>
                    </StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Total Stops</StatLabel>
                    <StatNumber>{stops.length}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Agency</StatLabel>
                    <StatNumber fontSize="md">{route.agency_id}</StatNumber>
                  </Stat>
                </StatGroup>
                
                {route.route_url && (
                  <Box mt={4}>
                    <Button
                      as="a"
                      href={route.route_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      leftIcon={<FaExternalLinkAlt />}
                      colorScheme="blue"
                      variant="outline"
                      size="sm"
                    >
                      View Schedule
                    </Button>
                  </Box>
                )}
              </Box>

              <Tabs colorScheme="blue">
                <TabList>
                  <Tab>Stops ({stops.length})</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel px={0}>
                    <VStack spacing={3} align="stretch" maxH="400px" overflowY="auto">
                      {stops.length === 0 ? (
                        <Text color="gray.500" textAlign="center" py={4}>
                          No stops found for this route
                        </Text>
                      ) : (
                        stops.map((stop, index) => (
                          <Box
                            key={stop.stop_id}
                            p={4}
                            borderWidth={1}
                            borderRadius="md"
                            bg="gray.50"
                          >
                            <HStack justify="space-between">
                              <VStack align="start" spacing={1}>
                                <HStack>
                                  <Icon as={FaMapMarkerAlt} color="red.500" />
                                  <Text fontWeight="semibold">{stop.stop_name}</Text>
                                  {stop.wheelchair_boarding === 1 && (
                                    <Icon as={FaWheelchair} color="blue.500" />
                                  )}
                                </HStack>
                                <Text fontSize="sm" color="gray.600">
                                  Stop ID: {stop.stop_id}
                                  {stop.stop_code && ` • Code: ${stop.stop_code}`}
                                </Text>
                                {stop.stop_lat && stop.stop_lon && (
                                  <Text fontSize="xs" color="gray.500">
                                    {stop.stop_lat.toFixed(6)}, {stop.stop_lon.toFixed(6)}
                                  </Text>
                                )}
                              </VStack>
                              <Badge colorScheme="gray" variant="subtle">
                                #{index + 1}
                              </Badge>
                            </HStack>
                          </Box>
                        ))
                      )}
                    </VStack>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </VStack>
          )}
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default RouteDetailsModal;
