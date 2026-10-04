#!/bin/bash

echo "🚀 Cloud Storage Platform - Quick Start"
echo "========================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://www.docker.com/get-started"
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null && ! docker-compose version &> /dev/null; then
    echo "❌ Docker Compose is not available."
    exit 1
fi

echo "📦 Starting PostgreSQL and Redis with Docker..."
docker compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

echo ""
echo "📚 Running database migrations..."
npm run prisma:migrate

echo ""
echo "🌱 Seeding default plans..."
node src/scripts/seed-plans.js

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎉 You can now start the server with:"
echo "   npm run dev"
echo ""
echo "🌐 Then open http://localhost:3000 in your browser"
echo ""
