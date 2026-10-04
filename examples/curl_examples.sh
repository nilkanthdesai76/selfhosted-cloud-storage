#!/bin/bash
# Cloud Storage Platform - cURL Examples
# This script demonstrates common API operations using cURL

API_URL="http://localhost:3000/api"

echo "🚀 Cloud Storage API - cURL Examples"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Register a new user
echo -e "\n${BLUE}1. Register New User${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "demo123456"
  }')

echo "$REGISTER_RESPONSE" | python3 -m json.tool

# Extract access token
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null)
SECRET_KEY=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['user']['secretKey'])" 2>/dev/null)

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${GREEN}User might already exist, trying login...${NC}"
    
    # 2. Login
    echo -e "\n${BLUE}2. Login${NC}"
    LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
      -H "Content-Type: application/json" \
      -d '{
        "email": "demo@example.com",
        "password": "demo123456"
      }')
    
    echo "$LOGIN_RESPONSE" | python3 -m json.tool
    
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])")
    SECRET_KEY=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['user']['secretKey'])")
fi

echo -e "\n${GREEN}✓ Access Token: $ACCESS_TOKEN${NC}"
echo -e "${GREEN}✓ Secret Key: $SECRET_KEY${NC}"

# 3. Get user info
echo -e "\n${BLUE}3. Get User Info${NC}"
curl -s -X GET "$API_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool

# 4. Create a test file
echo -e "\n${BLUE}4. Creating test file...${NC}"
echo "Hello from cURL!" > test_file.txt

# 5. Upload file (with JWT)
echo -e "\n${BLUE}5. Upload File (with JWT)${NC}"
UPLOAD_RESPONSE=$(curl -s -X POST "$API_URL/files/upload" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "file=@test_file.txt")

echo "$UPLOAD_RESPONSE" | python3 -m json.tool

FILE_ID=$(echo "$UPLOAD_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['file']['id'])")
echo -e "${GREEN}✓ File ID: $FILE_ID${NC}"

# 6. Upload another file (with Secret Key)
echo -e "\n${BLUE}6. Upload File (with Secret Key)${NC}"
echo "Hello from Secret Key!" > test_file2.txt
curl -s -X POST "$API_URL/files/upload" \
  -H "X-Secret-Key: $SECRET_KEY" \
  -F "file=@test_file2.txt" | python3 -m json.tool

# 7. List files
echo -e "\n${BLUE}7. List All Files${NC}"
curl -s -X GET "$API_URL/files/list" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool

# 8. Create share link
echo -e "\n${BLUE}8. Create Share Link${NC}"
SHARE_RESPONSE=$(curl -s -X POST "$API_URL/shares/create" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"fileId\": \"$FILE_ID\",
    \"password\": \"secret123\",
    \"expiryDays\": 7,
    \"maxDownloads\": 5
  }")

echo "$SHARE_RESPONSE" | python3 -m json.tool

SHARE_TOKEN=$(echo "$SHARE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['share']['shareToken'])")
SHARE_URL=$(echo "$SHARE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['shareUrl'])")

echo -e "${GREEN}✓ Share URL: $SHARE_URL${NC}"

# 9. Download file
echo -e "\n${BLUE}9. Download File${NC}"
curl -s -X GET "$API_URL/files/download/$FILE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -o downloaded_file.txt

echo -e "${GREEN}✓ Downloaded to: downloaded_file.txt${NC}"
cat downloaded_file.txt

# 10. Download via share link (no auth)
echo -e "\n${BLUE}10. Download via Share Link (with password)${NC}"
curl -s -X GET "$API_URL/shares/$SHARE_TOKEN?password=secret123" \
  -o shared_download.txt

echo -e "${GREEN}✓ Downloaded to: shared_download.txt${NC}"
cat shared_download.txt

# 11. Delete file
echo -e "\n${BLUE}11. Delete File${NC}"
curl -s -X DELETE "$API_URL/files/$FILE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool

# Cleanup
echo -e "\n${BLUE}Cleaning up test files...${NC}"
rm -f test_file.txt test_file2.txt downloaded_file.txt shared_download.txt

echo -e "\n${GREEN}✅ All examples completed!${NC}"
echo -e "\n💡 Save your credentials:"
echo -e "   Access Token: $ACCESS_TOKEN"
echo -e "   Secret Key: $SECRET_KEY"
