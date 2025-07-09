import { ChakraProviderProps } from '@chakra-ui/react';

declare module '@chakra-ui/react' {
  interface ChakraProviderProps {
    children?: React.ReactNode;
  }
}
