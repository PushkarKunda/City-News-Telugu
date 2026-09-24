# services/supabase_service.py
import os
import requests
import logging

logger = logging.getLogger(__name__)

class SupabaseService:
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_KEY")  # ⚠️ Keep secret!
        self.bucket_name = os.getenv("SUPABASE_BUCKET", "news-images")
    
    def delete_image(self, image_url: str) -> bool:
        """Delete an image from Supabase storage"""
        if not image_url or not self.supabase_key:
            return False
        
        try:
            # Extract file path from URL
            # URL format: https://project.supabase.co/storage/v1/object/public/bucket/path/image.jpg
            if f"/storage/v1/object/public/{self.bucket_name}/" in image_url:
                file_path = image_url.split(f"/{self.bucket_name}/")[-1]
                
                delete_url = f"{self.supabase_url}/storage/v1/object/{self.bucket_name}/{file_path}"
                headers = {"Authorization": f"Bearer {self.supabase_key}"}
                
                response = requests.delete(delete_url, headers=headers)
                return response.status_code == 200
            
            return False
        except Exception as e:
            logger.error(f"Failed to delete image: {str(e)}")
            return False

supabase_service = SupabaseService()