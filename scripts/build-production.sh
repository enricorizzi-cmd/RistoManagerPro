#!/bin/bash
# Production build script for Render

# Install root dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Build frontend
npm run build

echo "Build completed successfully"

