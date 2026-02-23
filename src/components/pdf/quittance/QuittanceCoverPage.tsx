'use client'

import React from 'react'
import { Image, StyleSheet, Text, View } from '@react-pdf/renderer'

type Cell = { label: string; value: string }
type Row =
  | { kind: 'pair'; left: Cell; right: Cell }
  | { kind: 'single'; label: string; value: string } // spans remaining columns

const styles = StyleSheet.create({
  logo: {
    width: 130,
    height: 130,
    alignSelf: 'center',
  },
  sectionHeader: {
    backgroundColor: '#234D65',
    paddingVertical: 10,
    paddingHorizontal: 12,
    border: '1px solid #cfd8e3',
  },
  sectionHeaderText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  table: {
    borderLeft: '1px solid #cfd8e3',
    borderRight: '1px solid #cfd8e3',
    borderBottom: '1px solid #cfd8e3',
    marginBottom: 22,
  },
  row: {
    flexDirection: 'row',
  },
  cellLabel: {
    padding: 10,
    fontSize: 10,
    borderRight: '1px solid #cfd8e3',
    borderTop: '1px solid #cfd8e3',
    backgroundColor: '#f7f9fc',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  cellValue: {
    padding: 10,
    fontSize: 12,
    borderRight: '1px solid #cfd8e3',
    borderTop: '1px solid #cfd8e3',
    textAlign: 'center',
  },
  // 4-column proportions close to the screenshot
  wLabelL: { width: '28%' },
  wValueL: { width: '32%' },
  wLabelR: { width: '16%' },
  wValueR: { width: '24%', borderRight: '0px solid transparent' },
  wSingleLabel: { width: '28%' },
  wSingleValue: { width: '72%', borderRight: '0px solid transparent' },
})

function KaraLogo() {
  const src =
    typeof window !== 'undefined'
      ? window.location.origin + '/Logo-Kara.jpg'
      : '/Logo-Kara.jpg'
  return <Image src={src} style={styles.logo} cache={false} />
}

function QuittanceSection({ title, rows }: { title: string; rows: Row[] }) {
  return (
    // `wrap={false}` avoids react-pdf splitting the cover tables into an extra blank page.
    <View wrap={false}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{title}</Text>
      </View>
      <View style={styles.table}>
        {rows.map((r, idx) => {
          if (r.kind === 'pair') {
            return (
              <View key={idx} style={styles.row}>
                <Text style={[styles.cellLabel, styles.wLabelL]}>{r.left.label} :</Text>
                <Text style={[styles.cellValue, styles.wValueL]}>{r.left.value}</Text>
                <Text style={[styles.cellLabel, styles.wLabelR]}>{r.right.label} :</Text>
                <Text style={[styles.cellValue, styles.wValueR]}>{r.right.value}</Text>
              </View>
            )
          }
          return (
            <View key={idx} style={styles.row}>
              <Text style={[styles.cellLabel, styles.wSingleLabel]}>{r.label} :</Text>
              <Text style={[styles.cellValue, styles.wSingleValue]}>{r.value || '—'}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

export function QuittanceCoverPage({
  memberSectionTitle,
  memberRows,
  secondarySectionTitle,
  secondaryRows,
}: {
  memberSectionTitle: string
  memberRows: Row[]
  secondarySectionTitle?: string
  secondaryRows?: Row[]
}) {
  return (
    <View wrap={false}>
      <KaraLogo />
      <QuittanceSection title={memberSectionTitle} rows={memberRows} />
      {secondarySectionTitle && secondaryRows && secondaryRows.length > 0 ? (
        <QuittanceSection title={secondarySectionTitle} rows={secondaryRows} />
      ) : null}
    </View>
  )
}

export type { Row as QuittanceCoverRow }
