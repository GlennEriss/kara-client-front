This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Prospection assurance

`/vehicules/prospection` suit les véhicules assurés ailleurs et leur attribution à un parrain ou à LE KARA — Inconnu. Le domaine `src/domains/insurance-prospects/` fournit la validation, les dates civiles du Gabon et les transitions transactionnelles ; `src/domains/mobile-admin/operations/insurance-prospects.ts` expose les mêmes opérations à l’app native. La collection `insurance-prospects` reste distincte des assurances validées. Une conversion exige une assurance existante de même plaque et parrain, couvrant une période après l’ancienne échéance.

Les rappels J−30/J−15/J−7/J et les relances datées sont préparés dans `functions/src/scheduled/insuranceProspects.ts`, appelé par `dailyVehicleInsuranceExpiring`. Ils sont dédupliqués par échéance, palier et destinataire. Le déploiement des règles Firestore et de cette fonction est nécessaire pour activer la nouvelle fonctionnalité, en plus des sites et de l’API mobile. Aucun déploiement automatique depuis les tests ; les tests des règles utilisent exclusivement `demo-kara-prospects`.


## Livraison serveur pour LE KARA 1.3.4 — 20 novembre 2026

Le commit applicatif `1b8ca37ed5e63c2045aa9450c483226e7da4be5e`, présent sur
`develop`, est livré sur `kara-admin` / `kara-gabon` / `us-east4`.
Build et rollout : `build-2026-11-20-003` ; Cloud Build `SUCCESS`, App Hosting
`READY`, rollout `SUCCEEDED`, trafic confirmé à 100 % sur cette version.

La livraison active les pénalités après terme des crédits simples, leur
séparation du prêt non remboursé dans les détails et bilans, le nombre
d’échéances passées tous cycles dans l’export Crédit spécial, les quartiers
des véhicules reliés à Géographie et leurs statistiques, les commandes
compactes des cartes et le chargement du logo par import statique.

Les règles de production ont reçu uniquement le patch géographique du commit.
Les règles actives des autres sections, notamment Groupes, sont conservées.
Ruleset : `ab81e34d-02b2-4492-9e19-230c092e63ad`.
SHA-256 du contenu publié : `c6048af31338e4d864632a1f48ad041d38e826ed52dc4603b01a7a8da047fa0b`.
Le patch a été testé contre les règles réellement actives : 9 tests passent
sur l’émulateur `demo-kara-prospects`. Le test accepte
`KARA_FIRESTORE_RULES_PATH` pour vérifier un fichier fusionné avant publication.
Les sauvegardes des règles et du backend restent privées, hors du dépôt.

Contrôles après livraison : configuration du backend et règles actives
vérifiées ; cinq routes mobiles renvoient 401 JSON sans jeton, avec
`Cache-Control: no-store, private`. La connexion répond 200 et son logo compilé
répond 200 en WebP. Ces contrôles ne constituent pas une recette métier
authentifiée. Aucun paiement, migration de données, envoi de notification,
déploiement de Functions ou d’index n’est effectué par cette livraison.
