/**
 * Exports des hooks du domaine Événements
 */

export { useEvents, EVENTS_QUERY_KEY } from './useEvents'
export { useEvent } from './useEvent'
export { useEventStats } from './useEventStats'
export { useEventVoters } from './useEventVoters'
export {
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  usePublishEvent,
  useConfirmEventLocation,
  useCancelEvent,
} from './useEventMutations'
