import { ChakraProvider as OriginalChakraProvider } from '@chakra-ui/react';

declare module '@chakra-ui/react' {
  // Override the ChakraProvider props to make value optional
  export interface ChakraProviderProps {
    children?: React.ReactNode;
    value?: any;
    theme?: any;
  }
  
  // Re-export the ChakraProvider with our extended props
  export const ChakraProvider: React.FC<ChakraProviderProps>;
}
