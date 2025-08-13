import React from 'react'
import GroupDetails from '../../../../components/groups/GroupDetails'

export default async function GroupDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return <GroupDetails groupId={id} />
}
