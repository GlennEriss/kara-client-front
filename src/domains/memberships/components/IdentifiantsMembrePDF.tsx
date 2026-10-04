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
  /** Destinataire du document (membre par défaut, ou administrateur). */
  recipient?: 'membre' | 'administrateur'
  /** Adresse de la page de connexion, affichée sur le document. */
  loginUrl?: string
}

/**
 * Document PDF des identifiants de connexion (matricule, email, mot de passe
 * temporaire), remis à un membre ou à un administrateur après création du
 * compte ou réinitialisation du mot de passe.
 */
export function IdentifiantsMembrePDF({ data, recipient = 'membre', loginUrl }: IdentifiantsMembrePDFProps) {
  const destinataire = recipient === 'administrateur' ? "à l'administrateur" : 'au membre'
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Identifiants de connexion</Text>
        <Text style={styles.subtitle}>
          Association LE KARA – Document à remettre {destinataire}
        </Text>

        {loginUrl && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Adresse de connexion</Text>
            <Text style={styles.value}>{loginUrl}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Matricule</Text>
          <Text style={styles.value}>{data.matricule}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email</Text>
          <Text style={styles.value}>{data.email || '-'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mot de passe temporaire</Text>
          <Text style={styles.value}>{data.motDePasse}</Text>
        </View>

        <Text style={styles.subtitle}>
          À la première connexion, il faudra choisir un nouveau mot de passe personnel.
        </Text>

        <Text style={styles.footer}>
          Ce document contient des informations confidentielles. À remettre {destinataire} en main propre ou par un canal sécurisé.
        </Text>
      </Page>
    </Document>
  )
}
