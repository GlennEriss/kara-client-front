#!/bin/bash

echo "🔪 Arrêt propre de Firebase..."

# Essayer d'abord un arrêt propre
if command -v firebase &> /dev/null; then
    echo "  Tentative d'arrêt propre avec firebase emulators:kill..."
    firebase emulators:kill 2>/dev/null
    sleep 2
fi

# Vérifier si des processus Firebase tournent encore
if pgrep -f "firebase" > /dev/null || pgrep -f "firestore-emulator" > /dev/null; then
    echo "  Nettoyage forcé des processus restants..."
    
    # Tuer tous les processus contenant "firebase" ou "firestore-emulator"
    pkill -f "firebase" 2>/dev/null
    pkill -f "firestore-emulator" 2>/dev/null
    pkill -f "cloud-firestore-emulator" 2>/dev/null
    
    # Tuer les processus Java sur les ports Firebase spécifiques
    for port in 9096 9099 9097 8080 4000 4400 3000; do
        if lsof -ti:$port >/dev/null 2>&1; then
            echo "    Nettoyage du port $port..."
            kill -9 $(lsof -ti:$port) 2>/dev/null
        fi
    done
fi

# Nettoyer les exports automatiques indésirables
echo "  Nettoyage des exports automatiques..."
rm -rf firebase-export-* 2>/dev/null

sleep 1
echo "✅ Nettoyage terminé"