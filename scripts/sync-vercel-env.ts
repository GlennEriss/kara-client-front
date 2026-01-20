#!/usr/bin/env tsx
/**
 * Script pour synchroniser les variables d'environnement Vercel
 * depuis les secrets GitHub vers Vercel
 * 
 * Usage:
 *   tsx scripts/sync-vercel-env.ts preview
 *   tsx scripts/sync-vercel-env.ts production
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const VERCEL_API_URL = 'https://api.vercel.com';

interface VercelEnvVar {
  key: string;
  value: string;
  type: 'system' | 'secret' | 'encrypted' | 'plain';
  target?: ('production' | 'preview' | 'development')[];
}

async function syncVercelEnv(environment: 'preview' | 'production') {
  const vercelToken = process.env.VERCEL_TOKEN;
  const vercelProjectId = process.env.VERCEL_PROJECT_ID;
  const vercelOrgId = process.env.VERCEL_ORG_ID;

  if (!vercelToken || !vercelProjectId || !vercelOrgId) {
    throw new Error('Missing required environment variables: VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_ORG_ID');
  }

  // Mapping des variables d'environnement selon l'environnement
  const envVars: Record<string, string> = {
    // Les secrets GitHub sont gérés via Environments (Preview / Production)
    // et exposés SANS suffixe (ex: NEXT_PUBLIC_FIREBASE_API_KEY).
    NEXT_PUBLIC_APP_ENV:
      process.env.NEXT_PUBLIC_APP_ENV ||
      (environment === 'preview' ? 'preprod' : 'production'),
    NEXT_PUBLIC_GEOGRAPHY_VERSION: process.env.NEXT_PUBLIC_GEOGRAPHY_VERSION || 'V2',
    // Variables de contact/support
    NEXT_PUBLIC_NUMBER_AGENT_AIRTEL: (process.env.NEXT_PUBLIC_NUMBER_AGENT_AIRTEL || '').trim(),
    NEXT_PUBLIC_NUMBER_AGENT_MOBICASH: (process.env.NEXT_PUBLIC_NUMBER_AGENT_MOBICASH || '').trim(),
    NEXT_PUBLIC_WHATSAPP_AGENT: (process.env.NEXT_PUBLIC_WHATSAPP_AGENT || '').trim(),
  };

  // Variables Firebase côté client (NEXT_PUBLIC_*)
  envVars.NEXT_PUBLIC_FIREBASE_API_KEY = (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '').trim();
  envVars.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '').trim();
  envVars.NEXT_PUBLIC_FIREBASE_PROJECT_ID = (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '').trim();
  envVars.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '').trim();
  envVars.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = (process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '').trim();
  envVars.NEXT_PUBLIC_FIREBASE_APP_ID = (process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '').trim();

  // Variables Algolia côté client (NEXT_PUBLIC_*)
  envVars.NEXT_PUBLIC_ALGOLIA_APP_ID = (process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || '').trim();
  envVars.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY = (process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || '').trim();
  // Index par défaut selon l'environnement si non fourni
  envVars.NEXT_PUBLIC_ALGOLIA_INDEX_NAME = (
    process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME ||
    (environment === 'preview' ? 'membership-requests-preprod' : 'membership-requests-prod')
  ).trim();

  // Variables Firebase côté serveur (sans NEXT_PUBLIC_)
  envVars.FIREBASE_PROJECT_ID = (process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '').trim();
    
  // Variables Firebase Admin SDK (secrets sensibles)
  envVars.FIREBASE_CLIENT_EMAIL = (process.env.FIREBASE_CLIENT_EMAIL || '').trim();
  envVars.FIREBASE_PRIVATE_KEY = (process.env.FIREBASE_PRIVATE_KEY || '').trim();
  envVars.FIREBASE_PRIVATE_KEY_ID = (process.env.FIREBASE_PRIVATE_KEY_ID || '').trim();
  envVars.FIREBASE_CLIENT_ID = (process.env.FIREBASE_CLIENT_ID || '').trim();

  // Variables Algolia côté serveur (secrets pour Cloud Functions / backend)
  envVars.ALGOLIA_APP_ID = (process.env.ALGOLIA_APP_ID || process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || '').trim();
  envVars.ALGOLIA_WRITE_API_KEY = (process.env.ALGOLIA_WRITE_API_KEY || '').trim();

  const target = environment === 'preview' ? ['preview', 'development'] : ['production'];

  console.log(`🔄 Synchronisation des variables Vercel pour l'environnement: ${environment}`);
  console.log(`📦 Projet: ${vercelProjectId}`);
  console.log(`🎯 Cibles: ${target.join(', ')}\n`);

  // Récupérer les variables existantes
  const existingVarsResponse = await fetch(
    `${VERCEL_API_URL}/v10/projects/${vercelProjectId}/env?teamId=${vercelOrgId}`,
    {
      headers: {
        Authorization: `Bearer ${vercelToken}`,
      },
    }
  );

  if (!existingVarsResponse.ok) {
    throw new Error(`Failed to fetch existing env vars: ${existingVarsResponse.statusText}`);
  }

  interface VercelEnvVar {
    key: string;
    id?: string;
    target?: string[];
    value?: string;
  }

  const existingVars = await existingVarsResponse.json() as { envs?: VercelEnvVar[] };
  const existingVarsMap = new Map<string, VercelEnvVar>(
    (existingVars.envs || []).map((env) => [
      `${env.key}:${env.target?.join(',') || 'all'}`,
      env,
    ])
  );

  // Liste des secrets sensibles (à marquer comme 'encrypted' dans Vercel)
  const sensitiveSecrets = [
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_PRIVATE_KEY_ID', // Optionnel mais sensible
    'ALGOLIA_APP_ID',
    'ALGOLIA_WRITE_API_KEY',
  ];

  // Créer ou mettre à jour les variables
  for (const [key, value] of Object.entries(envVars)) {
    if (!value) {
      console.log(`⚠️  Variable ${key} est vide, ignorée`);
      continue;
    }

    // Déterminer le type : 'encrypted' pour les secrets sensibles, 'plain' pour le reste
    const isSecret = sensitiveSecrets.includes(key);
    const varType = isSecret ? 'encrypted' : 'plain';

    const envKey = `${key}:${target.join(',')}`;
    const existing = existingVarsMap.get(envKey);

    if (existing?.id) {
      // Mettre à jour la variable existante
      console.log(`✏️  Mise à jour: ${key} (${varType})`);
      const updateResponse = await fetch(
        `${VERCEL_API_URL}/v10/projects/${vercelProjectId}/env/${existing.id}?teamId=${vercelOrgId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            value,
            target,
            type: varType, // Mettre à jour le type si nécessaire
          }),
        }
      );

      if (!updateResponse.ok) {
        const error = await updateResponse.text();
        console.error(`❌ Erreur lors de la mise à jour de ${key}: ${error}`);
      } else {
        console.log(`✅ ${key} mis à jour`);
      }
    } else {
      // Créer une nouvelle variable
      console.log(`➕ Création: ${key} (${varType})`);
      const createResponse = await fetch(
        `${VERCEL_API_URL}/v10/projects/${vercelProjectId}/env?teamId=${vercelOrgId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key,
            value,
            type: varType,
            target,
          }),
        }
      );

      if (!createResponse.ok) {
        const error = await createResponse.text();
        console.error(`❌ Erreur lors de la création de ${key}: ${error}`);
      } else {
        console.log(`✅ ${key} créé`);
      }
    }
  }

  console.log(`\n✨ Synchronisation terminée pour ${environment}`);
}

// Exécution du script
const environment = process.argv[2] as 'preview' | 'production';

if (!environment || !['preview', 'production'].includes(environment)) {
  console.error('Usage: tsx scripts/sync-vercel-env.ts <preview|production>');
  process.exit(1);
}

syncVercelEnv(environment).catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});
