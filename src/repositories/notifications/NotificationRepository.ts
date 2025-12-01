import { INotificationRepository } from './INotificationRepository'
import {
  Notification,
  NotificationFilters,
  NotificationModule,
  PaginatedNotifications,
} from '@/types/types'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'

const getFirestore = () => import('@/firebase/firestore')

type FirestoreNotification = Omit<
  Notification,
  'id' | 'createdAt' | 'scheduledAt' | 'sentAt'
> & {
  createdAt: any
  scheduledAt?: any
  sentAt?: any
}

export class NotificationRepository implements INotificationRepository {
  readonly name = 'NotificationRepository'

  /**
   * Convertit un document Firestore en entité Notification
   */
  private mapDocToEntity(id: string, data: FirestoreNotification): Notification {
    return {
      id,
      ...data,
      createdAt:
        data.createdAt?.toDate?.() ||
        (data.createdAt instanceof Date ? data.createdAt : new Date()),
      scheduledAt: data.scheduledAt?.toDate?.() || data.scheduledAt,
      sentAt: data.sentAt?.toDate?.() || data.sentAt,
    }
  }

  /**
   * Convertit une entité Notification en document Firestore
   */
  private mapEntityToDoc(notification: Omit<Notification, 'id'>): any {
    const { Timestamp } = require('firebase/firestore')
    return {
      ...notification,
      createdAt: notification.createdAt
        ? Timestamp.fromDate(
            notification.createdAt instanceof Date
              ? notification.createdAt
              : new Date(notification.createdAt)
          )
        : Timestamp.now(),
      scheduledAt: notification.scheduledAt
        ? Timestamp.fromDate(
            notification.scheduledAt instanceof Date
              ? notification.scheduledAt
              : new Date(notification.scheduledAt)
          )
        : null,
      sentAt: notification.sentAt
        ? Timestamp.fromDate(
            notification.sentAt instanceof Date
              ? notification.sentAt
              : new Date(notification.sentAt)
          )
        : null,
    }
  }

  /**
   * Crée une nouvelle notification
   */
  async create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    try {
      const { collection, addDoc, db, Timestamp } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.notifications)

      const now = new Date()
      const docData = {
        ...notification,
        createdAt: Timestamp.fromDate(now),
        scheduledAt: notification.scheduledAt
          ? Timestamp.fromDate(
              notification.scheduledAt instanceof Date
                ? notification.scheduledAt
                : new Date(notification.scheduledAt)
            )
          : null,
        sentAt: notification.sentAt
          ? Timestamp.fromDate(
              notification.sentAt instanceof Date
                ? notification.sentAt
                : new Date(notification.sentAt)
            )
          : null,
      }

