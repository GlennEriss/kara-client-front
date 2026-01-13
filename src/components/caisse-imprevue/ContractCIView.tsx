'use client'

import React from 'react'
import { ContractCI } from '@/types/types'
import { getDocumentTypeLabel } from '@/domains/infrastructure/documents/constants/document-types'
import { getNationalityName } from '@/constantes/nationality'

interface ContractCIViewProps {
  contract: ContractCI
}

export default function ContractCIView({ contract }: ContractCIViewProps) {
  return (
    <div
      id="contract-pdf-view"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '20mm',
        backgroundColor: '#fff',
        fontFamily: 'Helvetica, Arial, sans-serif',
        color: '#000',
        fontSize: '12px',
        lineHeight: '1.5',
      }}
    >
      {/* ===== LOGO + EN-TÊTE ===== */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <img 
            src="/Logo-Kara.webp" 
            alt="Logo KARA" 
            width={80} 
            height={80}
            style={{ margin: '0 auto', display: 'block' }}
          />
        </div>
        <h2 style={{ color: '#234D65', marginBottom: '4px', fontSize: '20px', fontWeight: 'bold' }}>
          MUTUELLE KARA
        </h2>
        <h3 style={{ color: '#2c5a73', textDecoration: 'underline', fontSize: '16px', fontWeight: 'bold' }}>
          VOLET ENTRAIDE
        </h3>
      </div>

      {/* ===== INFOS PERSONNELLES ===== */}
      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        {/* Photo du membre si disponible */}
        {contract.memberPhotoUrl && (
          <div style={{ flexShrink: 0 }}>
            <img 
              src={contract.memberPhotoUrl} 
              alt="Photo du membre" 
              width={100} 
              height={120}
              style={{ 
                border: '2px solid #234D65', 
                borderRadius: '8px',
                objectFit: 'cover',
                display: 'block'
              }}
            />
          </div>
        )}
        
        <div style={{ flex: 1 }}>
          <h4 style={{ color: '#234D65', fontSize: '14px', fontWeight: 'bold' }}>
            Informations personnelles du membre :
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 0' }}><b>Matricule :</b> {contract.memberId}</td>
                <td style={{ padding: '4px 0' }}><b>Sexe :</b> {contract.memberGender || '—'}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0' }}><b>Nom :</b> {contract.memberLastName}</td>
                <td style={{ padding: '4px 0' }}><b>Prénom :</b> {contract.memberFirstName}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0' }}><b>Date de naissance :</b> {contract.memberBirthDate || '—'}</td>
                <td style={{ padding: '4px 0' }}><b>Nationalité :</b> {getNationalityName(contract.memberNationality)}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0' }}><b>Téléphone 1 :</b> {contract.memberContacts?.[0] || '—'}</td>
                <td style={{ padding: '4px 0' }}><b>Téléphone 2 :</b> {contract.memberContacts?.[1] || '—'}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0' }}><b>Quartier :</b> {contract.memberAddress || '—'}</td>
                <td style={{ padding: '4px 0' }}><b>Profession :</b> {contract.memberProfession || '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== CONTACT URGENCE ===== */}
      <h4 style={{ color: '#234D65', marginTop: '20px', fontSize: '14px', fontWeight: 'bold' }}>
        Informations concernant le contact d&apos;urgence :
      </h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
        <tbody>
          <tr>
            <td style={{ padding: '4px 0' }}><b>Nom :</b> {contract.emergencyContact?.lastName}</td>
            <td style={{ padding: '4px 0' }}><b>Prénom :</b> {contract.emergencyContact?.firstName || '—'}</td>
          </tr>
          <tr>
            <td style={{ padding: '4px 0' }}><b>Liens :</b> {contract.emergencyContact?.relationship}</td>
            <td style={{ padding: '4px 0' }}><b>Téléphone :</b> {contract.emergencyContact?.phone1}</td>
          </tr>
          {contract.emergencyContact?.phone2 && (
            <tr>
              <td colSpan={2} style={{ padding: '4px 0' }}>
                <b>Téléphone secondaire :</b> {contract.emergencyContact.phone2}
              </td>
            </tr>
          )}
          <tr>
            <td style={{ padding: '4px 0' }}>
              <b>Type de document :</b> {contract.emergencyContact?.typeId ? getDocumentTypeLabel(contract.emergencyContact.typeId) : '—'}
            </td>
            <td style={{ padding: '4px 0' }}>
              <b>N°CNI/PASS/CS :</b> {contract.emergencyContact?.idNumber || '—'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ===== TEXTE DU CONTRAT ===== */}
      <div style={{ marginTop: '25px', textAlign: 'justify' }}>
        <p style={{ marginBottom: '10px' }}>
          Dans le cadre d&apos;une démarche purement sociale, l&apos;association <b>KARA</b> lance le volet
          <b> « Entraide »</b>, qui est un contrat sous lequel l&apos;association garantit des prestations
          destinées à octroyer des fonds monétaires à l&apos;adhérent au cours de l&apos;année.
        </p>
        <p>
          Au titre de la présente garantie, l&apos;association KARA s&apos;engage, en contrepartie d&apos;une prime
          mensuelle (<b>{contract.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA</b>),
          à octroyer à l&apos;adhérent un montant compris entre 30 000 et 150 000 FCFA à taux nul (0%)
          remboursable dans une durée définie. Ce prêt est dit : <b>accompagnement régulier</b>.
        </p>
      </div>

      {/* ===== CLAUSES ===== */}
      <h4 style={{ color: '#234D65', marginTop: '20px', fontSize: '14px', fontWeight: 'bold' }}>
        Les clauses du contrat :
      </h4>
      <ul style={{ marginLeft: '20px' }}>
        <li><b>L&apos;adhérent :</b> Est un membre de la mutuelle qui souscrit au Volet Entraide.</li>
        <li><b>Le nominal :</b> Correspond au versement mensuel sous 12 mois.</li>
        <li><b>L&apos;accompagnement régulier :</b> Montant maximum empruntable selon le forfait.</li>
      </ul>

      {/* ===== TABLEAU DES FORFAITS ===== */}
      <div style={{ marginTop: '20px' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #000',
            textAlign: 'center',
          }}
        >
          <thead style={{ background: '#f0f0f0' }}>
            <tr>
              <th style={{ border: '1px solid #000', padding: '8px' }}>Forfait</th>
              <th style={{ border: '1px solid #000', padding: '8px' }}>Nominal</th>
              <th style={{ border: '1px solid #000', padding: '8px' }}>Appui</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', padding: '6px' }}>A - 10 000</td>
              <td style={{ border: '1px solid #000', padding: '6px' }}>120 000</td>
              <td style={{ border: '1px solid #000', padding: '6px' }}>[0 ; 30 000]</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '6px' }}>B - 20 000</td>
              <td style={{ border: '1px solid #000', padding: '6px' }}>240 000</td>
              <td style={{ border: '1px solid #000', padding: '6px' }}>[0 ; 60 000]</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '6px' }}>C - 30 000</td>
              <td style={{ border: '1px solid #000', padding: '6px' }}>360 000</td>
              <td style={{ border: '1px solid #000', padding: '6px' }}>[0 ; 90 000]</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '6px' }}>D - 40 000</td>
              <td style={{ border: '1px solid #000', padding: '6px' }}>480 000</td>
              <td style={{ border: '1px solid #000', padding: '6px' }}>[0 ; 120 000]</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '6px' }}>E - 50 000</td>
              <td style={{ border: '1px solid #000', padding: '6px' }}>600 000</td>
              <td style={{ border: '1px solid #000', padding: '6px' }}>[0 ; 150 000]</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===== SIGNATURES ===== */}
      <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <p><b>Signature du membre :</b></p>
          <p style={{ marginTop: '60px' }}>« lu et approuvé »</p>
        </div>
        <div>
          <p><b>Signature du Secrétaire Exécutif :</b></p>
        </div>
      </div>

      {/* ===== RÉCAPITULATIF DES VERSEMENTS ===== */}
      <div style={{ pageBreakBefore: 'always', paddingTop: '20px' }}>
        <h4 style={{ color: '#234D65', marginTop: '10px', fontSize: '14px', fontWeight: 'bold' }}>
          Récapitulatif des versements mensuels
        </h4>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #000',
            textAlign: 'center',
            marginTop: '8px',
          }}
        >
          <thead>
            <tr>
              <th style={{ border: '1px solid #000', padding: '8px' }}>Mois</th>
              <th style={{ border: '1px solid #000', padding: '8px' }}>Montant versé</th>
              <th style={{ border: '1px solid #000', padding: '8px' }}>Date</th>
              <th style={{ border: '1px solid #000', padding: '8px' }}>Signature adhérent</th>
              <th style={{ border: '1px solid #000', padding: '8px' }}>Signature SE</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(12)].map((_, i) => (
              <tr key={i}>
                <td style={{ border: '1px solid #000', padding: '10px' }}>{i + 1}</td>
                <td style={{ border: '1px solid #000', padding: '10px' }}></td>
                <td style={{ border: '1px solid #000', padding: '10px' }}></td>
                <td style={{ border: '1px solid #000', padding: '10px' }}></td>
                <td style={{ border: '1px solid #000', padding: '10px' }}></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

