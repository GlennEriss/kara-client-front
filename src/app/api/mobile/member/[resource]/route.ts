import { memberShopDirectory, memberShops } from '@/domains/member-mobile/server/shop'
import {
  createMemberProspect,
  declareMemberInsurance,
  memberInsurance,
  memberInsuranceQuarters,
} from '@/domains/member-mobile/server/insurance'
import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth } from '@/firebase/adminAuth'
import { adminFirestore } from '@/firebase/adminFirestore'
import { mobileJson } from '@/domains/mobile/server/access'
import {
  memberPaymentHistory,
  memberPaymentHistoryPdf,
} from '@/domains/member-mobile/server/payment-history'
import { requireMemberCaller } from '@/domains/member-mobile/server/access'
import {
  listMemberGroups,
  getMemberGroup,
} from '@/domains/member-mobile/groups/server/groupRepository'
import {
  memberCharity,
  createSolidarityRequest,
} from '@/domains/member-mobile/server/solidarity'
import {
  memberEcheances,
  ownedAccompaniment,
  type CalendarFamily,
  calendarSummary,
  ownedCalendarContract,
} from '@/domains/member-mobile/server/calendar'
import {
  memberDocuments,
  memberOfficialDocument,
} from '@/domains/member-mobile/server/documents'
import { MemberError } from '@/domains/member-mobile/server/data'
import {
  memberDashboard,
  memberProfile,
  memberSubscriptions,
} from '@/domains/member-mobile/server/read-model'
import {
  REGLEMENT_VERSION,
  REGLEMENT_ENTETE,
  REGLEMENT_BLOCS,
  GRILLE_CONTRIBUTIONS,
  GRILLE_CONTRIBUTIONS_COLONNES,
  GRILLE_PRESTATIONS,
  GRILLE_PRESTATIONS_COLONNES,
} from '@/constantes/reglement-interieur'

export const runtime = 'nodejs'
type Context = { params: Promise<{ resource: string }> }
export async function GET(request: NextRequest, context: Context) {
  const { resource } = await context.params
  if (
    ![
      'me',
      'profile',
      'subscriptions',
      'payment-history',
      'dashboard',
      'rules',
      'calendar',
      'calendar-contract',
      'documents',
      'official',
      'contact',
      'insurance',
      'shop',
      'accompaniment',
      'charity',
      'groups',
      'group',
    ].includes(resource)
  )
    return mobileJson({ error: 'Écran membre inconnu.' }, 404)
  const caller = await requireMemberCaller(
    request,
    ['me', 'rules'].includes(resource),
  )
  if (caller instanceof NextResponse) return caller
  try {
    if (resource === 'accompaniment')
      return mobileJson(
        await ownedAccompaniment(
          adminFirestore!,
          caller,
          request.nextUrl.searchParams.get('id') || '',
          request.nextUrl.searchParams.get('kind') || '',
        ),
      )
    if (resource === 'shop')
      return mobileJson({ items: request.nextUrl.searchParams.get('view') === 'directory'
        ? await memberShopDirectory(adminFirestore!)
        : await memberShops(adminFirestore!, caller) })
    if (resource === 'insurance') {
      const city = request.nextUrl.searchParams.get('city')
      return mobileJson(
        city
          ? await memberInsuranceQuarters(adminFirestore!, city)
          : await memberInsurance(adminFirestore!, caller),
      )
    }
    if (resource === 'charity')
      return mobileJson(await memberCharity(adminFirestore!, caller))
    if (resource === 'groups')
      return mobileJson({
        groups: await listMemberGroups(adminFirestore!, caller.uid),
      })
    if (resource === 'group') {
      const group = await getMemberGroup(
        adminFirestore!,
        caller.uid,
        request.nextUrl.searchParams.get('id') || '',
      )
      if (!group)
        throw new MemberError(
          'Ce groupe est introuvable ou ne fait pas partie de votre espace.',
          404,
        )
      return mobileJson({ group })
    }
    if (resource === 'contact') {
      const data = (
        await adminFirestore!.collection('settings').doc('publicContact').get()
      ).data()
      const candidate = String(
        data?.memberWhatsappNumber || data?.whatsappNumber || '+24174369729',
      ).trim()
      return mobileJson({
        whatsapp: /^[+\d\s().-]{8,30}$/.test(candidate)
          ? candidate
          : '+24174369729',
      })
    }
    if (resource === 'me') {
      const p = memberProfile(caller)
      return mobileJson({
        uid: caller.uid,
        email: caller.email,
        matricule: caller.matricule,
        displayName:
          [p.identity.firstName, p.identity.lastName]
            .filter(Boolean)
            .join(' ') || 'Membre LE KARA',
        space: 'member',
        roleLabel: 'Membre',
        mustChangePassword: caller.member.mustChangePassword === true,
        mustAcceptRules:
          caller.member.reglementInterieurAccepte?.version !==
          REGLEMENT_VERSION,
        capabilities: {
          dashboard: false,
          calendar: false,
          amounts: true,
          sections: {},
          finance: {},
        },
      })
    }
    if (resource === 'calendar') {
      const now = new Date(),
        unavailable = new Set<CalendarFamily>(),
        items = await memberEcheances(adminFirestore!, caller, now, unavailable)
      return mobileJson({
        items,
        unavailable: [...unavailable],
        summary: calendarSummary(items, now),
        generatedAt: now.toISOString(),
      })
    }
    if (resource === 'calendar-contract') {
      const id = request.nextUrl.searchParams.get('id') || '',
        source = request.nextUrl.searchParams.get('source') || ''
      return mobileJson(
        await ownedCalendarContract(adminFirestore!, caller, source, id),
      )
    }
    if (resource === 'documents')
      return mobileJson({
        items: await memberDocuments(adminFirestore!, caller),
      })
    if (resource === 'official')
      return mobileJson(
        await memberOfficialDocument(
          adminFirestore!,
          request.nextUrl.searchParams.get('id') || '',
        ),
      )
    if (resource === 'profile')
      return mobileJson({ profile: memberProfile(caller) })
    if (resource === 'payment-history') {
      const items = await memberPaymentHistory(adminFirestore!, caller)
      return mobileJson(
        request.nextUrl.searchParams.get('format') === 'pdf'
          ? await memberPaymentHistoryPdf(items)
          : { items },
      )
    }
    if (resource === 'subscriptions')
      return mobileJson({
        subscriptions: await memberSubscriptions(adminFirestore!, caller),
      })
    if (resource === 'dashboard')
      return mobileJson(await memberDashboard(adminFirestore!, caller))
    return mobileJson({
      version: REGLEMENT_VERSION,
      header: REGLEMENT_ENTETE,
      blocks: REGLEMENT_BLOCS,
      contributions: {
        columns: GRILLE_CONTRIBUTIONS_COLONNES,
        rows: GRILLE_CONTRIBUTIONS,
      },
      prestations: {
        columns: GRILLE_PRESTATIONS_COLONNES,
        rows: GRILLE_PRESTATIONS,
      },
    })
  } catch (error) {
    if (error instanceof MemberError)
      return mobileJson(
        { error: error.message, code: error.code },
        error.status,
      )
    return mobileJson(
      { error: 'Impossible de charger vos informations. Réessayez.' },
      503,
    )
  }
}

