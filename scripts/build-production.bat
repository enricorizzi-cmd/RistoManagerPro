@echo off
REM Production build script for Render (Windows)

REM Install root dependencies
call npm install

REM Install server dependencies
cd server
call npm install
cd ..

REM Build frontend
call npm run build

echo Build completed successfully

