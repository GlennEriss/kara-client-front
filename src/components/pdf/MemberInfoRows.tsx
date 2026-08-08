import { StyleSheet, Text, View } from '@react-pdf/renderer'
import * as React from 'react'

/**
 * Bloc « Informations Personnelles du Membre » des contrats PDF.
 *
 * Il était recopié dans chaque module (Caisse Spéciale, Crédit Spécial, Caisse
 * Imprévue) et avait dérivé : libellés, champs retenus et bleu d'accent
 * différaient d'un contrat à l'autre. Ce composant fixe le gabarit commun, celui
 * de la Caisse Spéciale.
 *
 * Il rend une suite de lignes, pas un tableau : chaque module l'insère dans son
 * propre `<View style={table}>` et y enchaîne sa section suivante — contact
 * urgent pour la Caisse Spéciale, garant pour le Crédit Spécial.
 */

const colWidths = [0.269, 0.307, 0.152, 0.272]
const sumCols = (start: number, span: number) =>
  colWidths.slice(start, start + span).reduce((acc, val) => acc + val, 0)

const ACCENT_BLUE = '#1f4f68'
const BORDER_SOFT = '#cbd5e1'
const TEXT_PRIMARY = '#1f2937'
const TEXT_MUTED = '#334155'

/**
 * Chaque contrat garde sa propre typographie — le Crédit Spécial est en Times
 * New Roman, la Caisse Spéciale en police par défaut. Seules la structure, les
 * libellés et le bleu d'accent sont imposés.
 */
export type MemberInfoRowsTheme = {
  fontFamily?: string
  headerFontSize?: number
  labelFontSize?: number
  valueFontSize?: number
  borderColor?: string
  cellPaddingHorizontal?: number
}

const baseStyles = StyleSheet.create({
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    paddingVertical: 4,
    justifyContent: 'center',
  },
})

const buildStyles = (theme: MemberInfoRowsTheme) => {
  const borderColor = theme.borderColor ?? BORDER_SOFT
  const fontFamily = theme.fontFamily

  return {
    cell: { ...baseStyles.tableCell, paddingHorizontal: theme.cellPaddingHorizontal ?? 5 },
    rightBorder: { borderRightWidth: 0.5, borderRightColor: borderColor },
    bottomBorder: { borderBottomWidth: 0.5, borderBottomColor: borderColor },
    headerText: {
      ...(fontFamily ? { fontFamily } : {}),
      fontSize: theme.headerFontSize ?? 14,
      fontWeight: 'bold' as const,
      color: '#FFFFFF',
      textAlign: 'center' as const,
    },
    labelText: {
      ...(fontFamily ? { fontFamily } : {}),
      fontSize: theme.labelFontSize ?? 11,
      color: TEXT_MUTED,
    },
    valueText: {
      ...(fontFamily ? { fontFamily } : {}),
      fontSize: theme.valueFontSize ?? 11,
      textAlign: 'center' as const,
      color: TEXT_PRIMARY,
    },
  }
}

type TableCellConfig = {
  content?: React.ReactNode
  span?: number
  textStyle?: any
  backgroundColor?: string
}

const TableRow = ({
  cells,
  height,
  isLastRow,
  styles,
}: {
  cells: TableCellConfig[]
  height: number
  isLastRow?: boolean
  styles: ReturnType<typeof buildStyles>
}) => {
  let colIndex = 0

  return (
    <View style={[baseStyles.tableRow, { minHeight: height }]}>
      {cells.map((cell, index) => {
        const span = cell.span ?? 1
        const width = `${sumCols(colIndex, span) * 100}%`
        const isLastCol = colIndex + span >= colWidths.length
        const cellStyles = [
          styles.cell,
          { width },
          ...(isLastCol ? [] : [styles.rightBorder]),
          ...(isLastRow ? [] : [styles.bottomBorder]),
          ...(cell.backgroundColor ? [{ backgroundColor: cell.backgroundColor }] : []),
        ]

        colIndex += span

        return (
          <View key={index} style={cellStyles}>
            {typeof cell.content === 'string' ? (
              <Text style={cell.textStyle}>{cell.content}</Text>
            ) : (
              cell.content
            )}
          </View>
        )
      })}
    </View>
  )
}

export type MemberInfoRowsData = {
  matricule?: string
  /** Type d'adhésion, colonne « MEMBRE ». */
  membershipType?: string
  lastName?: string
  firstName?: string
  birthPlace?: string
  /** Déjà formatée par l'appelant (formats de date propres à chaque module). */
  birthDate?: string
  nationality?: string
  /** Libellé du type de pièce, préfixé au numéro quand il est connu. */
  identityDocumentLabel?: string
  identityDocumentNumber?: string
  /** Téléphones déjà agrégés, ou liste que le composant joindra. */
  phones?: string | (string | undefined)[]
  gender?: string
  age?: string | number
  district?: string
  profession?: string
}

const PLACEHOLDER = '—'

/** Âge en années révolues, ou `—` si la date de naissance est absente. */
export const calculateAgeFromBirthDate = (birthDate?: string | Date): string => {
  if (!birthDate) return PLACEHOLDER
  const birth = birthDate instanceof Date ? birthDate : new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return PLACEHOLDER

  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--

  return age >= 0 ? String(age) : PLACEHOLDER
}

