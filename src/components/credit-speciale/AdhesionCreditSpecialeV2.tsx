'use client'

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { getNationalityName } from '@/constantes/nationality'
import { CreditContract } from '@/types/types'
import { calculateSchedule } from '@/utils/credit-speciale-calculations'
import { MEMBERSHIP_TYPE_LABELS } from '@/types/types'

// Styles conformes au document ADHESION_CREDIT_SPECIALE.docx
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 11,
    padding: 50,
    paddingTop: 40,
    paddingBottom: 40,
    lineHeight: 1.6,
  },
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
  headerLine: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  headerLabel: {
    fontSize: 11,
    width: 160,
  },
  headerValue: {
    fontSize: 11,
    flex: 1,
    fontWeight: 'bold',
  },
  // Section Informations Personnelles du Membre (V2 - conforme au doc)
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
  mainTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 5,
  },
  titleUnderline: {
    borderBottom: '2px solid black',
    marginBottom: 20,
    width: '70%',
    alignSelf: 'center',
  },
  paragraph: {
    marginBottom: 10,
    textAlign: 'justify',
    fontSize: 11,
    lineHeight: 1.8,
  },
  bold: {
    fontWeight: 'bold',
  },
  amountLine: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 11,
    textAlign: 'center',
  },
  signatureSection: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '45%',
  },
  signatureLabel: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  signatureSubLabel: {
    fontSize: 10,
    marginTop: 5,
  },
  protocolTitle: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 15,
  },
  articleTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
    textDecoration: 'underline',
  },
  bulletPoint: {
    marginLeft: 30,
    marginBottom: 3,
    fontSize: 11,
  },
  checkbox: {
    marginLeft: 30,
    marginBottom: 5,
    fontSize: 11,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 30,
    marginBottom: 5,
    gap: 8,
  },
  checkboxBox: {
    width: 12,
    height: 12,
    border: '1.5px solid #000',
    borderRadius: 1,
  },
  scheduleTable: {
    marginTop: 10,
    marginBottom: 10,
    border: '1px solid #000',
  },
  scheduleHeader: {
    flexDirection: 'row',
    borderBottom: '1px solid #000',
  },
  scheduleRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #000',
  },
  scheduleRowLast: {
    flexDirection: 'row',
  },
  scheduleCell: {
    flex: 1,
    padding: 4,
    fontSize: 10,
    textAlign: 'center',
    borderRight: '1px solid #000',
  },
  scheduleCellLast: {
    flex: 1,
    padding: 4,
    fontSize: 10,
    textAlign: 'center',
  },
  cautionHeaderTable: {
    marginTop: 10,
    marginBottom: 15,
    border: '1px solid #000',
  },
  cautionRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #000',
  },
  cautionRowLast: {
    flexDirection: 'row',
  },
  cautionCell: {
    padding: 5,
    fontSize: 10,
    borderRight: '1px solid #000',
  },
  cautionCellLast: {
    padding: 5,
    fontSize: 10,
  },
})

// Fonction pour convertir un nombre en lettres
const numberToWords = (num: number): string => {
  if (num === 0) return 'zéro'

  const ones = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt']

  const convertHundreds = (n: number): string => {
    let result = ''
    if (n >= 100) {
      const hundredDigit = Math.floor(n / 100)
      result += hundredDigit === 1 ? 'cent' : ones[hundredDigit] + ' cent'
      if (n % 100 !== 0) result += ' '
      n %= 100
    }
    if (n >= 20) {
      const tenDigit = Math.floor(n / 10)
      if (tenDigit === 7) {
        result += 'soixante'
        n += 10
      } else if (tenDigit === 9) {
        result += 'quatre-vingt'
        n += 10
      } else {
        result += tens[tenDigit]
      }
      if (n % 10 !== 0) {
        result += tenDigit === 8 && n % 10 === 1 ? '-un' : '-' + ones[n % 10]
      } else if (tenDigit === 8) {
        result += 's'
      }
    } else if (n > 0) {
      result += ones[n]
    }
    return result
  }

  if (num < 1000) return convertHundreds(num)
  if (num < 1000000) {
    const thousands = Math.floor(num / 1000)
    const remainder = num % 1000
    let result = thousands === 1 ? 'mille' : convertHundreds(thousands) + ' mille'
    if (remainder > 0) result += ' ' + convertHundreds(remainder)
    return result
  }
  const millions = Math.floor(num / 1000000)
  const remainder = num % 1000000
  let result = millions === 1 ? 'un million' : convertHundreds(millions) + ' millions'
  if (remainder > 0) {
    if (remainder < 1000) {
      result += ' ' + convertHundreds(remainder)
    } else {
      const thousands = Math.floor(remainder / 1000)
      const lastPart = remainder % 1000
      if (thousands > 0) result += thousands === 1 ? ' mille' : ' ' + convertHundreds(thousands) + ' mille'
      if (lastPart > 0) result += ' ' + convertHundreds(lastPart)
    }
  }
  return result
}

