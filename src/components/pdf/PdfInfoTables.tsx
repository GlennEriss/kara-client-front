'use client'

import { Image, StyleSheet, Text, View } from '@react-pdf/renderer';
import React from 'react';

export type PdfInfoRow = { label: string; value: string }

const styles = StyleSheet.create({
  // Copie du rendu de `src/components/credit-speciale/AdhesionCreditSpecialeV2.tsx`
  headerSection: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 100,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 30,
    justifyContent: 'center',
  },
  memberInfoTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  memberInfoTable: {
    marginBottom: 20,
    border: '1px solid #000',
  },
  memberInfoRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #000',
  },
  memberInfoRowLast: {
    flexDirection: 'row',
  },
  memberInfoCellLabel: {
    width: '35%',
    padding: 5,
    fontSize: 10,
    borderRight: '1px solid #000',
  },
  memberInfoCellValue: {
    width: '65%',
    padding: 5,
    fontSize: 10,
    fontWeight: 'bold',
  },
})

export function KaraLogo({ size = 100 }: { size?: number }) {
  const src = typeof window !== 'undefined' ? window.location.origin + '/Logo-Kara.jpg' : '/Logo-Kara.jpg'
  return <Image src={src} style={{ width: size, height: size }} cache={false} />
}

export function PdfHeaderWithLogo({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.headerSection}>
      <Image
        src={typeof window !== 'undefined' ? window.location.origin + '/Logo-Kara.jpg' : '/Logo-Kara.jpg'}
        style={styles.logo}
        cache={false}
      />
      <View style={styles.headerInfo}>{children}</View>
    </View>
  )
}

export function PdfInfoTable({
  title,
  rows,
}: {
  title: string
  rows: PdfInfoRow[]
}) {
  return (
    <View>
      <Text style={styles.memberInfoTitle}>{title}</Text>
      <View style={styles.memberInfoTable}>
        {rows.map((row, index) => (
          <View
            key={`${row.label}-${index}`}
            style={index === rows.length - 1 ? styles.memberInfoRowLast : styles.memberInfoRow}
          >
            <Text style={styles.memberInfoCellLabel}>{row.label} :</Text>
            <Text style={styles.memberInfoCellValue}>{row.value || '—'}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
