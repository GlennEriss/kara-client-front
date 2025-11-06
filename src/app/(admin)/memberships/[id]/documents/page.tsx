import React from 'react'
import ListDocuments from '@/components/member/ListDocuments'

interface MemberDocumentsPageProps {
  params: { id: string }
}

export default function MemberDocumentsPage({ params }: MemberDocumentsPageProps) {
  return <ListDocuments memberId={params.id} />
}