/**
 * Libellé lisible d'un type de pièce d'identité. Recopié à l'identique dans
 * trois PDF Crédit Spécial ; centralisé ici pour que les contrats l'affichent
 * tous pareil.
 */
export const getIdentityDocumentLabel = (doc?: string): string => {
  if (!doc) return PLACEHOLDER
  const d = String(doc).toUpperCase()
  if (d.includes('CNI')) return 'CNI'
  if (d.includes('PASS') || d.includes('PASSEPORT')) return 'Passeport'
  if (d.includes('CS')) return 'Carte de séjour'
  return doc
}

const orPlaceholder = (value?: string | number) => {
  const text = value === undefined || value === null ? '' : String(value).trim()
  return text || PLACEHOLDER
}

const formatPhones = (phones: MemberInfoRowsData['phones']) => {
  if (Array.isArray(phones)) {
    const joined = phones.filter((p) => p && String(p).trim() && String(p).trim() !== PLACEHOLDER).join(' || ')
    return joined || PLACEHOLDER
  }
  return orPlaceholder(phones)
}

const formatIdentity = (label?: string, number?: string) => {
  const cleanLabel = label?.trim()
  const cleanNumber = number?.trim()
  if (cleanLabel && cleanLabel !== PLACEHOLDER && cleanNumber && cleanNumber !== PLACEHOLDER) {
    return `${cleanLabel} — ${cleanNumber}`
  }
  return orPlaceholder(cleanNumber)
}

const formatAge = (age?: string | number) => {
  if (age === undefined || age === null || String(age).trim() === '') return PLACEHOLDER
  const text = String(age).trim()
  return text.toLowerCase().includes('an') ? text : `${text} ans`
}

export function MemberInfoRows({
  member,
  /** Passe à `true` quand ce bloc termine le tableau de l'appelant. */
  isLastRow = false,
  theme = {},
}: {
  member: MemberInfoRowsData
  isLastRow?: boolean
  theme?: MemberInfoRowsTheme
}) {
  const styles = buildStyles(theme)

  return (
    <>
      <TableRow
        styles={styles}
        height={43.35}
        cells={[
          {
            content: 'Informations Personnelles du Membre :',
            span: 4,
            textStyle: styles.headerText,
            backgroundColor: ACCENT_BLUE,
          },
        ]}
      />
      <TableRow
        styles={styles}
        height={26.15}
        cells={[
          { content: 'MATRICULE', textStyle: styles.labelText },
          { content: orPlaceholder(member.matricule), textStyle: styles.valueText },
          { content: 'MEMBRE', textStyle: styles.labelText },
          { content: member.membershipType?.trim() || '', textStyle: styles.valueText },
        ]}
      />
      <TableRow
        styles={styles}
        height={26.15}
        cells={[
          { content: 'NOM', textStyle: styles.labelText },
          { content: orPlaceholder(member.lastName?.toUpperCase()), span: 3, textStyle: styles.valueText },
        ]}
      />
      <TableRow
        styles={styles}
        height={26.15}
        cells={[
          { content: 'PRÉNOM', textStyle: styles.labelText },
          { content: orPlaceholder(member.firstName), span: 3, textStyle: styles.valueText },
        ]}
      />
      <TableRow
        styles={styles}
        height={26.15}
        cells={[
          { content: 'LIEU / NAISSANCE', textStyle: styles.labelText },
          { content: orPlaceholder(member.birthPlace), textStyle: styles.valueText },
          { content: 'DATE / NAISSANCE', textStyle: styles.labelText },
          { content: orPlaceholder(member.birthDate), textStyle: styles.valueText },
        ]}
      />
      <TableRow
        styles={styles}
        height={26.15}
        cells={[
          { content: 'NATIONALITÉ', textStyle: styles.labelText },
          { content: orPlaceholder(member.nationality), textStyle: styles.valueText },
          { content: 'N°CNI/PASS/CS', textStyle: styles.labelText },
          {
            content: formatIdentity(member.identityDocumentLabel, member.identityDocumentNumber),
            textStyle: styles.valueText,
          },
        ]}
      />
      <TableRow
        styles={styles}
        height={26.15}
        cells={[
          { content: 'TÉLÉPHONES', textStyle: styles.labelText },
          { content: formatPhones(member.phones), span: 3, textStyle: styles.valueText },
        ]}
      />
      <TableRow
        styles={styles}
        height={26.15}
        cells={[
          { content: 'SEXE', textStyle: styles.labelText },
          { content: orPlaceholder(member.gender), textStyle: styles.valueText },
          { content: 'ÂGE', textStyle: styles.labelText },
          { content: formatAge(member.age), textStyle: styles.valueText },
        ]}
      />
      <TableRow
        styles={styles}
        height={26.15}
        isLastRow={isLastRow}
        cells={[
          { content: 'QUARTIER', textStyle: styles.labelText },
          { content: orPlaceholder(member.district), textStyle: styles.valueText },
          { content: 'PROFESSION', textStyle: styles.labelText },
          { content: orPlaceholder(member.profession), textStyle: styles.valueText },
        ]}
      />
    </>
  )
}
