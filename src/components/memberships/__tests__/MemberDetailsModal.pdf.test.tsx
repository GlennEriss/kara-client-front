/**
 * L'engagement d'adhésion doit tenir sur une seule page : la mise en page est
 * volontairement serrée, ce test empêche tout débordement sur une 2e page,
 * dossier complet comme dossier incomplet.
 */
import { renderToBuffer } from '@react-pdf/renderer'
import fs from 'fs'
import os from 'os'
import path from 'path'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { MutuelleKaraPDF } from '../MemberDetailsModal'

// react-pdf charge le logo depuis `window.location.origin` : en test on pointe
// directement le dossier `public` pour qu'il soit lu sur le disque.
const publicDir = path.resolve(process.cwd(), 'public')

// Remplissage « au maximum » : c'est le cas le plus haut, celui qui risque de
// déborder sur une 2e page.
const fillData: any = {
  paymentMode: 'B',
  quality: 'adherent',
  headerPhotoDataUrl: null,
  page1Location: 'Owendo',
  page1MemberDate: '2026-01-15',
  page1SecretaryDate: '2026-01-15',
  page1MemberSignature: null,
  page1SecretarySignature: null,
  memberFullName: 'NDONG OBAME Jean Baptiste',
  birthDate: '12/04/1988',
  birthPlace: 'LIBREVILLE',
  identityDocumentNumber: 'CNI-123456',
  identityDocumentIssuingDate: '30/09/2021',
  addressLine: 'Awougou, 2e arrondissement, Owendo, Estuaire',
  phoneLine: '+24177123456 / +24166987654',
  email: 'jean.ndong@example.ga',
  professionLine: 'Technicien réseau / SEEG',
  beneficiaryFullName: 'NDONG Marie Claire',
  beneficiaryRelationship: 'Épouse',
  beneficiaryPhone: '+24174556677',
  beneficiaryIdNumber: 'CNI-998877',
}

// Valeurs anormalement longues : plusieurs cellules passent sur deux lignes,
// c'est la marge de sécurité qui empêche le pied de page de basculer page 2.
const longFillData: any = {
  ...fillData,
  memberFullName: 'OBIANG MENGUE NDONG EYEGHE Marie-Christelle Pulchérie',
  birthPlace: 'PORT-GENTIL, OGOOUÉ-MARITIME, GABON',
  addressLine: 'Awougou derrière la station Total, 2e arrondissement, Owendo, Estuaire, Gabon',
  phoneLine: '+24177123456 / +24166987654 / +24162334455 / +24174998877',
  email: 'marie.christelle.obiang.mengue@association-kara.ga',
  professionLine: "Chargée de clientèle grands comptes / Société d'Énergie et d'Eau du Gabon",
  beneficiaryFullName: 'NDONG OBAME MBA NGUEMA Jean-Baptiste Rodrigue',
  beneficiaryIdNumber: 'CNI-GA-998877665544332211',
}

// Toutes les lignes vides : le document sort en pointillés
const emptyFillData: any = {
  ...fillData,
  paymentMode: null,
  quality: null,
  page1Location: '',
  memberFullName: '',
  birthDate: '',
  birthPlace: '',
  identityDocumentNumber: '',
  identityDocumentIssuingDate: '',
  addressLine: '',
  phoneLine: '',
  email: '',
  professionLine: '',
  beneficiaryFullName: '',
  beneficiaryRelationship: '',
  beneficiaryPhone: '',
  beneficiaryIdNumber: '',
}

const fullRequest: any = {
  id: '1234.MK.567890',
  matricule: '1234.MK.567890',
  status: 'approved',
  identity: {
    civility: 'Monsieur',
    lastName: 'Ndong Obame',
    firstName: 'Jean Baptiste',
    birthDate: '1988-04-12',
    birthPlace: 'Libreville',
    contacts: ['+24177123456', '+24166987654'],
    whatsappNumber: '+24177123456',
    email: 'jean.ndong@example.ga',
    nationality: 'GA',
    maritalStatus: 'Marié(e)',
    hasCar: true,
    beneficiary: {
      lastName: 'Ndong',
      firstName: 'Marie Claire',
      relationship: 'Épouse',
      phone: '+24174556677',
      idNumber: 'CNI-998877',
    },
  },
  address: {
    province: 'Estuaire',
    city: 'Owendo',
    district: 'Awougou',
    arrondissement: '2e arrondissement',
  },
  company: { isEmployed: true, companyName: 'SEEG', profession: 'Technicien réseau' },
  documents: {
    identityDocument: 'CNI',
    identityDocumentNumber: 'CNI-123456',
    issuingDate: '2021-09-30',
    expirationDate: '2031-09-30',
    issuingPlace: 'Libreville',
    termsAccepted: true,
  },
}

// Dossier créé avant l'ajout de l'ayant-droit : les lignes non connues
// s'impriment en pointillés, le document doit garder la même pagination.
const bareRequest: any = {
  id: '9999.MK.000001',
  matricule: '9999.MK.000001',
  status: 'pending',
  identity: {
    civility: 'Madame',
    lastName: 'Obiang Mengue Ndong Eyeghe',
    contacts: [],
    nationality: 'GA',
    maritalStatus: 'Célibataire',
    hasCar: false,
  },
  address: {},
  company: { isEmployed: false },
  documents: {},
}

const countPages = async (request: any, data: any): Promise<number> => {
  const buffer = await renderToBuffer(<MutuelleKaraPDF request={request} fillData={data} />)
  const file = path.join(os.tmpdir(), `kara-engagement-${request.id}.pdf`)
  fs.writeFileSync(file, buffer)
  try {
    // Le catalogue PDF expose le nombre de pages dans l'arbre des pages
    const match = buffer.toString('latin1').match(/\/Count (\d+)/)
    return match ? Number(match[1]) : -1
  } finally {
    fs.unlinkSync(file)
  }
}

describe('MutuelleKaraPDF', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { origin: publicDir },
      writable: true,
    })
  })

  it('tient sur une page avec un dossier complet', async () => {
    expect(await countPages(fullRequest, fillData)).toBe(1)
  }, 60000)

  it('tient sur une page avec un dossier incomplet (lignes en pointillés)', async () => {
    expect(await countPages(bareRequest, emptyFillData)).toBe(1)
  }, 60000)

  it('tient sur une page avec des valeurs longues', async () => {
    expect(await countPages(fullRequest, longFillData)).toBe(1)
  }, 60000)
})
