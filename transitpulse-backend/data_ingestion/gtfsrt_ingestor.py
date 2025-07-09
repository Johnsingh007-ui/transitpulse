import os
import time
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import requests
from google.transit import gtfs_realtime_pb2
from google.protobuf.json_format import MessageToDict
from sqlalchemy.orm import Session

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GTFSRTIngestor:
    """
    Handles the downloading and processing of GTFS-RT (real-time) data.
    """
    
    def __init__(self, api_key: str, db_session: Session):
        """
        Initialize the GTFS-RT ingestor.
        
        Args:
            api_key: 511.org API key
            db_session: SQLAlchemy database session
        """
        self.api_key = api_key
        self.db = db_session
        self.base_url = "http://api.511.org/transit"
        self.agency_id = "RG"  # Golden Gate Transit
        self.update_interval = 30  # seconds
        self.running = False
    
    def fetch_vehicle_positions(self) -> Optional[Dict[str, Any]]:
        """
        Fetch real-time vehicle positions from the GTFS-RT feed.
        
        Returns:
            Dictionary containing vehicle positions or None if the request failed
        """
        try:
            url = f"{self.base_url}/VehiclePositions?api_key={self.api_key}&agency={self.agency_id}"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            # Parse the protobuf response
            feed = gtfs_realtime_pb2.FeedMessage()
            feed.ParseFromString(response.content)
            
            # Convert to dictionary for easier processing
            feed_dict = MessageToDict(feed, preserving_proto_field_name=True)
            return feed_dict
            
        except Exception as e:
            logger.error(f"Error fetching vehicle positions: {e}")
            return None
    
    def process_vehicle_positions(self, feed: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Process the raw vehicle positions feed into a more usable format.
        
        Args:
            feed: Raw feed dictionary from GTFS-RT
            
        Returns:
            List of processed vehicle positions
        """
        processed = []
        
        if not feed or 'entity' not in feed:
            return processed
        
        for entity in feed['entity']:
            if 'vehicle' in entity and 'position' in entity['vehicle']:
                vehicle = entity['vehicle']
                position = vehicle['position']
                
                processed.append({
                    'vehicle_id': vehicle.get('vehicle', {}).get('id', ''),
                    'trip_id': vehicle.get('trip', {}).get('trip_id', ''),
                    'route_id': vehicle.get('trip', {}).get('route_id', ''),
                    'latitude': position.get('latitude', 0),
                    'longitude': position.get('longitude', 0),
                    'bearing': position.get('bearing', 0),
                    'speed': position.get('speed', 0),
                    'timestamp': vehicle.get('timestamp', int(time.time())),
                    'vehicle_label': vehicle.get('vehicle', {}).get('label', ''),
                    'occupancy_status': vehicle.get('occupancy_status', 'UNKNOWN'),
                    'current_stop_sequence': vehicle.get('current_stop_sequence', 0),
                    'current_status': vehicle.get('current_status', 'IN_TRANSIT_TO'),
                    'updated_at': datetime.utcnow().isoformat()
                })
        
        return processed
    
    def save_vehicle_positions(self, positions: List[Dict[str, Any]]) -> bool:
        """
        Save vehicle positions to the database.
        
        Args:
            positions: List of vehicle positions to save
            
        Returns:
            True if save was successful, False otherwise
        """
        if not positions:
            return False
            
        try:
            # TODO: Implement database save logic
            # This is a simplified example - you'll need to implement the actual database operations
            
            # Example:
            # for position in positions:
            #     vehicle = VehiclePosition(
            #         vehicle_id=position['vehicle_id'],
            #         trip_id=position['trip_id'],
            #         route_id=position['route_id'],
            #         latitude=position['latitude'],
            #         longitude=position['longitude'],
            #         bearing=position['bearing'],
            #         speed=position['speed'],
            #         timestamp=position['timestamp'],
            #         updated_at=position['updated_at']
            #     )
            #     self.db.merge(vehicle)  # Use merge for upsert behavior
            # self.db.commit()
            
            logger.info(f"Processed {len(positions)} vehicle positions")
            return True
            
        except Exception as e:
            logger.error(f"Error saving vehicle positions: {e}")
            self.db.rollback()
            return False
    
    def update_vehicle_positions(self) -> Dict[str, Any]:
        """
        Fetch and process the latest vehicle positions.
        
        Returns:
            Dictionary with the status and details of the update
        """
        start_time = datetime.utcnow()
        
        # Fetch the vehicle positions
        feed = self.fetch_vehicle_positions()
        if not feed:
            return {
                'success': False,
                'message': 'Failed to fetch vehicle positions',
                'duration': (datetime.utcnow() - start_time).total_seconds()
            }
        
        # Process the positions
        positions = self.process_vehicle_positions(feed)
        
        # Save to database
        if not self.save_vehicle_positions(positions):
            return {
                'success': False,
                'message': 'Failed to save vehicle positions',
                'duration': (datetime.utcnow() - start_time).total_seconds()
            }
        
        return {
            'success': True,
            'message': f'Successfully updated {len(positions)} vehicle positions',
            'duration': (datetime.utcnow() - start_time).total_seconds(),
            'vehicle_count': len(positions)
        }
    
    def start(self):
        """
        Start the GTFS-RT ingestion service.
        This will run in a loop, fetching updates at the specified interval.
        """
        self.running = True
        logger.info("Starting GTFS-RT ingestion service")
        
        try:
            while self.running:
                start_time = time.time()
                
                try:
                    result = self.update_vehicle_positions()
                    if result['success']:
                        logger.info(f"Updated {result.get('vehicle_count', 0)} vehicle positions in {result['duration']:.2f}s")
                    else:
                        logger.error(f"Failed to update vehicle positions: {result.get('message', 'Unknown error')}")
                except Exception as e:
                    logger.error(f"Error in GTFS-RT update loop: {e}")
                
                # Sleep for the remaining time in the interval
                elapsed = time.time() - start_time
                sleep_time = max(0, self.update_interval - elapsed)
                if sleep_time > 0:
                    time.sleep(sleep_time)
                    
        except KeyboardInterrupt:
            logger.info("Stopping GTFS-RT ingestion service")
        except Exception as e:
            logger.error(f"GTFS-RT ingestion service crashed: {e}")
        finally:
            self.running = False
    
    def stop(self):
        """Stop the GTFS-RT ingestion service."""
        self.running = False
