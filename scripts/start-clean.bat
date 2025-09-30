@echo off
echo Pulizia porte in corso...

REM Trova e termina processi sulla porta 4000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4000') do (
    echo Terminando processo %%a sulla porta 4000
    taskkill /PID %%a /F >nul 2>&1
)

REM Trova e termina processi sulla porta 5173/5174
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173\|:5174"') do (
    echo Terminando processo %%a sulla porta %%a
    taskkill /PID %%a /F >nul 2>&1
)

echo Pulizia completata!
echo Avvio server...

REM Avvia i server
npm run dev