interface AdhesionCreditSpecialeV2Props {
  contract: CreditContract
  memberData?: any
  guarantorData?: any
}

const AdhesionCreditSpecialeV2 = ({ contract, memberData, guarantorData }: AdhesionCreditSpecialeV2Props) => {
  const formatDate = (date: any) => {
    if (!date) return '—'
    try {
      const dateObj = date?.toDate ? date.toDate() : new Date(date)
      return dateObj.toLocaleDateString('fr-FR')
    } catch {
      return '—'
    }
  }

  const formatAmount = (amount: number) => {
    if (!amount) return '0'
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  }

  const schedule = calculateSchedule({
    amount: contract.amount,
    interestRate: contract.interestRate,
    monthlyPayment: contract.monthlyPaymentAmount,
    firstPaymentDate: new Date(contract.firstPaymentDate),
    maxDuration: contract.duration,
  })

  const endDate = new Date(contract.firstPaymentDate)
  endDate.setMonth(endDate.getMonth() + contract.duration - 1)

  const formatAddress = (address: any): string => {
    if (!address) return '—'
    if (typeof address === 'string') return address
    if (typeof address === 'object') {
      const parts = []
      if (address.district) parts.push(address.district)
      if (address.city) parts.push(address.city)
      if (address.arrondissement) parts.push(address.arrondissement)
      if (address.province) parts.push(address.province)
      if (address.additionalInfo) parts.push(address.additionalInfo)
      return parts.length > 0 ? parts.join(', ') : '—'
    }
    return '—'
  }

  const getGenderLabel = (gender?: string) => {
    if (!gender) return '—'
    const g = String(gender).toLowerCase()
    if (g === 'm' || g === 'male' || g === 'homme') return 'Masculin'
    if (g === 'f' || g === 'female' || g === 'femme') return 'Féminin'
    return gender
  }

  const getIdentityDocumentLabel = (doc?: string) => {
    if (!doc) return '—'
    const d = String(doc).toUpperCase()
    if (d.includes('CNI')) return 'CNI'
    if (d.includes('PASS') || d.includes('PASSEPORT')) return 'Passeport'
    if (d.includes('CS')) return 'Carte de séjour'
    return doc
  }

  // Données du membre (conformes au doc ADHESION_CREDIT_SPECIALE)
  const member = {
    matricule: memberData?.matricule || memberData?.id || contract.clientId || '—',
    membershipType: memberData?.membershipType
      ? MEMBERSHIP_TYPE_LABELS[memberData.membershipType as keyof typeof MEMBERSHIP_TYPE_LABELS] || memberData.membershipType
      : '—',
    lastName: memberData?.lastName || contract.clientLastName || '—',
    firstName: memberData?.firstName || contract.clientFirstName || '—',
    birthPlace: memberData?.birthPlace || '—',
    birthDate: memberData?.birthDate ? formatDate(memberData.birthDate) : '—',
    identityDocument: getIdentityDocumentLabel(memberData?.identityDocument),
    identityDocumentNumber: memberData?.identityDocumentNumber || '—',
    phone1: memberData?.contacts?.[0] || contract.clientContacts?.[0] || '—',
    phone2: memberData?.contacts?.[1] || contract.clientContacts?.[1] || '—',
    gender: getGenderLabel(memberData?.gender),
    quarter: formatAddress(memberData?.address) || (memberData?.address?.arrondissement || memberData?.address?.district) || '—',
    nationality: getNationalityName(memberData?.nationality || '') || '—',
    association: 'LE KARA',
  }

  const guarantor = {
    lastName: guarantorData?.lastName || contract.guarantorLastName || '—',
    firstName: guarantorData?.firstName || contract.guarantorFirstName || '—',
    contacts: guarantorData?.contacts || [],
    address: formatAddress(guarantorData?.address),
  }

  const memberInfoRows = [
    { label: 'MATRICULE', value: member.matricule },
    { label: 'MEMBRE', value: member.membershipType },
    { label: 'NOM', value: member.lastName.toUpperCase() },
    { label: 'PRÉNOM', value: member.firstName },
    { label: 'LIEU / NAISSANCE', value: member.birthPlace },
    { label: 'DATE / NAISSANCE', value: member.birthDate },
    { label: 'TYPE DE PIÈCE', value: member.identityDocument },
    { label: 'N° DE PIÈCE', value: member.identityDocumentNumber },
    { label: 'TÉLÉPHONE 1', value: member.phone1 },
    { label: 'TÉLÉPHONE 2', value: member.phone2 },
    { label: 'SEXE', value: member.gender },
    { label: 'QUARTIER', value: member.quarter },
    { label: 'NATIONALITÉ', value: member.nationality },
    { label: 'ASSOCIATION', value: member.association },
  ]

  return (
    <Document>
      {/* PAGE 1 - Informations Personnelles + Reconnaissance de dette */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerSection}>
          <Image
            src={typeof window !== 'undefined' ? window.location.origin + '/Logo-Kara.jpg' : '/Logo-Kara.jpg'}
            style={styles.logo}
            cache={false}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.memberInfoTitle}>Informations Personnelles du Membre</Text>
            <View style={styles.memberInfoTable}>
              {memberInfoRows.map((row, index) => (
                <View
                  key={row.label}
                  style={index === memberInfoRows.length - 1 ? styles.memberInfoRowLast : styles.memberInfoRow}
                >
                  <Text style={styles.memberInfoCellLabel}>{row.label} :</Text>
                  <Text style={styles.memberInfoCellValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <Text style={styles.mainTitle}>RECONNAISSANCE DE DETTE</Text>
        <View style={styles.titleUnderline} />

        <Text style={styles.paragraph}>
          Je soussigné M/Mme/Mlle <Text style={styles.bold}>{member.lastName.toUpperCase()} {member.firstName}</Text> de nationalité <Text style={styles.bold}>{member.nationality}</Text> membre de l'Association <Text style={styles.bold}>LE KARA</Text> par la présente, je reconnais avoir reçu de la mutuelle un accompagnement financier, conformément aux dispositions du règlement intérieur, d'un montant de
        </Text>

        <Text style={styles.amountLine}>
          <Text style={styles.bold}>{formatAmount(contract.amount)} FCFA</Text> (chiffres),
        </Text>
        <Text style={styles.amountLine}>
          <Text style={styles.bold}>{numberToWords(contract.amount)} francs CFA</Text> (lettres),
        </Text>
        <Text style={styles.paragraph}>
          en date du <Text style={styles.bold}>{formatDate(contract.firstPaymentDate)}</Text>.
        </Text>

        <Text style={styles.paragraph}>
          Cette somme doit être restituée à la trésorerie de l'Association selon un échéancier de <Text style={styles.bold}>{contract.duration}</Text> mois à compter du <Text style={styles.bold}>{formatDate(contract.firstPaymentDate)}</Text>. Jusqu'au <Text style={styles.bold}>{formatDate(endDate)}</Text> date de fin de créance.
        </Text>

        <Text style={[styles.paragraph, { marginTop: 20 }]}>
          En foi de quoi, la présente reconnaissance de dette est signée par les deux parties pour servir et valoir ce que de droit.
        </Text>

        <Text style={[styles.paragraph, { marginTop: 15, textAlign: 'center' }]}>
          Fait à <Text style={styles.bold}>Libreville</Text> Le <Text style={styles.bold}>{formatDate(new Date())}</Text>
        </Text>

        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>SECRÉTAIRE EXÉCUTIF</Text>
          </View>
          <View style={[styles.signatureBox, { alignItems: 'flex-end' }]}>
            <Text style={styles.signatureLabel}>MEMBRE BÉNÉFICIAIRE</Text>
            <Text style={styles.signatureSubLabel}>(Précédée de la mention lue et approuvé)</Text>
          </View>
        </View>
      </Page>

      {/* PAGE 2 - Protocole d'accompagnement */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.protocolTitle}>PROTOCOLE D'ACCOMPAGNEMENT</Text>

        <Text style={styles.articleTitle}>ARTICLE 1 : MONTANT ET DURÉE DE LA CRÉANCE</Text>
        <Text style={styles.paragraph}>
          L'Association accorde et consent au membre bénéficiaire un accompagnement
        </Text>
        <View style={styles.checkboxRow}>
          <Text style={{ fontSize: 11 }}>Exceptionnel</Text>
          <View style={styles.checkboxBox} />
        </View>
        <View style={styles.checkboxRow}>
          <Text style={{ fontSize: 11 }}>Régulier</Text>
          <View style={styles.checkboxBox} />
        </View>
        <Text style={styles.paragraph}>À hauteur de</Text>
        <Text style={styles.amountLine}>
          <Text style={styles.bold}>{formatAmount(contract.amount)} FCFA</Text> (chiffres)
        </Text>
        <Text style={styles.amountLine}>
          <Text style={styles.bold}>{numberToWords(contract.amount)} francs CFA</Text> (lettres),
        </Text>
        <Text style={styles.paragraph}>
          En date du <Text style={styles.bold}>{formatDate(contract.firstPaymentDate)}</Text>. Pour une nécessité sociale.
        </Text>
        <Text style={styles.paragraph}>
          La mise à disposition effective des fonds auprès du membre bénéficiaire pourra prendre quelques jours supplémentaires sans que ce délai n'affecte la date de début du prêt.
        </Text>

        <Text style={styles.articleTitle}>ARTICLE 2 : REMBOURSEMENT DE SOMME</Text>
        <Text style={styles.paragraph}>
          Le membre s'engage sur l'honneur à rembourser ledit accompagnement en plusieurs échéances mensuelles sous un délai maximum de <Text style={styles.bold}>{contract.duration}</Text> mois.
        </Text>
        <Text style={styles.paragraph}>
          Le tableau ci-dessous représente l'échéancier convenu entre les parties.
        </Text>

        <View style={styles.scheduleTable}>
          <View style={styles.scheduleHeader}>
            <Text style={styles.scheduleCell}>Échéances</Text>
            <Text style={styles.scheduleCell}>Date</Text>
            <Text style={styles.scheduleCellLast}>Montant FCFA</Text>
          </View>
          {schedule.map((item, index) => (
            <View key={item.month} style={index === schedule.length - 1 ? styles.scheduleRowLast : styles.scheduleRow}>
              <Text style={styles.scheduleCell}>M{item.month}</Text>
              <Text style={styles.scheduleCell}>{formatDate(item.date)}</Text>
              <Text style={styles.scheduleCellLast}>{formatAmount(item.payment)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.paragraph}>
          Tout remboursement mensuel portant sur des sommes en dessous de celles prévues dans ledit échéancier est non valable et irrecevable.
        </Text>

        <Text style={styles.articleTitle}>ARTICLE 3 : EXIGIBILITÉ DE LA CRÉANCE</Text>
        <Text style={styles.paragraph}>
          L'arrivée de chaque échéance mensuelle vaut d'office mise en demeure du débiteur et marque le décompte des intérêts légaux.
        </Text>
        <Text style={styles.paragraph}>
          Le non-respect des échéanciers expose le membre bénéficiaire à des poursuites judiciaires sous huitaine.
        </Text>

        <Text style={styles.articleTitle}>ARTICLE 4 : DÉCLARATIONS ET ENGAGEMENTS DU PRÊTEUR</Text>
        <Text style={styles.paragraph}>Le membre bénéficiaire déclare et reconnaît :</Text>
        <Text style={styles.bulletPoint}>• Il est majeur et a la capacité juridique pour conclure le contrat ;</Text>
        <Text style={styles.bulletPoint}>• Il a compris les termes du contrat et la portée de ses engagements ;</Text>
      </Page>

      {/* PAGE 3 - Suite Article 4 + Article 5 */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.bulletPoint}>• Il prend l'engagement de moduler ses capacités financières personnelles afin d'honorer à son remboursement ;</Text>
        <Text style={styles.bulletPoint}>• Il a pris connaissance du règlement intérieur de KARA et du protocole d'accompagnement ;</Text>

        <Text style={[styles.paragraph, { marginTop: 10 }]}>Le membre bénéficiaire affecte :</Text>
        <Text style={styles.paragraph}>
          Pour des raisons de prévoyance, M/Mme/Mlle <Text style={styles.bold}>{guarantor.lastName.toUpperCase()} {guarantor.firstName}</Text>
        </Text>
        <Text style={styles.paragraph}>
          Qui se porte caution solidaire en cas de non-exécution de ma part.
        </Text>
        <Text style={styles.paragraph}>
          Que la présence de cette caution n'empêche pas l'engagement préalable de poursuites judiciaires à l'encontre du débiteur pour le recouvrement de ladite créance.
        </Text>

        <Text style={styles.articleTitle}>ARTICLE 5 : SANCTIONS</Text>
        <Text style={styles.paragraph}>
          Afin de garantir toute insolvabilité et non remboursement d'un accompagnement souscrit par le membre, l'Association LE KARA se réserve la faculté de se désintéresser par prélèvement dans le nominal correspondant aux versements mensuels du membre à hauteur des sommes dues. Si le nominal s'avère insuffisant, KARA procède au prélèvement du surplus manquant dans le nominal de sa caution.
        </Text>
        <Text style={styles.paragraph}>
          Le non-respect des délais de remboursement m'expose aux sanctions disciplinaires et pénales conformément aux dispositions du Règlement intérieur de KARA.
        </Text>
        <Text style={styles.paragraph}>
          Ce protocole d'accompagnement est établi pour servir et valoir ce que de droit.
        </Text>

        <Text style={[styles.paragraph, { marginTop: 15, textAlign: 'center' }]}>
          Fait à <Text style={styles.bold}>Libreville</Text> Le <Text style={styles.bold}>{formatDate(new Date())}</Text>
        </Text>

        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Signature Secrétaire Exécutif</Text>
          </View>
          <View style={[styles.signatureBox, { alignItems: 'flex-end' }]}>
            <Text style={styles.signatureLabel}>Signature Membre</Text>
            <Text style={styles.signatureSubLabel}>(précédée de la mention membre lu et approuvé)</Text>
          </View>
        </View>

        <View style={{ marginTop: 40 }}>
          <Text style={styles.signatureLabel}>Signature de la caution</Text>
          <Text style={styles.signatureSubLabel}>(précédée de la mention membre lu et approuvé)</Text>
        </View>
      </Page>

      {/* PAGE 4 - Acte de cautionnement solidaire */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.mainTitle}>ACTE DE CAUTIONNEMENT SOLIDAIRE</Text>
        <View style={styles.titleUnderline} />

        <Text style={styles.paragraph}>
          En date du <Text style={styles.bold}>{formatDate(new Date())}</Text>. Le présent acte a été conclu entre les parties suivantes nommément désignées :
        </Text>

        <View style={styles.cautionHeaderTable}>
          <View style={styles.cautionRow}>
            <Text style={[styles.cautionCell, { width: '18%' }]}>L'Association</Text>
            <Text style={[styles.cautionCell, { width: '7%' }]}>LE</Text>
            <Text style={[styles.cautionCell, { width: '12%' }]}>KARA</Text>
            <Text style={[styles.cautionCell, { width: '7%' }]}>et</Text>
            <Text style={[styles.cautionCellLast, { width: '56%' }]}>
              M/Mme/Mlle {guarantor.lastName.toUpperCase()} {guarantor.firstName}
            </Text>
          </View>
          <View style={styles.cautionRow}>
            <Text style={[styles.cautionCell, { width: '18%' }]}>domicilié à</Text>
            <Text style={[styles.cautionCellLast, { width: '82%' }]}>{guarantor.address}</Text>
          </View>
          <View style={styles.cautionRowLast}>
            <Text style={[styles.cautionCell, { width: '18%' }]}>Et Tel :</Text>
            <Text style={[styles.cautionCellLast, { width: '82%' }]}>{guarantor.contacts?.[0] || '—'}</Text>
          </View>
        </View>

        <Text style={styles.paragraph}>Il a été convenu entre les parties ce qui suit :</Text>

        <Text style={styles.paragraph}>
          En date du <Text style={styles.bold}>{formatDate(contract.firstPaymentDate)}</Text>,
          l'Association LE KARA a mis à la disposition de M/Mme/Mlle <Text style={styles.bold}>{member.lastName.toUpperCase()} {member.firstName}</Text>
        </Text>
        <Text style={styles.paragraph}>Une somme de</Text>
        <Text style={styles.amountLine}>
          <Text style={styles.bold}>{formatAmount(contract.amount)} FCFA</Text> (Chiffres),
        </Text>
        <Text style={styles.amountLine}>
          <Text style={styles.bold}>{numberToWords(contract.amount)} francs CFA</Text> (Lettres)
        </Text>
        <Text style={styles.paragraph}>
          dans le cadre d'un accompagnement, à charge pour le membre de la lui restituer en date du <Text style={styles.bold}>{formatDate(endDate)}</Text>.
        </Text>

        <Text style={styles.paragraph}>Que pour garantir le remboursement de ladite somme,</Text>
        <Text style={styles.paragraph}>
          Monsieur/Madame <Text style={styles.bold}>{guarantor.lastName.toUpperCase()} {guarantor.firstName}</Text>
        </Text>
        <Text style={styles.paragraph}>
          Affirme s'être librement et volontairement porté caution solidaire de cette dette à charge pour elle de rembourser à l'Association les sommes indiquées si Monsieur/Madame <Text style={styles.bold}>{member.lastName.toUpperCase()} {member.firstName}</Text>
        </Text>
        <Text style={styles.paragraph}>N'y satisfait pas elle-même.</Text>

        <Text style={styles.paragraph}>
          La caution s'engage à garantir le prêt pour une hauteur maximale de <Text style={styles.bold}>{formatAmount(contract.amount)} FCFA</Text> (Chiffres), <Text style={styles.bold}>{numberToWords(contract.amount)} francs CFA</Text> (Lettres), somme couvrant l'intégralité de la créance.
        </Text>

        <Text style={styles.paragraph}>Le cautionnement vaut tant que la dette principale n'a pas été remboursée.</Text>
      </Page>

      {/* PAGE 5 - Suite acte de cautionnement + signatures */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.paragraph}>
          La caution affecte principalement en garantie de la dette du débiteur, son nominal correspondant à ses versements mensuels en tant que membre de l'Association. Elle autorise l'Association à y prélever les sommes dues par le débiteur en cas de défaillance de celui-ci.
        </Text>

        <Text style={styles.paragraph}>
          Le montant de la caution, à concurrence de la créance garantie, demeurera consigné par l'association jusqu'à l'extinction totale de la dette du débiteur principal.
        </Text>

        <Text style={styles.paragraph}>
          La caution s'engage sur simple demande adressée par lettre recommandée à exécuter son engagement, sans qu'elle use du bénéfice de discussion.
        </Text>

        <Text style={styles.paragraph}>
          L'arrivée de chaque échéance mensuelle vaut d'office mise en demeure du débiteur.
        </Text>

        <Text style={styles.paragraph}>
          Pour tout litige pouvant naître de l'exécution dudit contrat, les parties donnent compétence territoriale au Tribunal de Libreville.
        </Text>

        <Text style={styles.paragraph}>
          Au vue des dispositions réglementaires qui régissent l'Association, les parties attestent avoir pris connaissance de l'étendue de leurs obligations respectives et s'engagent en parfaite connaissance de cause.
        </Text>

        <Text style={styles.paragraph}>Ce document a été dressé pour faire valoir ce que de droit.</Text>

        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Signature Secrétaire Exécutif</Text>
          </View>
          <View style={[styles.signatureBox, { alignItems: 'flex-end' }]}>
            <Text style={styles.signatureLabel}>Signature Membre</Text>
            <Text style={styles.signatureSubLabel}>(précédée de la mention membre lu et approuvé)</Text>
          </View>
        </View>

        <View style={{ marginTop: 40 }}>
          <Text style={styles.signatureLabel}>Signature de la caution</Text>
          <Text style={styles.signatureSubLabel}>(précédée de la mention membre lu et approuvé)</Text>
        </View>
      </Page>
    </Document>
  )
}

export default AdhesionCreditSpecialeV2
