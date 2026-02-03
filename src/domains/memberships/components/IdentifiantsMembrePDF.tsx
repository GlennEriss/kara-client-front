'use client'

import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { IdentifiantsPdfData } from '@/domains/memberships/services/GenererIdentifiantService'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 12,
    padding: 40,
    lineHeight: 1.5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#234D65',
  },
  subtitle: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
  },
  section: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#234D65',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 9,
    color: '#888',
    textAlign: 'center',
  },
})

interface IdentifiantsMembrePDFProps {
  data: IdentifiantsPdfData
}

/**
 * Document PDF des identifiants de connexion du membre (matricule, identifiant, mot de passe).
 * Utilisé après réinitialisation du mot de passe à la valeur du matricule.
 */
export function IdentifiantsMembrePDF({ data }: IdentifiantsMembrePDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Identifiants de connexion</Text>
        <Text style={styles.subtitle}>
          Mutuelle KARA – Document à remettre au membre
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Matricule</Text>
          <Text style={styles.value}>{data.matricule}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identifiant (login)</Text>
          <Text style={styles.value}>{data.identifiant}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mot de passe</Text>
          <Text style={styles.value}>{data.motDePasse}</Text>
        </View>

        <Text style={styles.footer}>
          Ce document contient des informations confidentielles. À remettre au membre en main propre ou par un canal sécurisé.
        </Text>
      </Page>
    </Document>
  )
}
