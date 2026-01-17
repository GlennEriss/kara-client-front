/**
 * Noms de collections Firestore
 * 
 * Note: Chaque environnement (dev, preprod, prod) utilise sa propre base de données Firebase,
 * donc les noms de collections sont identiques dans tous les environnements.
 * Pas besoin de suffixes -dev, -preprod, etc.
 */

export const firebaseCollectionNames = {
    membershipRequests: "membership-requests",
    members: "members",
    users: "users",
    admins: "admins",
    groups: "groups",
    events: "events",
    news: "news",
    notifications: "notifications",
    settings: "settings",
    categories: "categories",
    subscriptions: "subscriptions",
    addresses: "addresses",
    companies: "companies",
    professions: "professions",
    // Caisse Spéciale
    caisseContracts: "caisseContracts",
    caisseSettings: "caisseSettings",
    caisseAdminNotes: "caisseAdminNotes",
    caisseSpecialeDemands: "caisseSpecialeDemands",
    // Caisse Imprévue
    subscriptionsCI: "subscriptionsCI",
    contractsCI: "contractsCI",
    caisseImprevueDemands: "caisseImprevueDemands",
    // Documents
    documents: "documents",
    placements: "placements",
    placementDemands: "placementDemands",
    // Géographie
    provinces: "provinces",
    departments: "departments",
    communes: "communes",
    districts: "districts",
    quarters: "quarters",
    // Crédit spéciale
    creditDemands: "creditDemands",
    creditContracts: "creditContracts",
    creditInstallments: "creditInstallments",
    creditPayments: "creditPayments",
    creditPenalties: "creditPenalties",
    guarantorRemunerations: "guarantorRemunerations",
    // Collection centralisée pour tous les versements
    payments: "payments",
}

// Export également en majuscules pour compatibilité
export const FIREBASE_COLLECTION_NAMES = {
    MEMBERSHIP_REQUESTS: firebaseCollectionNames.membershipRequests,
    MEMBERS: firebaseCollectionNames.members,
    USERS: firebaseCollectionNames.users,
    ADMINS: firebaseCollectionNames.admins,
    GROUPS: firebaseCollectionNames.groups,
    EVENTS: firebaseCollectionNames.events,
    NEWS: firebaseCollectionNames.news,
    NOTIFICATIONS: firebaseCollectionNames.notifications,
    SETTINGS: firebaseCollectionNames.settings,
    CATEGORIES: firebaseCollectionNames.categories,
    SUBSCRIPTIONS: firebaseCollectionNames.subscriptions,
    ADDRESSES: firebaseCollectionNames.addresses,
    COMPANIES: firebaseCollectionNames.companies,
    PROFESSIONS: firebaseCollectionNames.professions,
    PLACEMENTS: firebaseCollectionNames.placements,
    // Caisse Spéciale
    CAISSE_CONTRACTS: firebaseCollectionNames.caisseContracts,
    CAISSE_SETTINGS: firebaseCollectionNames.caisseSettings,
    CAISSE_ADMIN_NOTES: firebaseCollectionNames.caisseAdminNotes,
    CAISSE_SPECIALE_DEMANDS: firebaseCollectionNames.caisseSpecialeDemands,
    // Caisse Imprévue
    SUBSCRIPTIONS_CI: firebaseCollectionNames.subscriptionsCI,
    CONTRACTS_CI: firebaseCollectionNames.contractsCI,
    CAISSE_IMPREVUE_DEMANDS: firebaseCollectionNames.caisseImprevueDemands,
    // Documents
    DOCUMENTS: firebaseCollectionNames.documents,
    PLACEMENT_DEMANDS: firebaseCollectionNames.placementDemands,
    // Géographie
    PROVINCES: firebaseCollectionNames.provinces,
    DEPARTMENTS: firebaseCollectionNames.departments,
    COMMUNES: firebaseCollectionNames.communes,
    DISTRICTS: firebaseCollectionNames.districts,
    QUARTERS: firebaseCollectionNames.quarters,
    // Crédit spéciale
    CREDIT_DEMANDS: firebaseCollectionNames.creditDemands,
    CREDIT_CONTRACTS: firebaseCollectionNames.creditContracts,
    CREDIT_INSTALLMENTS: firebaseCollectionNames.creditInstallments,
    CREDIT_PAYMENTS: firebaseCollectionNames.creditPayments,
    CREDIT_PENALTIES: firebaseCollectionNames.creditPenalties,
    GUARANTOR_REMUNERATIONS: firebaseCollectionNames.guarantorRemunerations,
    // Collection centralisée pour tous les versements
    PAYMENTS: firebaseCollectionNames.payments,
}