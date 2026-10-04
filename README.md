# Self-Hosted Cloud Storage Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue.svg)](docker-compose.yml)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B%20|%2020%2B-brightgreen.svg)](https://nodejs.org)
[![CI](https://github.com/nilkanthdesai76/selfhosted-cloud-storage/actions/workflows/ci.yml/badge.svg)](https://github.com/nilkanthdesai76/selfhosted-cloud-storage/actions/workflows/ci.yml)

A production-grade, self-hosted private cloud storage and file sharing engine. Features hybrid storage sharding (NVMe hot cache + HDD cold storage), content-addressed SHA-256 deduplication, WeTransfer-style password-protected share links, React dashboard, and PostgreSQL Prisma ORM.

![Architecture](assets/cloud_storage_diagram.svg)

## ✨ Features

- 🔐 User authentication (JWT + secret key API access)
- 📁 File upload/download with deduplication
- 🔥 Hybrid storage sharding (hot SSD / cold HDD)
- 🔗 Shareable links with expiry and password protection
- 💾 Storage quotas and plans (Free, Pro, Business)
- 📧 WeTransfer-style file sharing
- 🎨 Beautiful web interface

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose

### Installation

1. **Start Database Services**
```bash
docker compose up -d
```

2. **Install Dependencies**
```bash
npm install
```

3. **Setup Environment**
```bash
cp .env.example .env
```

4. **Run Migrations**
```bash
npx prisma migrate dev
```

5. **Seed Plans**
```bash
node src/scripts/seed-plans.js
```

6. **Create Your First User**
```bash
node src/scripts/create-user.js your@email.com yourpassword
```

7. **Start Server**
```bash
npm run dev
```

8. **Open Browser**
```
http://localhost:3000
```

## 👤 Test User

**Email:** admin@example.com  
**Password:** admin123  
**Secret Key:** a9fd4ad4873f318b7a6b48619d3868b3ca0aacd5629c1f7cbd0b1014469129cf

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user info

### Files
- `POST /api/files/upload` - Upload file
- `GET /api/files/download/:fileId` - Download file
- `GET /api/files/list` - List user files
- `DELETE /api/files/:fileId` - Delete file

### Shares
- `POST /api/shares/create` - Create share link
- `GET /api/shares/:shareToken` - Download via share link

## 🏗️ Storage Architecture

Files are stored using hybrid sharding:
- **Hot storage (SSD)**: Recent uploads, user-based sharding
- **Cold storage (HDD)**: Files older than 30 days, moved automatically
- **Deduplication**: Files with same hash stored once

## 🛠️ Tech Stack

- **Backend:** Node.js + Express
- **Database:** PostgreSQL + Prisma ORM
- **Cache:** Redis
- **Auth:** JWT + bcrypt
- **Storage:** Local filesystem with sharding
- **Frontend:** Vanilla JS

## 📊 Plans

| Plan | Storage | Price | Features |
|------|---------|-------|----------|
| Free | 5 GB | $0 | Basic sharing, 100MB max file |
| Pro | 100 GB | $9.99 | 5GB max file, password protection |
| Business | 1 TB | $29.99 | Unlimited file size, priority support |


## 📚 API Documentation

Full interactive API documentation is available at:
```
http://localhost:3000/api-docs.html
```

The documentation includes:
- All available endpoints
- Request/response examples
- Authentication methods
- Copy-paste ready cURL commands
- Error codes reference

## 💻 Code Examples

### cURL Examples
Run the complete cURL example script:
```bash
./examples/curl_examples.sh
```

### Python Client
```bash
pip install requests
python3 examples/python_example.py
```

The Python example demonstrates:
- User registration and login
- File upload/download
- Creating share links
- Downloading shared files

### Quick API Usage

**Upload with Secret Key:**
```bash
curl -X POST http://localhost:3000/api/files/upload \
  -H "X-Secret-Key: YOUR_SECRET_KEY" \
  -F "file=@myfile.pdf"
```

**Upload with JWT:**
```bash
curl -X POST http://localhost:3000/api/files/upload \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@myfile.pdf"
```

**List Files:**
```bash
curl -X GET http://localhost:3000/api/files/list \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Create Share Link:**
```bash
curl -X POST http://localhost:3000/api/shares/create \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "FILE_ID",
    "password": "optional_password",
    "expiryDays": 7
  }'
```

## 🔐 Authentication Methods

1. **JWT Tokens** (Web Portal)
   - Login via `/api/auth/login`
   - Include in header: `Authorization: Bearer TOKEN`
   - Expires in 7 days (configurable)

2. **Secret Key** (API Access)
   - Generated on user registration
   - Include in header: `X-Secret-Key: YOUR_KEY`
   - Never expires (until regenerated)

## 🎯 Use Cases

- **Personal Cloud Storage** - Replace Dropbox/Google Drive
- **File Sharing Service** - WeTransfer alternative
- **Backup Solution** - Automated backups with API
- **Media Server** - Store and serve media files
- **Document Management** - Team file collaboration
- **API-First Storage** - Integrate with your apps
