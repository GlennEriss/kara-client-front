/**
 * Fixtures pour les tests du module Membership Requests V2
 * 
 * Données de test pré-définies pour les tests unitaires et d'intégration
 */

import type { MembershipRequest } from '../../entities'

/**
 * Crée une fixture de demande d'adhésion avec des valeurs par défaut
 * Peut être surchargée avec des valeurs spécifiques
 */
export function createMembershipRequestFixture(
  overrides: Partial<MembershipRequest> = {}
): MembershipRequest {
  const timestamp = Date.now()
  const randomId = Math.floor(Math.random() * 10000)
  
  return {
    id: `test-${timestamp}-${randomId}`,
    matricule: `MK_2025_${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
    status: 'pending',
    isPaid: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    identity: {
      civility: 'Monsieur',
      firstName: 'Jean',
      lastName: 'Dupont',
      birthDate: '1990-05-15',
      birthPlace: 'Libreville',
      birthCertificateNumber: 'LBV-1990-123456',
      nationality: 'GA',
      gender: 'Homme',
      maritalStatus: 'Célibataire',
      contacts: ['+24165671734'],
      email: 'jean.dupont@test.com',
      religion: 'Christianisme',
      prayerPlace: 'Église St-Michel',
      hasCar: false,
      photoURL: 'https://example.com/photo.jpg',
    },
    address: {
      province: 'Estuaire',
      city: 'Libreville',
      district: 'Centre-Ville',
      arrondissement: '1er Arrondissement',
      street: '123 Rue de Test',
    },
    company: {
      isEmployed: true,
      companyName: 'Test Corp',
      profession: 'Ingénieur',
      seniority: '5 ans',
      companyAddress: {
        province: 'Estuaire',
        city: 'Libreville',
      },
    },
    documents: {
      identityDocument: 'CNI',
      identityDocumentNumber: '1234567890',
      issuingDate: '2020-01-15',
      expirationDate: '2030-01-15',
      issuingPlace: 'Libreville',
      photoFront: 'https://example.com/front.jpg',
      photoBack: 'https://example.com/back.jpg',
      termsAccepted: true,
    },
    ...overrides,
  } as MembershipRequest
}

/**
 * Variante : Demande en attente, non payée
 */
export function pendingUnpaidRequest(): MembershipRequest {
  return createMembershipRequestFixture({
    status: 'pending',
    isPaid: false,
  })
}

/**
 * Variante : Demande en attente, payée
 */
export function pendingPaidRequest(): MembershipRequest {
  return createMembershipRequestFixture({
    status: 'pending',
    isPaid: true,
    payments: [{
      date: new Date(),
      mode: 'cash',
      amount: 25000,
      acceptedBy: 'admin-123',
      paymentType: 'Membership',
      time: '10:30',
      withFees: false,
    }],
  })
}

/**
 * Variante : Demande en cours d'examen
 */
export function underReviewRequest(): MembershipRequest {
  return createMembershipRequestFixture({
    status: 'under_review',
    isPaid: true,
    securityCode: '123456',
    securityCodeUsed: false,
    securityCodeExpiry: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h
    reviewNote: 'Veuillez mettre à jour votre photo.', // Utiliser reviewNote à la place de corrections
  })
}

/**
 * Variante : Demande approuvée
 */
export function approvedRequest(): MembershipRequest {
  return createMembershipRequestFixture({
    status: 'approved',
    isPaid: true,
    processedAt: new Date(),
    processedBy: 'admin-123',
  })
}

/**
 * Variante : Demande rejetée
 */
export function rejectedRequest(): MembershipRequest {
  return createMembershipRequestFixture({
    status: 'rejected',
    isPaid: false,
    processedAt: new Date(),
    processedBy: 'admin-123',
    motifReject: 'Documents incomplets.',
  })
}

/**
 * Génère une liste de n demandes pour les tests de pagination
 */
export function generateManyRequests(count: number): MembershipRequest[] {
  return Array(count)
    .fill(0)
    .map((_, i) =>
      createMembershipRequestFixture({
        id: `test-${i}`,
        matricule: `MK_2025_${String(i).padStart(4, '0')}`,
        identity: {
          ...createMembershipRequestFixture().identity,
          firstName: `Prénom${i}`,
          lastName: `Nom${i}`,
          email: `user${i}@test.com`,
        },
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // i jours dans le passé
      })
    )
}
