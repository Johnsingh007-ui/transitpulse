import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

// Dark mode configuration
const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: true,
};

// Custom theme with dark mode support
const theme = extendTheme({
  config,
  colors: {
    brand: {
      50: '#e6f7ff',
      100: '#bae7ff', 
      200: '#91d5ff',
      300: '#69c0ff',
      400: '#40a9ff',
      500: '#1890ff', // Primary blue
      600: '#096dd9',
      700: '#0050b3',
      800: '#003a8c',
      900: '#002766',
    },
    accent: {
      50: '#fff7e6',
      100: '#ffe7ba',
      200: '#ffd591',
      300: '#ffc069',
      400: '#ffa940',
      500: '#fa8c16', // Golden Gate Transit orange
      600: '#d46b08',
      700: '#ad4e00',
      800: '#873800',
      900: '#612500',
    },
    transit: {
      early: '#FF6B6B',
      onTime: '#51CF66',
      late: '#FFD93D',
      missing: '#868E96',
      layover: '#339AF0',
    },
    gray: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e8e8e8',
      300: '#d9d9d9',
      400: '#bfbfbf',
      500: '#8c8c8c',
      600: '#595959',
      700: '#434343',
      800: '#262626',
      900: '#1f1f1f',
    }
  },
  styles: {
    global: (props: any) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'gray.900' : 'white',
        color: props.colorMode === 'dark' ? 'white' : 'gray.800',
      },
    }),
  },
  components: {
    Card: {
      baseStyle: (props: any) => ({
        container: {
          bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
          shadow: props.colorMode === 'dark' ? 'dark-lg' : 'md',
          border: props.colorMode === 'dark' ? '1px solid' : 'none',
          borderColor: props.colorMode === 'dark' ? 'gray.700' : 'transparent',
        },
      }),
    },
    Button: {
      variants: {
        solid: (props: any) => ({
          bg: props.colorMode === 'dark' ? 'brand.600' : 'brand.500',
          color: 'white',
          _hover: {
            bg: props.colorMode === 'dark' ? 'brand.700' : 'brand.600',
          },
        }),
      },
    },
    Tabs: {
      variants: {
        enclosed: (props: any) => ({
          tab: {
            bg: props.colorMode === 'dark' ? 'gray.700' : 'gray.100',
            color: props.colorMode === 'dark' ? 'gray.300' : 'gray.600',
            _selected: {
              bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
              color: props.colorMode === 'dark' ? 'white' : 'brand.500',
              borderColor: props.colorMode === 'dark' ? 'gray.600' : 'gray.200',
            },
          },
          tabpanel: {
            bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
          },
        }),
      },
    },
  },
});

export default theme;
