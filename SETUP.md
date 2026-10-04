# Setup Guide

## Prerequisites

1. **Node.js** (v18 or higher)
2. **PostgreSQL** (v12 or higher)
3. **Redis** (v6 or higher)

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and configure:
- `DATABASE_URL`: Your PostgreSQL connection string
- `JWT_SECRET`: A random secret key for JWT tokens
- `REFRESH_TOKEN_SECRET`: Another random secret key
- `REDIS_HOST` and `REDIS_PORT`: Your Redis connection details

### 3. Set Up PostgreSQL Database

Create a database:
```bash
createdb cloud_storage
# Or using psql:
# psql -c "CREATE DATABASE cloud_storage;"
```

### 4. Run Database Migrations

```bash
npm run prisma:migrate
```

This will create all the necessary tables.

### 5. Seed Default Plans

```bash
node src/scripts/seed-plans.js
```

This creates the Free, Pro, and Business plans.

### 6. Start the Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## Development Setup

### Using Docker (Optional)

If you prefer Docker, you can use:

```bash
# Start PostgreSQL and Redis with Docker Compose
docker-compose up -d
```

### Manual Setup

#### PostgreSQL
```bash
# macOS (using Homebrew)
brew install postgresql
brew services start postgresql

# Create database
createdb cloud_storage
```

#### Redis
```bash
# macOS (using Homebrew)
brew install redis
brew services start redis
```

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment (development/production) | development |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | Secret for JWT tokens | Required |
| `REFRESH_TOKEN_SECRET` | Secret for refresh tokens | Required |
| `REDIS_HOST` | Redis host | localhost |
| `REDIS_PORT` | Redis port | 6379 |
| `HOT_STORAGE_PATH` | Path for hot storage | ./storage/hot |
| `COLD_STORAGE_PATH` | Path for cold storage | ./storage/cold |
| `NUM_HOT_SHARDS` | Number of hot storage shards | 4 |
| `NUM_COLD_SHARDS` | Number of cold storage shards | 2 |
| `COLD_DATA_THRESHOLD_DAYS` | Days before moving to cold storage | 30 |
| `MAX_FILE_SIZE` | Maximum file size in bytes | 5368709120 (5GB) |

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check `DATABASE_URL` format: `postgresql://user:password@host:port/database`
- Verify database exists

### Redis Connection Issues
- Ensure Redis is running: `redis-cli ping` should return `PONG`
- Check `REDIS_HOST` and `REDIS_PORT` in `.env`

### Port Already in Use
- Change `PORT` in `.env` to a different port
- Or stop the process using port 3000

## Next Steps

1. Open `http://localhost:3000` in your browser
2. Register a new account
3. Start uploading files!
