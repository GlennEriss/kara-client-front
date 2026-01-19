#!/bin/bash

# Script pour ajouter les variables Algolia aux fichiers .env
# Usage: ./scripts/add-algolia-env-vars.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "📝 Ajout des variables Algolia aux fichiers .env..."

# .env.dev
if [ -f ".env.dev" ]; then
  echo "" >> .env.dev
  echo "# Algolia Configuration" >> .env.dev
  echo "NEXT_PUBLIC_ALGOLIA_APP_ID=IYE83A0LRH" >> .env.dev
  echo "NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=dae9bfff3f1e612d0c0f872f5681131c" >> .env.dev
  echo "NEXT_PUBLIC_ALGOLIA_INDEX_NAME=membership-requests-dev" >> .env.dev
  echo "ALGOLIA_APP_ID=IYE83A0LRH" >> .env.dev
  echo "ALGOLIA_WRITE_API_KEY=f37a6169f18864759940d3a3125625f2" >> .env.dev
  echo "✅ Variables ajoutées à .env.dev"
else
  echo "⚠️  .env.dev n'existe pas, création..."
  cat > .env.dev << 'EOF'
# Algolia Configuration
NEXT_PUBLIC_ALGOLIA_APP_ID=IYE83A0LRH
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=dae9bfff3f1e612d0c0f872f5681131c
NEXT_PUBLIC_ALGOLIA_INDEX_NAME=membership-requests-dev
ALGOLIA_APP_ID=IYE83A0LRH
ALGOLIA_WRITE_API_KEY=f37a6169f18864759940d3a3125625f2
EOF
  echo "✅ .env.dev créé avec les variables Algolia"
fi

# .env.preview
if [ -f ".env.preview" ]; then
  echo "" >> .env.preview
  echo "# Algolia Configuration" >> .env.preview
  echo "NEXT_PUBLIC_ALGOLIA_APP_ID=IYE83A0LRH" >> .env.preview
  echo "NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=dae9bfff3f1e612d0c0f872f5681131c" >> .env.preview
  echo "NEXT_PUBLIC_ALGOLIA_INDEX_NAME=membership-requests-preprod" >> .env.preview
  echo "ALGOLIA_APP_ID=IYE83A0LRH" >> .env.preview
  echo "ALGOLIA_WRITE_API_KEY=f37a6169f18864759940d3a3125625f2" >> .env.preview
  echo "✅ Variables ajoutées à .env.preview"
else
  echo "⚠️  .env.preview n'existe pas, création..."
  cat > .env.preview << 'EOF'
# Algolia Configuration
NEXT_PUBLIC_ALGOLIA_APP_ID=IYE83A0LRH
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=dae9bfff3f1e612d0c0f872f5681131c
NEXT_PUBLIC_ALGOLIA_INDEX_NAME=membership-requests-preprod
ALGOLIA_APP_ID=IYE83A0LRH
ALGOLIA_WRITE_API_KEY=f37a6169f18864759940d3a3125625f2
EOF
  echo "✅ .env.preview créé avec les variables Algolia"
fi

# .env.prod
if [ -f ".env.prod" ]; then
  echo "" >> .env.prod
  echo "# Algolia Configuration" >> .env.prod
  echo "NEXT_PUBLIC_ALGOLIA_APP_ID=IYE83A0LRH" >> .env.prod
  echo "NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=dae9bfff3f1e612d0c0f872f5681131c" >> .env.prod
  echo "NEXT_PUBLIC_ALGOLIA_INDEX_NAME=membership-requests-prod" >> .env.prod
  echo "ALGOLIA_APP_ID=IYE83A0LRH" >> .env.prod
  echo "ALGOLIA_WRITE_API_KEY=f37a6169f18864759940d3a3125625f2" >> .env.prod
  echo "✅ Variables ajoutées à .env.prod"
else
  echo "⚠️  .env.prod n'existe pas, création..."
  cat > .env.prod << 'EOF'
# Algolia Configuration
NEXT_PUBLIC_ALGOLIA_APP_ID=IYE83A0LRH
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=dae9bfff3f1e612d0c0f872f5681131c
NEXT_PUBLIC_ALGOLIA_INDEX_NAME=membership-requests-prod
ALGOLIA_APP_ID=IYE83A0LRH
ALGOLIA_WRITE_API_KEY=f37a6169f18864759940d3a3125625f2
EOF
  echo "✅ .env.prod créé avec les variables Algolia"
fi

echo ""
echo "🎉 Toutes les variables Algolia ont été ajoutées !"
echo ""
echo "📋 Vérification :"
echo "   - .env.dev : $(grep -c "ALGOLIA" .env.dev 2>/dev/null || echo "0") variables Algolia"
echo "   - .env.preview : $(grep -c "ALGOLIA" .env.preview 2>/dev/null || echo "0") variables Algolia"
echo "   - .env.prod : $(grep -c "ALGOLIA" .env.prod 2>/dev/null || echo "0") variables Algolia"
