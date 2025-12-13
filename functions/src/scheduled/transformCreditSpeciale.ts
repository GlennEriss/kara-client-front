import * as admin from 'firebase-admin'

// Initialiser Firebase Admin si pas déjà fait
if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()

/**
 * Transforme automatiquement les crédits spéciaux non remboursés après 7 mois en crédit fixe
 * - Supprime les intérêts (recalcule totalAmount = amount)
 * - Recalcule l'échéancier sans intérêts
 * - Change le statut à TRANSFORMED
 * - Envoie une notification au client
 */
export async function transformCreditSpecialeToFixe(): Promise<void> {
  console.log('Démarrage de la transformation des crédits spéciaux en crédit fixe')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Date de référence : il y a 7 mois
  const sevenMonthsAgo = new Date(today)
  sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7)

  try {
    // Récupérer tous les crédits spéciaux actifs créés il y a plus de 7 mois
    const contractsRef = db.collection('creditContracts')
    const activeContractsSnapshot = await contractsRef
      .where('creditType', '==', 'SPECIALE')
      .where('status', '==', 'ACTIVE')
      .get()

    console.log(`Nombre de crédits spéciaux actifs à vérifier : ${activeContractsSnapshot.size}`)

    let transformedCount = 0
    let errorCount = 0

    for (const contractDoc of activeContractsSnapshot.docs) {
      try {
        const contract = contractDoc.data()
        const contractId = contractDoc.id

        // Déterminer la date de référence pour les 7 mois
        // Priorité : activatedAt > firstPaymentDate > createdAt
        let referenceDate: Date | null = null
        
        if (contract.activatedAt) {
          referenceDate = contract.activatedAt?.toDate ? contract.activatedAt.toDate() : new Date(contract.activatedAt)
        } else if (contract.firstPaymentDate) {
          referenceDate = contract.firstPaymentDate?.toDate ? contract.firstPaymentDate.toDate() : new Date(contract.firstPaymentDate)
        } else {
          referenceDate = contract.createdAt?.toDate ? contract.createdAt.toDate() : new Date(contract.createdAt)
        }

        if (!referenceDate || referenceDate > sevenMonthsAgo) {
          // Le contrat n'a pas encore 7 mois depuis la date de référence, on passe au suivant
          continue
        }

        // Vérifier que le contrat n'est pas entièrement remboursé
        const amountPaid = contract.amountPaid || 0
        const totalAmount = contract.totalAmount || 0
        
        if (amountPaid >= totalAmount) {
          // Le contrat est déjà remboursé, on passe au suivant
          continue
        }

        // Vérifier que le contrat n'a pas déjà été transformé
        if (contract.status === 'TRANSFORMED') {
          continue
        }

        // Calculer le nouveau montant total (sans intérêts)
        const originalAmount = contract.amount || 0
        const newTotalAmount = originalAmount // Montant sans intérêts
        
        // Calculer le montant restant à rembourser (capital uniquement)
        const newAmountRemaining = Math.max(0, newTotalAmount - amountPaid)

        // Recalculer la prochaine échéance (sans intérêts)
        // On garde la même mensualité si possible, sinon on ajuste
        const monthlyPaymentAmount = contract.monthlyPaymentAmount || 0
        
        // Si le montant restant est inférieur à la mensualité, ajuster
        const finalPaymentAmount = newAmountRemaining < monthlyPaymentAmount 
          ? newAmountRemaining 
          : monthlyPaymentAmount

        // Mettre à jour le contrat
        await contractDoc.ref.update({
          creditType: 'FIXE',
          status: 'TRANSFORMED',
          totalAmount: newTotalAmount,
          amountRemaining: newAmountRemaining,
          monthlyPaymentAmount: finalPaymentAmount > 0 ? finalPaymentAmount : monthlyPaymentAmount,
          transformedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })

        // Créer une notification pour le client
        try {
          const notificationsRef = db.collection('notifications')
          
          await notificationsRef.add({
            module: 'credit_speciale',
            entityId: contractId,
            type: 'reminder',
            title: 'Transformation en crédit fixe',
            message: `Votre crédit spéciale a été transformé en crédit fixe après 7 mois. Les intérêts ont été supprimés. Montant restant à rembourser : ${newAmountRemaining.toLocaleString('fr-FR')} FCFA (capital uniquement).`,
            isRead: false,
            metadata: {
              contractId,
              clientId: contract.clientId,
              creditType: 'FIXE',
              originalType: 'SPECIALE',
              originalTotalAmount: totalAmount,
              newTotalAmount: newTotalAmount,
              amountRemaining: newAmountRemaining,
              transformedAt: new Date().toISOString(),
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          })

          console.log(`Contrat ${contractId} transformé en crédit fixe. Montant restant : ${newAmountRemaining.toLocaleString('fr-FR')} FCFA`)
        } catch (notifError) {
          console.error(`Erreur lors de la création de la notification pour ${contractId}:`, notifError)
          // Ne pas faire échouer la transformation si la notification échoue
        }

        transformedCount++
      } catch (error) {
        errorCount++
        console.error(`Erreur lors de la transformation du contrat ${contractDoc.id}:`, error)
      }
    }

    console.log(`Transformation terminée : ${transformedCount} contrats transformés, ${errorCount} erreurs`)
  } catch (error) {
    console.error('Erreur lors de la transformation des crédits spéciaux:', error)
    throw error
  }
}