      const docRef = await addDoc(collectionRef, docData)
      return {
        ...notification,
        id: docRef.id,
        createdAt: now,
      }
    } catch (error) {
      console.error('Erreur lors de la création de la notification:', error)
      throw error
    }
  }

  /**
   * Récupère une notification par son ID
   */
  async getById(id: string): Promise<Notification | null> {
    try {
      const { doc, getDoc, db } = await getFirestore()
      const docRef = doc(db, firebaseCollectionNames.notifications, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return null
      }

      return this.mapDocToEntity(docSnap.id, docSnap.data() as FirestoreNotification)
    } catch (error) {
      console.error('Erreur lors de la récupération de la notification:', error)
      return null
    }
  }

  /**
   * Met à jour une notification
   */
  async update(id: string, updates: Partial<Notification>): Promise<Notification | null> {
    try {
      const { doc, updateDoc, db, Timestamp } = await getFirestore()
      const docRef = doc(db, firebaseCollectionNames.notifications, id)

      const updateData: any = { ...updates }
      if (updates.scheduledAt) {
        updateData.scheduledAt = Timestamp.fromDate(
          updates.scheduledAt instanceof Date
            ? updates.scheduledAt
            : new Date(updates.scheduledAt)
        )
      }
      if (updates.sentAt) {
        updateData.sentAt = Timestamp.fromDate(
          updates.sentAt instanceof Date ? updates.sentAt : new Date(updates.sentAt)
        )
      }

      await updateDoc(docRef, updateData)

      return this.getById(id)
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la notification:', error)
      return null
    }
  }

  /**
   * Supprime une notification
   */
  async delete(id: string): Promise<void> {
    try {
      const { doc, deleteDoc, db } = await getFirestore()
      const docRef = doc(db, firebaseCollectionNames.notifications, id)
      await deleteDoc(docRef)
    } catch (error) {
      console.error('Erreur lors de la suppression de la notification:', error)
      throw error
    }
  }

  /**
   * Récupère le nombre de notifications non lues
   */
  async getUnreadCount(): Promise<number> {
    try {
      const { collection, query, where, getDocs, db, getCountFromServer } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.notifications)
      const q = query(collectionRef, where('isRead', '==', false))

      const snapshot = await getCountFromServer(q)
      return snapshot.data().count
    } catch (error) {
      console.error('Erreur lors de la récupération du nombre de notifications non lues:', error)
      return 0
    }
  }

  /**
   * Récupère les notifications non lues (limitées)
   */
  async getUnreadNotifications(limit: number = 50): Promise<Notification[]> {
    try {
      const { collection, query, where, orderBy, limitToLast, getDocs, db } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.notifications)
      const q = query(
        collectionRef,
        where('isRead', '==', false),
        orderBy('createdAt', 'desc'),
        limitToLast(limit)
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map((doc) =>
        this.mapDocToEntity(doc.id, doc.data() as FirestoreNotification)
      )
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications non lues:', error)
      return []
    }
  }

  /**
   * Récupère les notifications d'un module spécifique
   */
  async getNotificationsByModule(
    module: NotificationModule,
    filters?: NotificationFilters
  ): Promise<Notification[]> {
    try {
      const { collection, query, where, orderBy, getDocs, db } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.notifications)
      const constraints: any[] = [where('module', '==', module)]

      if (filters?.type) {
        constraints.push(where('type', '==', filters.type))
      }

      if (filters?.isRead !== undefined) {
        constraints.push(where('isRead', '==', filters.isRead))
      }

      if (filters?.dateFrom) {
        const { Timestamp } = await getFirestore()
        constraints.push(where('createdAt', '>=', Timestamp.fromDate(filters.dateFrom)))
      }

      if (filters?.dateTo) {
        const { Timestamp } = await getFirestore()
        constraints.push(where('createdAt', '<=', Timestamp.fromDate(filters.dateTo)))
      }

      constraints.push(orderBy('createdAt', 'desc'))

      const q = query(collectionRef, ...constraints)
      const snapshot = await getDocs(q)

      return snapshot.docs.map((doc) =>
        this.mapDocToEntity(doc.id, doc.data() as FirestoreNotification)
      )
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications par module:', error)
      return []
    }
  }

  /**
   * Récupère les notifications paginées
   */
  async getPaginatedNotifications(
    filters?: NotificationFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedNotifications> {
    try {
      const { collection, query, where, orderBy, getDocs, db, startAfter, limitToLast } =
        await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.notifications)
      const constraints: any[] = []

      if (filters?.module) {
        constraints.push(where('module', '==', filters.module))
      }

      if (filters?.type) {
        constraints.push(where('type', '==', filters.type))
      }

      if (filters?.isRead !== undefined) {
        constraints.push(where('isRead', '==', filters.isRead))
      }

      if (filters?.dateFrom) {
        const { Timestamp } = await getFirestore()
        constraints.push(where('createdAt', '>=', Timestamp.fromDate(filters.dateFrom)))
      }

      if (filters?.dateTo) {
        const { Timestamp } = await getFirestore()
        constraints.push(where('createdAt', '<=', Timestamp.fromDate(filters.dateTo)))
      }

      constraints.push(orderBy('createdAt', 'desc'))

      const q = query(collectionRef, ...constraints)
      const snapshot = await getDocs(q)

      const allNotifications = snapshot.docs.map((doc) =>
        this.mapDocToEntity(doc.id, doc.data() as FirestoreNotification)
      )

      const totalItems = allNotifications.length
      const totalPages = Math.ceil(totalItems / limit)
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedData = allNotifications.slice(startIndex, endIndex)

      return {
        data: paginatedData,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      }
    } catch (error) {
      console.error('Erreur lors de la récupération paginée des notifications:', error)
      return {
        data: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: limit,
          hasNextPage: false,
          hasPrevPage: false,
        },
      }
    }
  }

  /**
   * Marque une notification comme lue
   */
  async markAsRead(id: string): Promise<void> {
    try {
      await this.update(id, { isRead: true })
    } catch (error) {
      console.error('Erreur lors du marquage de la notification comme lue:', error)
      throw error
    }
  }

  /**
   * Marque toutes les notifications comme lues
   */
  async markAllAsRead(): Promise<void> {
    try {
      const { collection, query, where, getDocs, writeBatch, db } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.notifications)
      const q = query(collectionRef, where('isRead', '==', false))

      const snapshot = await getDocs(q)
      const batch = writeBatch(db)

      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { isRead: true })
      })

      await batch.commit()
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications comme lues:', error)
      throw error
    }
  }

  /**
   * Marque toutes les notifications d'un module comme lues
   */
  async markAsReadByModule(module: NotificationModule): Promise<void> {
    try {
      const { collection, query, where, getDocs, writeBatch, db } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.notifications)
      const q = query(
        collectionRef,
        where('module', '==', module),
        where('isRead', '==', false)
      )

      const snapshot = await getDocs(q)
      const batch = writeBatch(db)

      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { isRead: true })
      })

      await batch.commit()
    } catch (error) {
      console.error('Erreur lors du marquage des notifications du module comme lues:', error)
      throw error
    }
  }

  /**
   * Récupère les notifications programmées à envoyer avant une date
   */
  async getScheduledNotifications(beforeDate: Date): Promise<Notification[]> {
    try {
      const { collection, query, where, orderBy, getDocs, db, Timestamp } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.notifications)
      const q = query(
        collectionRef,
        where('scheduledAt', '<=', Timestamp.fromDate(beforeDate)),
        where('sentAt', '==', null),
        orderBy('scheduledAt', 'asc')
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map((doc) =>
        this.mapDocToEntity(doc.id, doc.data() as FirestoreNotification)
      )
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications programmées:', error)
      return []
    }
  }

  /**
   * Marque une notification comme envoyée
   */
  async markAsSent(id: string): Promise<void> {
    try {
      await this.update(id, { sentAt: new Date() })
    } catch (error) {
      console.error('Erreur lors du marquage de la notification comme envoyée:', error)
      throw error
    }
  }
}

