'use client'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { getBreadcrumbs, type BreadcrumbSegment } from '@/lib/breadcrumbs'
import { ChevronRight, MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

type DisplaySegment = BreadcrumbSegment & {
  isCurrent: boolean
  isEllipsis?: boolean
}

// Sur mobile avec > 3 segments : Dashboard + ... + parent + courant
function optimizeForMobile(segments: DisplaySegment[], isMobile: boolean): DisplaySegment[] {
  if (!isMobile || segments.length <= 3) return segments
  return [
    segments[0],
    { label: '...', isCurrent: false, isEllipsis: true },
    segments[segments.length - 2],
    segments[segments.length - 1],
  ]
}

export function DashboardBreadcrumb() {
  const pathname = usePathname()
  const raw = getBreadcrumbs(pathname)

  const segments: DisplaySegment[] = raw.map((s, i) => ({
    ...s,
    isCurrent: i === raw.length - 1,
  }))

  const [isMobile, setIsMobile] = React.useState(false)
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const display = optimizeForMobile(segments, isMobile)

  if (segments.length === 0 || (pathname === '/dashboard' && segments.length === 1)) {
    return null
  }

  const mobileLabel = (label: string, isCurrent: boolean) => {
    if (!isMobile) return label
    if (!isCurrent && label === 'Tableau de bord') return 'Accueil'
    return label
  }

  return (
    <Breadcrumb>
      <BreadcrumbList className="text-xs sm:text-sm flex flex-wrap items-center gap-1 sm:gap-2">
        {display.map((segment, index) => (
          <React.Fragment key={segment.href || segment.label + index}>
            <BreadcrumbItem className="flex items-center">
              {segment.isEllipsis ? (
                <span className="text-gray-400 flex items-center">
                  <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                </span>
              ) : segment.isCurrent || !segment.href ? (
                <BreadcrumbPage className="text-gray-600 font-medium whitespace-normal break-words leading-tight">
                  {mobileLabel(segment.label, true)}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link
                    href={segment.href}
                    className="text-gray-500 hover:text-gray-700 transition-colors whitespace-normal break-words leading-tight"
                    title={segment.label}
                  >
                    {mobileLabel(segment.label, false)}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < display.length - 1 && (
              <BreadcrumbSeparator className="text-gray-400 flex items-center">
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </BreadcrumbSeparator>
            )}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
