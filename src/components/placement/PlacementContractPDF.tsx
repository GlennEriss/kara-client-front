'use client'

import React from 'react'
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { Placement, User } from '@/types/types'

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 32,
    fontFamily: 'Times-Roman',
    fontSize: 11,
    color: '#111827',
  },
  title: {
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Times-Bold',
    marginBottom: 6,
    color: '#153E60',
  },
  subtitle: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 16,
    color: '#374151',
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Times-Bold',
    marginTop: 10,
    marginBottom: 6,
    color: '#153E60',
  },
  box: {
    borderWidth: 1,
    borderColor: '#111827',
    padding: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  label: {
    width: 140,
    fontFamily: 'Times-Bold',
    color: '#111827',
  },
  value: {
    flex: 1,
    color: '#111827',
  },
  paragraph: {
    marginTop: 8,
    lineHeight: 1.35,
    textAlign: 'justify',
  },
  small: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
})

const sanitize = (v: unknown) => (v == null || v === '' ? '—' : String(v))

const calculateAge = (birthDate?: string) => {
  if (!birthDate) return '—'
  const d = new Date(birthDate)
  if (Number.isNaN(d.getTime())) return '—'
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const monthDiff = today.getMonth() - d.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) age -= 1
  return age > 0 ? String(age) : '—'
}

const payoutLabel = (mode: Placement['payoutMode']) =>
  mode === 'MonthlyCommission_CapitalEnd' ? 'Commission mensuelle + capital à la fin' : 'Capital + commissions à la fin'

export default function PlacementContractPDF({
  placement,
  member,
}: {
  placement: Placement
  member: User | null | undefined
}) {
  const memberName = member ? `${member.lastName ?? ''} ${member.firstName ?? ''}`.trim() : placement.benefactorName || placement.benefactorId
  const memberMatricule = member?.matricule || placement.benefactorId
  const memberBirthDate = member?.birthDate ? new Date(member.birthDate).toLocaleDateString('fr-FR') : '—'
  const memberBirthPlace = sanitize(member?.birthPlace)
  const memberNationality = sanitize(member?.nationality)
  const memberGender = sanitize(member?.gender ? String(member.gender).toUpperCase() : '')
  const memberAge = calculateAge(member?.birthDate)
  const memberDoc = sanitize(member?.identityDocumentNumber)
  const memberQuarter =
    member?.address?.district || member?.address?.arrondissement || member?.address?.city || member?.address?.province || '—'
  const memberPhone = member?.contacts?.[0] || placement.benefactorPhone || '—'

  const amount = Math.round(placement.amount || 0).toLocaleString('fr-FR')
  const rate = sanitize(placement.rate)
  const period = sanitize(placement.periodMonths)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>CONTRAT CAISSE BIENFAITEUR</Text>
        <Text style={styles.subtitle}>Placement #{placement.id}</Text>

        <Text style={styles.sectionTitle}>Informations Personnelles du Bienfaiteur</Text>
        <View style={styles.box}>
          <View style={styles.row}>
            <Text style={styles.label}>MATRICULE</Text>
            <Text style={styles.value}>{sanitize(memberMatricule)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>NOM & PRENOM</Text>
            <Text style={styles.value}>{sanitize(memberName)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>DATE / NAISSANCE</Text>
            <Text style={styles.value}>{sanitize(memberBirthDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>LIEU / NAISSANCE</Text>
            <Text style={styles.value}>{memberBirthPlace}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>NATIONALITE</Text>
            <Text style={styles.value}>{memberNationality}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>N°CNI/PASS/CS</Text>
            <Text style={styles.value}>{memberDoc}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>SEXE</Text>
            <Text style={styles.value}>{memberGender}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>AGE</Text>
            <Text style={styles.value}>{sanitize(memberAge)} ANS</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>QUARTIER</Text>
            <Text style={styles.value}>{sanitize(memberQuarter)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>TELEPHONE</Text>
            <Text style={styles.value}>{sanitize(memberPhone)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Informations du Placement</Text>
        <View style={styles.box}>
          <View style={styles.row}>
            <Text style={styles.label}>MONTANT</Text>
            <Text style={styles.value}>{amount} FCFA</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>TAUX</Text>
            <Text style={styles.value}>{rate}%</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>DUREE</Text>
            <Text style={styles.value}>{period} mois</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>MODE DE SORTIE</Text>
            <Text style={styles.value}>{payoutLabel(placement.payoutMode)}</Text>
          </View>
        </View>

        <Text style={styles.paragraph}>
          Le présent contrat atteste de l’engagement du bienfaiteur au sein de la Caisse Bienfaiteur. Les informations
          ci-dessus sont préremplies à partir des données du membre et du placement, et peuvent être complétées si
          nécessaire avant signature.
        </Text>

        <Text style={styles.small}>Document généré automatiquement — {new Date().toLocaleDateString('fr-FR')}</Text>
      </Page>
    </Document>
  )
}

