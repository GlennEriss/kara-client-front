import { messageActions } from './messages'
import { invitationActions } from './invitations'
import { directoryActions } from './directories'
import { placementDocumentActions } from './placement-documents'
import { documentActions } from './documents'
import { administrationActions } from './administration'
import { charityActions } from './charity'
import { memberActions } from './members'
import type { AdminModule, Dataset } from '../catalog'
import { baseActions } from '../server/registry'
import { groupActions } from './groups'
import { placementActions } from './placements'
import { communityActions } from './community'
export const adminActions = (module: AdminModule, dataset: Dataset) => [
  ...baseActions(module, dataset),
  ...messageActions(module),
  ...directoryActions(module, dataset),
  ...groupActions(module),
  ...placementActions(module, dataset),
  ...communityActions(module, dataset),
  ...memberActions(module, dataset),
  ...charityActions(module),
  ...administrationActions(module, dataset),
  ...documentActions(module),
  ...invitationActions(module),
  ...placementDocumentActions(module, dataset),
]