export async function POST(request: NextRequest, context: Context) {
  const { resource } = await context.params
  if (
    ![
      'accept-rules',
      'change-password',
      'insurance-prospect',
      'insurance-declaration',
      'charity-intent',
    ].includes(resource)
  )
    return mobileJson({ error: 'Action membre inconnue.' }, 404)
  const caller = await requireMemberCaller(
    request,
    ['accept-rules', 'change-password'].includes(resource),
  )
  if (caller instanceof NextResponse) return caller
  try {
    const payload = await request.json().catch(() => null)
    if (resource === 'insurance-declaration')
      return mobileJson(
        await declareMemberInsurance(adminFirestore!, caller, payload),
      )
    if (resource === 'insurance-prospect')
      return mobileJson(
        await createMemberProspect(adminFirestore!, caller, payload),
      )
    if (resource === 'charity-intent') {
      if (
        !payload ||
        Object.keys(payload).some(
          (k) => !['operationId', 'payload'].includes(k),
        )
      )
        return mobileJson({ error: 'Demande invalide.' }, 400)
      return mobileJson(
        await createSolidarityRequest(
          adminFirestore!,
          caller,
          resource,
          payload.payload,
          payload.operationId,
        ),
      )
    }
    if (resource === 'accept-rules') {
      if (caller.member.mustChangePassword === true)
        return mobileJson(
          { error: 'Choisissez d’abord votre mot de passe personnel.' },
          403,
        )
      if (
        payload?.version !== REGLEMENT_VERSION ||
        payload?.accepted !== true ||
        Object.keys(payload).some((k) => !['version', 'accepted'].includes(k))
      )
        return mobileJson(
          { error: 'Confirmez la lecture du règlement en vigueur.' },
          400,
        )
      await adminFirestore!
        .collection('users')
        .doc(caller.uid)
        .set(
          {
            reglementInterieurAccepte: {
              version: REGLEMENT_VERSION,
              acceptedAt: FieldValue.serverTimestamp(),
            },
          },
          { merge: true },
        )
      return mobileJson({ ok: true })
    }
    const password = payload?.newPassword
    if (
      typeof password !== 'string' ||
      password.length < 8 ||
      password.length > 128 ||
      !/[a-zA-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      Object.keys(payload).some((k) => k !== 'newPassword')
    )
      return mobileJson(
        { error: 'Utilisez 8 caractères minimum, une lettre et un chiffre.' },
        400,
      )
    await adminAuth!.updateUser(caller.uid, { password })
    await adminFirestore!.collection('users').doc(caller.uid).update({
      mustChangePassword: false,
      passwordChangedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    await adminAuth!.revokeRefreshTokens(caller.uid)
    return mobileJson({ ok: true })
  } catch (error) {
    if (error instanceof MemberError)
      return mobileJson({ error: error.message }, error.status)
    return mobileJson({ error: 'La mise à jour a échoué. Réessayez.' }, 503)
  }
}
