import os
import zipfile
import tempfile
import requests
import pandas as pd
from datetime import datetime
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GTFSIngestor:
    """
    Handles the downloading, processing, and storage of GTFS data.
    """
    
    def __init__(self, api_key: str, db_session: Session):
        """
        Initialize the GTFS ingestor.
        
        Args:
            api_key: 511.org API key
            db_session: SQLAlchemy database session
        """
        self.api_key = api_key
        self.db = db_session
        self.base_url = "http://api.511.org/transit"
        self.agency_id = "RG"  # Golden Gate Transit
        
    def fetch_gtfs_feed(self) -> Optional[str]:
        """
        Download the GTFS feed zip file.
        
        Returns:
            Path to the downloaded zip file or None if download failed
        """
        try:
            url = f"{self.base_url}/datafeeds?api_key={self.api_key}&operator_id={self.agency_id}"
            response = requests.get(url, stream=True)
            response.raise_for_status()
            
            # Create a temporary file to store the zip
            temp_dir = tempfile.mkdtemp()
            zip_path = os.path.join(temp_dir, f"gtfs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip")
            
            with open(zip_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            logger.info(f"Successfully downloaded GTFS feed to {zip_path}")
            return zip_path
            
        except Exception as e:
            logger.error(f"Error downloading GTFS feed: {e}")
            return None
    
    def extract_gtfs(self, zip_path: str, extract_to: str) -> bool:
        """
        Extract the GTFS zip file to the specified directory.
        
        Args:
            zip_path: Path to the GTFS zip file
            extract_to: Directory to extract the files to
            
        Returns:
            True if extraction was successful, False otherwise
        """
        try:
            os.makedirs(extract_to, exist_ok=True)
            
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(extract_to)
            
            logger.info(f"Successfully extracted GTFS feed to {extract_to}")
            return True
            
        except Exception as e:
            logger.error(f"Error extracting GTFS feed: {e}")
            return False
    
    def load_gtfs_to_database(self, gtfs_dir: str) -> bool:
        """
        Load GTFS data from the extracted directory into the database.
        
        Args:
            gtfs_dir: Directory containing the extracted GTFS files
            
        Returns:
            True if loading was successful, False otherwise
        """
        try:
            # Load each GTFS file into the database
            # This is a simplified example - you'll need to implement the actual database operations
            
            # Example: Load routes
            routes_path = os.path.join(gtfs_dir, 'routes.txt')
            if os.path.exists(routes_path):
                routes_df = pd.read_csv(routes_path)
                logger.info(f"Loaded {len(routes_df)} routes from GTFS feed")
                
                # TODO: Save routes to database
                # for _, row in routes_df.iterrows():
                #     route = Route(
                #         route_id=row['route_id'],
                #         agency_id=row.get('agency_id', self.agency_id),
                #         route_short_name=row.get('route_short_name', ''),
                #         route_long_name=row.get('route_long_name', ''),
                #         route_type=row.get('route_type', 3),  # Default to bus
                #         route_color=row.get('route_color', '3182ce'),
                #         route_text_color=row.get('route_text_color', 'ffffff'),
                #         route_desc=row.get('route_desc', ''),
                #         route_url=row.get('route_url', '')
                #     )
                #     self.db.add(route)
                # self.db.commit()
            
            # TODO: Load other GTFS files (stops, trips, stop_times, etc.)
            
            return True
            
        except Exception as e:
            logger.error(f"Error loading GTFS data to database: {e}")
            return False
    
    def update_gtfs_data(self) -> Dict[str, Any]:
        """
        Download and process the latest GTFS data.
        
        Returns:
            Dictionary with the status and details of the update
        """
        start_time = datetime.now()
        
        # Download the GTFS feed
        zip_path = self.fetch_gtfs_feed()
        if not zip_path:
            return {
                'success': False,
                'message': 'Failed to download GTFS feed',
                'duration': (datetime.now() - start_time).total_seconds()
            }
        
        # Extract the GTFS feed
        extract_dir = os.path.join(os.path.dirname(zip_path), 'gtfs_extracted')
        if not self.extract_gtfs(zip_path, extract_dir):
            return {
                'success': False,
                'message': 'Failed to extract GTFS feed',
                'duration': (datetime.now() - start_time).total_seconds()
            }
        
        # Load the data into the database
        if not self.load_gtfs_to_database(extract_dir):
            return {
                'success': False,
                'message': 'Failed to load GTFS data to database',
                'duration': (datetime.now() - start_time).total_seconds()
            }
        
        # Clean up temporary files
        try:
            os.remove(zip_path)
            import shutil
            shutil.rmtree(extract_dir)
        except Exception as e:
            logger.warning(f"Error cleaning up temporary files: {e}")
        
        return {
            'success': True,
            'message': 'Successfully updated GTFS data',
            'duration': (datetime.now() - start_time).total_seconds()
        }
