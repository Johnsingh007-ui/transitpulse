import React, { useState, useEffect } from 'react';
import {
  ChakraProvider,
  Box,
  Container,
  Grid,
  GridItem,
  VStack,
  HStack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useColorMode,
  IconButton,
  Tooltip,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { FiSun, FiMoon, FiActivity, FiMap, FiBarChart2, FiSettings } from 'react-icons/fi';

// Import components
import LiveOperations from './components/LiveOperations';
import RealTimeMap from './components/RealTimeMap';
import PerformanceDashboard from './components/PerformanceDashboard';
import LiveOperationsHeader from './components/LiveOperationsHeader';
import { ModernDashboard } from './components/ModernDashboard';
import ConnectionStatus from './components/ConnectionStatus';
import DataStatus from './components/DataStatus';
import RouteSelector from './components/RouteSelector';

const App: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [selectedAgency, setSelectedAgency] = useState<string>('golden_gate_transit');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');

  // Check backend connection on startup
  useEffect(() => {
    const checkConnection = async () => {
      try {
        setIsLoading(true);
        
        // Try the backend root endpoint first to check if it's accessible
        const response = await fetch('/api/v1/agencies/', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (response.ok) {
          setConnectionStatus('connected');
          setError(null);
        } else {
          throw new Error(`Backend responded with status: ${response.status}`);
        }
      } catch (err) {
        console.error('Backend connection error:', err);
        setError('Unable to connect to backend. Please ensure the backend is running on port 9002.');
        setConnectionStatus('disconnected');
      } finally {
        setIsLoading(false);
      }
    };

    checkConnection();
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <ChakraProvider>
        <Container maxW="container.xl" py={8}>
          <VStack spacing={4}>
            <Spinner size="xl" />
            <Box textAlign="center">
              Connecting to TransitPulse Backend...
            </Box>
          </VStack>
        </Container>
      </ChakraProvider>
    );
  }

  if (error) {
    return (
      <ChakraProvider>
        <Container maxW="container.xl" py={8}>
          <Alert status="error">
            <AlertIcon />
            <Box>
              <AlertTitle>Connection Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Box>
          </Alert>
        </Container>
      </ChakraProvider>
    );
  }

  return (
    <ChakraProvider>
      <Box minH="100vh" bg={colorMode === 'light' ? 'gray.50' : 'gray.900'}>
        {/* Header */}
        <Box
          bg={colorMode === 'light' ? 'white' : 'gray.800'}
          borderBottom="1px"
          borderColor={colorMode === 'light' ? 'gray.200' : 'gray.700'}
          px={4}
          py={3}
        >
          <Container maxW="container.xl">
            <HStack justify="space-between">
              <LiveOperationsHeader
                selectedAgency={selectedAgency}
                onAgencyChange={setSelectedAgency}
                selectedRoute={selectedRoute}
                onRouteChange={setSelectedRoute}
              />
              <HStack spacing={2}>
                <ConnectionStatus 
                  isConnected={connectionStatus === 'connected'} 
                  isLoading={connectionStatus === 'reconnecting'} 
                />
                <DataStatus />
                <Tooltip label={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`}>
                  <IconButton
                    aria-label="Toggle color mode"
                    icon={colorMode === 'light' ? <FiMoon /> : <FiSun />}
                    onClick={toggleColorMode}
                    variant="ghost"
                  />
                </Tooltip>
              </HStack>
            </HStack>
          </Container>
        </Box>

        {/* Main Content */}
        <Container maxW="container.xl" py={4}>
          <Tabs variant="enclosed" colorScheme="blue">
            <TabList>
              <Tab>
                <FiActivity style={{ marginRight: '8px' }} />
                Modern Dashboard
              </Tab>
              <Tab>
                <FiActivity style={{ marginRight: '8px' }} />
                Live Operations
              </Tab>
              <Tab>
                <FiMap style={{ marginRight: '8px' }} />
                Real-Time Map
              </Tab>
              <Tab>
                <FiBarChart2 style={{ marginRight: '8px' }} />
                Performance
              </Tab>
            </TabList>

            <TabPanels>
              {/* Modern Dashboard Tab */}
              <TabPanel p={0}>
                <Box h="calc(100vh - 200px)">
                  <ModernDashboard />
                </Box>
              </TabPanel>

              {/* Live Operations Tab */}
              <TabPanel p={0} pt={4}>
                <Grid templateColumns="1fr" gap={4}>
                  <GridItem>
                    <Box
                      bg={colorMode === 'light' ? 'white' : 'gray.800'}
                      borderRadius="lg"
                      border="1px"
                      borderColor={colorMode === 'light' ? 'gray.200' : 'gray.700'}
                      overflow="hidden"
                    >
                      <LiveOperations />
                    </Box>
                  </GridItem>
                </Grid>
              </TabPanel>

              {/* Real-Time Map Tab */}
              <TabPanel p={0} pt={4}>
                <Grid templateColumns="300px 1fr" gap={4} h="calc(100vh - 200px)">
                  <GridItem>
                    <Box
                      bg={colorMode === 'light' ? 'white' : 'gray.800'}
                      borderRadius="lg"
                      border="1px"
                      borderColor={colorMode === 'light' ? 'gray.200' : 'gray.700'}
                      p={4}
                      h="100%"
                    >
                      <RouteSelector
                        selectedRoute={selectedRoute}
                        onRouteChange={setSelectedRoute}
                        selectedAgency={selectedAgency}
                      />
                    </Box>
                  </GridItem>
                  <GridItem>
                    <Box
                      bg={colorMode === 'light' ? 'white' : 'gray.800'}
                      borderRadius="lg"
                      border="1px"
                      borderColor={colorMode === 'light' ? 'gray.200' : 'gray.700'}
                      overflow="hidden"
                      h="100%"
                    >
                      <RealTimeMap selectedRoute={selectedRoute} />
                    </Box>
                  </GridItem>
                </Grid>
              </TabPanel>

              {/* Performance Dashboard Tab */}
              <TabPanel p={0} pt={4}>
                <Box
                  bg={colorMode === 'light' ? 'white' : 'gray.800'}
                  borderRadius="lg"
                  border="1px"
                  borderColor={colorMode === 'light' ? 'gray.200' : 'gray.700'}
                  overflow="hidden"
                >
                  <PerformanceDashboard
                    selectedRoute={selectedRoute}
                    selectedAgency={selectedAgency}
                  />
                </Box>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Container>
      </Box>
    </ChakraProvider>
  );
};

export default App;
