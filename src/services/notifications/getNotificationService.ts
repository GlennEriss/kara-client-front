import { NotificationService } from './NotificationService'

let service: NotificationService | undefined

/** Accès léger pour la cloche et ses actions, partagé entre les hooks. */
export function getNotificationService(): NotificationService {
  return service ??= new NotificationService()
}
