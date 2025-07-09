import React, { useEffect, useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalCloseButton, ModalBody, ModalFooter, Button,
  Text, Spinner, Box
} from '@chakra-ui/react';
import { getRouteDetails, RouteDetails } from '../api/apiClient';
import RouteMap from './RouteMap';

interface RouteDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  routeId: string;
}

const RouteDetailsModal: React.FC<RouteDetailsModalProps> = ({ isOpen, onClose, routeId }) => {
  const [details, setDetails] = useState<RouteDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getRouteDetails(routeId)
        .then(res => res.status === 'success' ? setDetails(res.data) : null)
        .finally(() => setLoading(false));
    }
  }, [isOpen, routeId]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Route Details</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {loading || !details ? (
            <Box textAlign="center" py={6}><Spinner size="lg" /></Box>
          ) : (
            <>
              <Text fontWeight="bold">{details.route.route_long_name}</Text>
              <Text fontSize="sm" mb={4}>Route ID: {details.route.route_id}</Text>
              <RouteMap shapes={details.shapes} stops={details.stops} />
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default RouteDetailsModal;
