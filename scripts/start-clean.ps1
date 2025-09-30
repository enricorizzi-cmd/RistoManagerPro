# Script PowerShell per avvio pulito
Write-Host "Pulizia porte in corso..." -ForegroundColor Yellow

# Funzione per terminare processi su una porta
function Stop-ProcessOnPort {
    param([int]$Port)
    
    $processes = netstat -ano | Select-String ":$Port"
    foreach ($process in $processes) {
        $pid = ($process -split '\s+')[-1]
        if ($pid -match '^\d+$') {
            try {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Write-Host "Terminato processo $pid sulla porta $Port" -ForegroundColor Green
            } catch {
                Write-Host "Impossibile terminare processo $pid" -ForegroundColor Red
            }
        }
    }
}

# Pulisci le porte
Stop-ProcessOnPort -Port 4000
Stop-ProcessOnPort -Port 5173
Stop-ProcessOnPort -Port 5174

Write-Host "Pulizia completata!" -ForegroundColor Green
Write-Host "Avvio server..." -ForegroundColor Cyan

# Avvia i server
npm run dev
