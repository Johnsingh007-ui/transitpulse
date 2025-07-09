import { ChakraProvider as OriginalChakraProvider } from '@chakra-ui/react';

declare module '@chakra-ui/react' {
  // Extend the original ChakraProviderProps
  export interface ChakraProviderProps {
    children?: React.ReactNode;
    resetCSS?: boolean;
    theme?: any;
    value?: any; // Make value optional
  }
  
  // Re-export the ChakraProvider with our extended props
  export const ChakraProvider: React.FC<ChakraProviderProps>;
}
