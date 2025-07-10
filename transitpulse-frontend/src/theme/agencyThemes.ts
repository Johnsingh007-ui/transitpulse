import { extendTheme, ThemeConfig } from '@chakra-ui/react';

// Agency-specific theme configurations
export interface AgencyTheme {
  name: string;
  displayName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logo?: string;
  favicon?: string;
  headerStyle: 'standard' | 'minimal' | 'branded';
  mapStyle: 'standard' | 'dark' | 'satellite' | 'minimal';
  colors: {
    brand: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
    };
    accent: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
    };
  };
  fonts: {
    heading: string;
    body: string;
  };
  config: {
    enableLiveData: boolean;
    autoRefreshInterval: number;
    defaultMapCenter: [number, number];
    defaultMapZoom: number;
    showAdvancedFeatures: boolean;
    enableAlerts: boolean;
    enablePredictions: boolean;
  };
}

// Golden Gate Transit theme
export const goldenGateTheme: AgencyTheme = {
  name: 'golden_gate',
  displayName: 'Golden Gate Transit',
  primaryColor: '#1e3a8a', // Blue
  secondaryColor: '#f59e0b', // Amber
  accentColor: '#059669', // Emerald
  headerStyle: 'branded',
  mapStyle: 'standard',
  colors: {
    brand: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    accent: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
    },
  },
  fonts: {
    heading: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  },
  config: {
    enableLiveData: true,
    autoRefreshInterval: 30000,
    defaultMapCenter: [37.8272, -122.4814], // San Francisco Bay Area
    defaultMapZoom: 10,
    showAdvancedFeatures: true,
    enableAlerts: true,
    enablePredictions: true,
  },
};

// SF Muni theme
export const sfMuniTheme: AgencyTheme = {
  name: 'sf_muni',
  displayName: 'San Francisco Municipal Transportation Agency',
  primaryColor: '#d32f2f', // Red
  secondaryColor: '#1976d2', // Blue
  accentColor: '#388e3c', // Green
  headerStyle: 'standard',
  mapStyle: 'standard',
  colors: {
    brand: {
      50: '#ffebee',
      100: '#ffcdd2',
      200: '#ef9a9a',
      300: '#e57373',
      400: '#ef5350',
      500: '#f44336',
      600: '#e53935',
      700: '#d32f2f',
      800: '#c62828',
      900: '#b71c1c',
    },
    accent: {
      50: '#e8f5e8',
      100: '#c8e6c9',
      200: '#a5d6a7',
      300: '#81c784',
      400: '#66bb6a',
      500: '#4caf50',
      600: '#43a047',
      700: '#388e3c',
      800: '#2e7d32',
      900: '#1b5e20',
    },
  },
  fonts: {
    heading: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    body: '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  },
  config: {
    enableLiveData: true,
    autoRefreshInterval: 15000,
    defaultMapCenter: [37.7749, -122.4194], // San Francisco
    defaultMapZoom: 12,
    showAdvancedFeatures: true,
    enableAlerts: true,
    enablePredictions: true,
  },
};

// AC Transit theme
export const acTransitTheme: AgencyTheme = {
  name: 'ac_transit',
  displayName: 'AC Transit',
  primaryColor: '#00695c', // Teal
  secondaryColor: '#ff6f00', // Orange
  accentColor: '#1565c0', // Blue
  headerStyle: 'minimal',
  mapStyle: 'standard',
  colors: {
    brand: {
      50: '#e0f2f1',
      100: '#b2dfdb',
      200: '#80cbc4',
      300: '#4db6ac',
      400: '#26a69a',
      500: '#009688',
      600: '#00897b',
      700: '#00796b',
      800: '#00695c',
      900: '#004d40',
    },
    accent: {
      50: '#e3f2fd',
      100: '#bbdefb',
      200: '#90caf9',
      300: '#64b5f6',
      400: '#42a5f5',
      500: '#2196f3',
      600: '#1e88e5',
      700: '#1976d2',
      800: '#1565c0',
      900: '#0d47a1',
    },
  },
  fonts: {
    heading: '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    body: '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  },
  config: {
    enableLiveData: true,
    autoRefreshInterval: 30000,
    defaultMapCenter: [37.8044, -122.2712], // Oakland
    defaultMapZoom: 11,
    showAdvancedFeatures: false, // Simplified for smaller agency
    enableAlerts: true,
    enablePredictions: false,
  },
};

// Demo/Default theme for new agencies
export const defaultTheme: AgencyTheme = {
  name: 'default',
  displayName: 'TransitPulse Demo',
  primaryColor: '#2563eb', // Blue
  secondaryColor: '#7c3aed', // Purple
  accentColor: '#059669', // Green
  headerStyle: 'standard',
  mapStyle: 'standard',
  colors: {
    brand: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    accent: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
    },
  },
  fonts: {
    heading: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  },
  config: {
    enableLiveData: true,
    autoRefreshInterval: 30000,
    defaultMapCenter: [37.7749, -122.4194], // San Francisco (default)
    defaultMapZoom: 10,
    showAdvancedFeatures: true,
    enableAlerts: true,
    enablePredictions: true,
  },
};

// Available themes registry
export const agencyThemes: Record<string, AgencyTheme> = {
  golden_gate: goldenGateTheme,
  sf_muni: sfMuniTheme,
  ac_transit: acTransitTheme,
  default: defaultTheme,
};

// Function to create Chakra UI theme from agency theme
export const createChakraTheme = (agencyTheme: AgencyTheme) => {
  const config: ThemeConfig = {
    initialColorMode: 'light',
    useSystemColorMode: false,
  };

  return extendTheme({
    config,
    colors: {
      brand: agencyTheme.colors.brand,
      accent: agencyTheme.colors.accent,
    },
    fonts: agencyTheme.fonts,
    styles: {
      global: {
        body: {
          bg: 'gray.50',
          color: 'gray.800',
        },
      },
    },
    components: {
      Button: {
        defaultProps: {
          colorScheme: 'brand',
        },
        variants: {
          solid: {
            bg: 'brand.500',
            color: 'white',
            _hover: {
              bg: 'brand.600',
            },
          },
          outline: {
            borderColor: 'brand.500',
            color: 'brand.500',
            _hover: {
              bg: 'brand.50',
              borderColor: 'brand.600',
            },
          },
        },
      },
      Badge: {
        defaultProps: {
          colorScheme: 'brand',
        },
      },
      Tabs: {
        defaultProps: {
          colorScheme: 'brand',
        },
      },
      Heading: {
        baseStyle: {
          fontWeight: '600',
        },
      },
    },
  });
};

// Utility function to get current agency theme
export const getCurrentAgencyTheme = (): AgencyTheme => {
  const agencyId = localStorage.getItem('agency_id') || 'default';
  return agencyThemes[agencyId] || defaultTheme;
};

// Utility function to set agency theme
export const setAgencyTheme = (agencyId: string): void => {
  if (agencyThemes[agencyId]) {
    localStorage.setItem('agency_id', agencyId);
    // Trigger a custom event to notify components of theme change
    window.dispatchEvent(new CustomEvent('agencyThemeChanged', { detail: agencyId }));
  }
};
