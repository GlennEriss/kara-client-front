'use client'

import React from 'react'
import { Bell, Cake, CheckCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  useUnreadCount,
  useUnreadNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from '@/hooks/notifications'
import { Notification } from '@/types/types'
import { cn } from '@/lib/utils'

/**
 * Formate une date pour l'affichage
 */
function formatNotificationDate(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const notificationDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffTime = today.getTime() - notificationDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
  } else if (diffDays === 1) {
    return `Hier à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
  } else if (diffDays < 7) {
    return `Il y a ${diffDays} jours`
  } else {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    })
  }
}

/**
 * Affiche le badge de priorité pour une notification d'anniversaire
 */
function BirthdayBadge({ daysUntil }: { daysUntil?: number }) {
  if (daysUntil === undefined) return null

  if (daysUntil === 0) {
    return (
      <Badge variant="default" className="bg-green-500 text-white">
        Aujourd'hui
      </Badge>
    )
  } else if (daysUntil === 2) {
    return (
      <Badge variant="secondary" className="bg-blue-500 text-white">
        Dans 2 jours
      </Badge>
    )
  } else if (daysUntil === -1) {
    return (
      <Badge variant="outline" className="bg-gray-100 text-gray-700">
        Hier
      </Badge>
    )
  }

  return null
}

/**
 * Composant pour afficher une notification individuelle
 */
function NotificationItem({
  notification,
  onMarkAsRead,
  onNavigate,
}: {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onNavigate: (path: string) => void
}) {
  const isBirthday = notification.type === 'birthday_reminder'
  const isUnread = !notification.isRead

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id)
    }

    // Navigation selon le type de notification
    if (isBirthday && notification.metadata?.memberId) {
      onNavigate(`/memberships?tab=birthdays`)
    } else if (notification.module === 'memberships' && notification.entityId) {
      // Vérifier si c'est une notification de corrections (demande d'adhésion)
      if (notification.type === 'corrections_submitted' || notification.type === 'corrections_requested' || notification.metadata?.requestId) {
        // Rediriger vers la page des demandes d'adhésion
        onNavigate(`/membership-requests/${notification.entityId}`)
      } else {
        // Sinon, c'est un membre
        onNavigate(`/memberships/${notification.entityId}`)
      }
    } else if (notification.module === 'caisse_imprevue' && notification.metadata?.contractId) {
      // Navigation vers les détails du contrat CI
      onNavigate(`/caisse-imprevue/contrats/${notification.metadata.contractId}`)
    } else if (notification.module === 'caisse_imprevue' && notification.type === 'payment_due' && notification.metadata?.contractId) {
      // Navigation vers la page des versements du contrat
      onNavigate(`/caisse-imprevue/contrats/${notification.metadata.contractId}/versements`)
    }
  }

  return (
    <DropdownMenuItem
      className={cn(
        'flex flex-col items-start gap-2 p-3 cursor-pointer min-w-[320px] max-w-[400px]',
        isUnread && 'bg-blue-50 border-l-4 border-l-blue-500'
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3 w-full">
        {isBirthday && (
          <div className="flex-shrink-0 mt-0.5">
            <Cake className="h-4 w-4 text-pink-500" />
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-gray-900">{notification.title}</p>
            {isBirthday && <BirthdayBadge daysUntil={notification.metadata?.daysUntil} />}
          </div>
          <p className="text-xs text-gray-600 line-clamp-2">{notification.message}</p>
          {isBirthday && notification.metadata?.age && (
            <p className="text-xs text-gray-500">
              {notification.metadata.memberFirstName} {notification.metadata.memberLastName} (
              {notification.metadata.age} ans)
            </p>
          )}
          <p className="text-xs text-gray-400">{formatNotificationDate(notification.createdAt)}</p>
        </div>
        {isUnread && (
          <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
        )}
      </div>
    </DropdownMenuItem>
  )
}

/**
 * Composant principal NotificationBell
 */
export default function NotificationBell() {
  const router = useRouter()
  const { data: unreadCount = 0, isLoading: isLoadingCount } = useUnreadCount()
  const { data: notifications = [], isLoading: isLoadingNotifications } =
    useUnreadNotifications(50)
  const markAsReadMutation = useMarkNotificationAsRead()
  const markAllAsReadMutation = useMarkAllNotificationsAsRead()

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id)
  }

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate()
  }

  const handleNavigate = (path: string) => {
    router.push(path)
  }

  const hasUnreadNotifications = unreadCount > 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {!isLoadingCount && hasUnreadNotifications && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[400px] max-h-[600px] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {hasUnreadNotifications && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                handleMarkAllAsRead()
              }}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Tout marquer comme lu
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoadingNotifications ? (
          <div className="p-4 text-center text-sm text-gray-500">Chargement...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            Aucune notification
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

