#!/usr/bin/env python3
"""
Cloud Storage Platform - Python API Example

This script demonstrates how to use the Cloud Storage API with Python.
Install required package: pip install requests
"""

import requests
import json
from pathlib import Path

# Configuration
API_BASE_URL = "http://localhost:3000/api"
EMAIL = "user@example.com"
PASSWORD = "yourpassword"

class CloudStorageClient:
    def __init__(self, base_url, email=None, password=None, secret_key=None):
        self.base_url = base_url
        self.access_token = None
        self.refresh_token = None
        self.secret_key = secret_key
        
        if email and password:
            self.login(email, password)
        elif secret_key:
            self.secret_key = secret_key
    
    def _get_headers(self):
        """Get authentication headers"""
        if self.access_token:
            return {"Authorization": f"Bearer {self.access_token}"}
        elif self.secret_key:
            return {"X-Secret-Key": self.secret_key}
        return {}
    
    def register(self, email, password):
        """Register a new user"""
        response = requests.post(
            f"{self.base_url}/auth/register",
            json={"email": email, "password": password}
        )
        response.raise_for_status()
        data = response.json()
        
        self.access_token = data["accessToken"]
        self.refresh_token = data["refreshToken"]
        self.secret_key = data["user"]["secretKey"]
        
        print(f"✅ Registered successfully!")
        print(f"Secret Key: {self.secret_key}")
        return data
    
    def login(self, email, password):
        """Login with existing credentials"""
        response = requests.post(
            f"{self.base_url}/auth/login",
            json={"email": email, "password": password}
        )
        response.raise_for_status()
        data = response.json()
        
        self.access_token = data["accessToken"]
        self.refresh_token = data["refreshToken"]
        self.secret_key = data["user"]["secretKey"]
        
        print(f"✅ Logged in successfully!")
        return data
    
    def get_user_info(self):
        """Get current user information"""
        response = requests.get(
            f"{self.base_url}/auth/me",
            headers=self._get_headers()
        )
        response.raise_for_status()
        return response.json()
    
    def upload_file(self, file_path, parent_id=None):
        """Upload a file"""
        file_path = Path(file_path)
        
        with open(file_path, 'rb') as f:
            files = {'file': (file_path.name, f)}
            data = {}
            if parent_id:
                data['parentId'] = parent_id
            
            response = requests.post(
                f"{self.base_url}/files/upload",
                headers=self._get_headers(),
                files=files,
                data=data
            )
            response.raise_for_status()
        
        result = response.json()
        print(f"✅ Uploaded: {file_path.name}")
        if result.get('deduplicated'):
            print("   (File was deduplicated - already exists)")
        return result
    
    def list_files(self, parent_id=None):
        """List all files"""
        params = {}
        if parent_id:
            params['parentId'] = parent_id
        
        response = requests.get(
            f"{self.base_url}/files/list",
            headers=self._get_headers(),
            params=params
        )
        response.raise_for_status()
        return response.json()
    
    def download_file(self, file_id, output_path):
        """Download a file"""
        response = requests.get(
            f"{self.base_url}/files/download/{file_id}",
            headers=self._get_headers(),
            stream=True
        )
        response.raise_for_status()
        
        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        print(f"✅ Downloaded to: {output_path}")
    
    def delete_file(self, file_id):
        """Delete a file"""
        response = requests.delete(
            f"{self.base_url}/files/{file_id}",
            headers=self._get_headers()
        )
        response.raise_for_status()
        print(f"✅ Deleted file: {file_id}")
        return response.json()
    
    def create_share(self, file_id, password=None, expiry_days=7, max_downloads=10):
        """Create a shareable link"""
        data = {
            "fileId": file_id,
            "expiryDays": expiry_days,
            "maxDownloads": max_downloads
        }
        if password:
            data["password"] = password
        
        response = requests.post(
            f"{self.base_url}/shares/create",
            headers=self._get_headers(),
            json=data
        )
        response.raise_for_status()
        
        result = response.json()
        print(f"✅ Share link created: {result['shareUrl']}")
        return result
    
    def download_shared_file(self, share_token, output_path, password=None):
        """Download a file via share link (no auth required)"""
        params = {}
        if password:
            params['password'] = password
        
        response = requests.get(
            f"{self.base_url}/shares/{share_token}",
            params=params,
            stream=True
        )
        response.raise_for_status()
        
        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        print(f"✅ Downloaded shared file to: {output_path}")


def main():
    """Example usage"""
    print("🚀 Cloud Storage API Example\n")
    
    # Initialize client and login
    client = CloudStorageClient(API_BASE_URL, EMAIL, PASSWORD)
    
    # Get user info
    print("\n📊 User Information:")
    user_info = client.get_user_info()
    user = user_info['user']
    print(f"   Email: {user['email']}")
    print(f"   Plan: {user['plan']['name']}")
    print(f"   Storage Used: {int(user['storageUsed']) / (1024*1024):.2f} MB")
    print(f"   Storage Limit: {int(user['plan']['storageLimit']) / (1024*1024*1024):.0f} GB")
    
    # Upload a file (create a test file first)
    print("\n📤 Uploading test file...")
    test_file = Path("test_upload.txt")
    test_file.write_text("Hello from Python API client!")
    
    upload_result = client.upload_file(test_file)
    file_id = upload_result['file']['id']
    
    # List files
    print("\n📁 Listing files...")
    files = client.list_files()
    for file in files['files']:
        size_mb = int(file['size']) / (1024*1024)
        print(f"   - {file['filename']} ({size_mb:.2f} MB)")
    
    # Create share link
    print("\n🔗 Creating share link...")
    share = client.create_share(
        file_id,
        password="secret123",
        expiry_days=7,
        max_downloads=5
    )
    
    # Download file
    print("\n📥 Downloading file...")
    client.download_file(file_id, "downloaded_test.txt")
    
    # Download via share link (no auth)
    print("\n📥 Downloading via share link...")
    share_token = share['share']['shareToken']
    client.download_shared_file(share_token, "shared_download.txt", password="secret123")
    
    # Clean up
    test_file.unlink()
    Path("downloaded_test.txt").unlink()
    Path("shared_download.txt").unlink()
    
    print("\n✅ All operations completed successfully!")
    print(f"\n💡 Your Secret Key: {client.secret_key}")
    print("   Save this for API access without login!")


if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.HTTPError as e:
        print(f"❌ API Error: {e.response.status_code}")
        print(f"   {e.response.json()}")
    except Exception as e:
        print(f"❌ Error: {e}")
