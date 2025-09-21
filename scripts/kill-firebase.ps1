Write-Host "🔪 Arrêt propre de Firebase..." -ForegroundColor Yellow

# Essayer d'abord un arrêt propre
try {
    if (Get-Command firebase -ErrorAction SilentlyContinue) {
        Write-Host "  Tentative d'arrêt propre avec firebase emulators:kill..." -ForegroundColor Cyan
        firebase emulators:kill 2>$null
        Start-Sleep -Seconds 2
    }
} catch {
    Write-Host "  Firebase CLI non trouvé ou erreur lors de l'arrêt propre" -ForegroundColor Red
}

# Vérifier si des processus Firebase tournent encore
$firebaseProcesses = Get-Process | Where-Object { 
    $_.ProcessName -like "*firebase*" -or 
    $_.ProcessName -like "*firestore*" -or 
    $_.ProcessName -like "*java*" 
}

if ($firebaseProcesses) {
    Write-Host "  Nettoyage forcé des processus restants..." -ForegroundColor Cyan
    
    # Tuer tous les processus Firebase
    $firebaseProcesses | ForEach-Object {
        try {
            Write-Host "    Arrêt du processus: $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Gray
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Host "    Erreur lors de l'arrêt du processus $($_.ProcessName)" -ForegroundColor Red
        }
    }
}

# Tuer les processus sur les ports Firebase spécifiques
$ports = @(9096, 9099, 9097, 8080, 4000, 4400, 3000)
foreach ($port in $ports) {
    try {
        $processesOnPort = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | 
                          Select-Object -ExpandProperty OwningProcess -Unique
        
        if ($processesOnPort) {
            Write-Host "    Nettoyage du port $port..." -ForegroundColor Gray
            foreach ($pid in $processesOnPort) {
                try {
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                } catch {
                    Write-Host "      Erreur lors de l'arrêt du processus sur le port $port" -ForegroundColor Red
                }
            }
        }
    } catch {
        # Port probablement libre
    }
}

# Nettoyer les exports automatiques indésirables
Write-Host "  Nettoyage des exports automatiques..." -ForegroundColor Cyan
if (Test-Path "firebase-export-*") {
    Remove-Item "firebase-export-*" -Recurse -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 1
Write-Host "✅ Nettoyage terminé" -ForegroundColor Green
