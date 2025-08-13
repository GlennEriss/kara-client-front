import React from 'react'
import GroupDetails from '../../../../components/groups/GroupDetails'

export default function GroupDetailsPage({ params }: { params: { id: string } }) {
  return <GroupDetails groupId={params.id} />
}
