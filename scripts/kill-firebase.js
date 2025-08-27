#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const os = require('os');

console.log('🔪 Arrêt propre de Firebase...');

const isWindows = os.platform() === 'win32';

function executeCommand(command, options = {}) {
    try {
        execSync(command, { 
            stdio: 'inherit', 
            shell: isWindows ? 'powershell.exe' : '/bin/bash',
            ...options 
        });
        return true;
    } catch (error) {
        return false;
    }
}

function killProcessesByPort(ports) {
    ports.forEach(port => {
        try {
            if (isWindows) {
                // Windows: utiliser netstat pour trouver les processus sur le port
                const output = execSync(`netstat -ano | findstr :${port}`, { 
                    encoding: 'utf8',
                    shell: 'cmd.exe'
                });
                
                const lines = output.split('\n');
                lines.forEach(line => {
                    const match = line.match(/\s+(\d+)$/);
                    if (match) {
                        const pid = match[1];
                        try {
                            execSync(`taskkill /PID ${pid} /F`, { 
                                stdio: 'ignore',
                                shell: 'cmd.exe'
                            });
                            console.log(`    Port ${port} libéré (PID: ${pid})`);
                        } catch (e) {
                            // Processus déjà arrêté
                        }
                    }
                });
            } else {
                // Unix: utiliser lsof
                const output = execSync(`lsof -ti:${port}`, { 
                    encoding: 'utf8',
                    stdio: 'pipe'
                });
                
                if (output.trim()) {
                    const pids = output.trim().split('\n');
                    pids.forEach(pid => {
                        try {
                            execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
                            console.log(`    Port ${port} libéré (PID: ${pid})`);
                        } catch (e) {
                            // Processus déjà arrêté
                        }
                    });
                }
            }
        } catch (e) {
            // Port probablement libre
        }
    });
}

// Essayer d'abord un arrêt propre
console.log('  Tentative d\'arrêt propre avec firebase emulators:kill...');
if (executeCommand('firebase emulators:kill')) {
    console.log('  Arrêt propre réussi');
} else {
    console.log('  Arrêt propre échoué, nettoyage forcé...');
}

// Attendre un peu
setTimeout(() => {
    // Nettoyer les processus sur les ports Firebase
    console.log('  Nettoyage des ports Firebase...');
    killProcessesByPort([9096, 9099, 9097, 8080, 8081, 4000, 4400, 3000]);
    
    // Nettoyer les exports automatiques
    console.log('  Nettoyage des exports automatiques...');
    if (isWindows) {
        executeCommand('if exist firebase-export-* rmdir /s /q firebase-export-*');
    } else {
        executeCommand('rm -rf firebase-export-*');
    }
    
    console.log('✅ Nettoyage terminé');
}, 2000);
