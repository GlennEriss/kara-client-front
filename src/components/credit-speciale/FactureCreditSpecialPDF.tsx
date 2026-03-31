'use client'

import React from 'react'

export interface FactureCreditSpecialPDFData {
  paymentDate: string
  capital: number | string
  taux: number | string
  interets: number | string
  montantGlobal: number | string
  dateEcheance: string
  dateRemise: string
  heureRemise: string
  moyen: string
  frais: string | boolean
  montantRemis: number | string
  penalite: number | string
  remarque: string
  note: string | number
  nouveauCapital1: number | string
  nouveauCapital2: number | string
  /** Montant global de l'échéance suivante (colonne "CAPITAL MOIS PROCHAIN") */
  capitalMoisProchain: number | string
  /** Partie fixe issue d'un crédit spéciale : masquer CAPITAL / TAUX / INTERETS */
  isFixedExtensionMonth?: boolean
}

/** Ex: 6000 -> "6 000", 10000 -> "10 000" (espace comme séparateur de milliers). */
function formatNumberWithSpaces(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function formatAmount(value: number | string | boolean): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') {
    return formatNumberWithSpaces(value) + ' FCFA'
  }
  const s = String(value).trim()
  if (s === '') return '0 FCFA'
  const num = parseInt(s.replace(/\s/g, ''), 10)
  if (!isNaN(num)) return formatNumberWithSpaces(num) + ' FCFA'
  return s.includes('FCFA') ? s : s + ' FCFA'
}

function formatTaux(value: number | string | boolean): string {
  const s = String(value).trim()
  if (s === '') return '0 %'
  if (s.includes('%')) return s
  return s + ' %'
}

function formatFrais(value: string | boolean | number): string {
  if (typeof value === 'boolean') return value ? 'OUI' : 'NON'
  if (typeof value === 'number') return value ? 'OUI' : 'NON'
  const s = String(value).toLowerCase()
  if (s === 'true' || s === 'oui' || s === '1') return 'OUI'
  return 'NON'
}

const BASE_ROW_CONFIG: Array<{
  key: keyof FactureCreditSpecialPDFData
  label: string
  bgColor: string
  format?: (v: number | string | boolean) => string
}> = [
  { key: 'capital', label: 'CAPITAL', bgColor: '#22B14C', format: formatAmount },
  { key: 'taux', label: 'TAUX', bgColor: '#1E6FE8', format: formatTaux },
  { key: 'interets', label: 'INTERETS', bgColor: '#1E6FE8', format: formatAmount },
  { key: 'montantGlobal', label: 'MONTANT GLOBAL', bgColor: '#FFF200', format: formatAmount },
  { key: 'dateEcheance', label: 'DATE ECHEANCE', bgColor: '#1E6FE8' },
  { key: 'dateRemise', label: 'DATE REMISE', bgColor: '#1E6FE8' },
  { key: 'heureRemise', label: 'HEURE REMISE', bgColor: '#1E6FE8' },
  { key: 'moyen', label: 'MOYEN', bgColor: '#1E6FE8' },
  { key: 'frais', label: 'FRAIS', bgColor: '#1E6FE8', format: formatFrais },
  { key: 'montantRemis', label: 'MONTANT REMIS', bgColor: '#E31B23', format: formatAmount },
  { key: 'penalite', label: 'PENALITE', bgColor: '#1E6FE8', format: formatAmount },
  { key: 'remarque', label: 'REMARQUE', bgColor: '#1E6FE8' },
  { key: 'note', label: 'NOTE', bgColor: '#1E6FE8' },
  { key: 'nouveauCapital2', label: 'NOUVEAU CAPITAL', bgColor: '#E31B23', format: formatAmount },
  { key: 'capitalMoisProchain', label: 'CAPITAL MOIS PROCHAIN', bgColor: '#1E6FE8', format: formatAmount },
]

const getRowConfig = (data: FactureCreditSpecialPDFData) =>
  BASE_ROW_CONFIG.filter((row) => {
    if (!data.isFixedExtensionMonth) return true
    return !['capital', 'taux', 'interets'].includes(String(row.key))
  })

interface FactureCreditSpecialPDFProps {
  data: FactureCreditSpecialPDFData
  className?: string
}

export default function FactureCreditSpecialPDF({ data, className }: FactureCreditSpecialPDFProps) {
  const rowConfig = getRowConfig(data)
  return (
    <div className={className}>
      <h2 className="text-left text-base font-normal mb-2" style={{ fontFamily: 'sans-serif' }}>
        VERSEMENT DU: {data.paymentDate}
      </h2>
      <table
        className="w-full border-collapse"
        style={{
          border: '1.5px solid black',
          tableLayout: 'fixed',
        }}
        >
        <tbody>
          {rowConfig.map(({ key, label, bgColor, format }) => {
            const raw = data[key]
            const value = format
              ? format(raw as number | string | boolean)
              : String(raw ?? '')
            return (
              <tr key={key} style={{ minHeight: 44 }}>
                <td
                  style={{
                    width: '38%',
                    border: '1.5px solid black',
                    padding: '10px 8px',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    backgroundColor: bgColor,
                    fontFamily: 'Times New Roman, serif',
                    fontStyle: 'italic',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    textTransform: 'uppercase',
                  }}
                >
                  {label}
                </td>
                <td
                  style={{
                    width: '62%',
                    border: '1.5px solid black',
                    padding: '10px 8px',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    backgroundColor: '#ffffff',
                    color: '#777',
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    fontSize: '0.9rem',
                  }}
                >
                  {value}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
