#!/bin/bash

# Script de déploiement des Cloud Functions Algolia
# 
# Usage: ./scripts/deploy-algolia-functions.sh [dev|preprod|prod]
#
# Prérequis:
# - Firebase CLI installé et authentifié
# - Variables d'environnement Algolia définies:
#   - ALGOLIA_APP_ID=IYE83A0LRH
#   - ALGOLIA_WRITE_API_KEY=f37a6169f18864759940d3a3125625f2

set -e  # Arrêter en cas d'erreur

ENV=${1:-dev}

if [[ ! "$ENV" =~ ^(dev|preprod|prod)$ ]]; then
  echo "❌ Environnement invalide: $ENV"
  echo "Usage: $0 [dev|preprod|prod]"
  exit 1
fi

# Mapping environnement → projet Firebase
case $ENV in
  dev)
    FIREBASE_PROJECT="dev"
    ALGOLIA_INDEX="membership-requests-dev"
    ;;
  preprod)
    FIREBASE_PROJECT="preprod"
    ALGOLIA_INDEX="membership-requests-preprod"
    ;;
  prod)
    FIREBASE_PROJECT="prod"
    ALGOLIA_INDEX="membership-requests-prod"
    ;;
esac

echo "🚀 Déploiement de syncToAlgolia sur $ENV"
echo "📊 Projet Firebase: $FIREBASE_PROJECT"
echo "📊 Index Algolia: $ALGOLIA_INDEX"
echo ""

# Vérifier les variables d'environnement
if [ -z "$ALGOLIA_APP_ID" ] || [ -z "$ALGOLIA_WRITE_API_KEY" ]; then
  echo "❌ Variables d'environnement manquantes"
  echo "Définissez ALGOLIA_APP_ID et ALGOLIA_WRITE_API_KEY"
  exit 1
fi

# Sélectionner le projet Firebase
echo "📌 Sélection du projet Firebase: $FIREBASE_PROJECT"
firebase use $FIREBASE_PROJECT

# Compiler les functions
echo ""
echo "🔨 Compilation des functions..."
cd functions
npm run build
cd ..

# Configurer les variables d'environnement (si pas déjà fait)
echo ""
echo "⚙️  Configuration des variables d'environnement..."
echo "Note: Si les variables sont déjà configurées, cette étape peut être ignorée"

# Option 1: Utiliser secrets (recommandé pour production)
# echo "$ALGOLIA_APP_ID" | firebase functions:secrets:set ALGOLIA_APP_ID --data-file -
# echo "$ALGOLIA_WRITE_API_KEY" | firebase functions:secrets:set ALGOLIA_WRITE_API_KEY --data-file -
# echo "$ALGOLIA_INDEX" | firebase functions:secrets:set ALGOLIA_INDEX_NAME --data-file -

# Option 2: Utiliser config (compatible v1 et v2)
firebase functions:config:set \
  algolia.app_id="$ALGOLIA_APP_ID" \
  algolia.write_api_key="$ALGOLIA_WRITE_API_KEY" \
  algolia.index_name="$ALGOLIA_INDEX" || echo "⚠️  Config déjà définie ou erreur (peut être ignorée)"

# Déployer la fonction
echo ""
echo "🚀 Déploiement de syncToAlgolia..."
firebase deploy --only functions:syncToAlgolia

echo ""
echo "✅ Déploiement terminé avec succès !"
echo ""
echo "📋 Prochaines étapes:"
echo "1. Vérifier les logs: firebase functions:log --only syncToAlgolia"
echo "2. Créer/modifier un document dans Firestore pour tester"
echo "3. Vérifier dans Algolia Dashboard (index: $ALGOLIA_INDEX)"
