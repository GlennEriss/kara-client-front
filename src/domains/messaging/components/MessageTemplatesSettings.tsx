'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Check,
  Eye,
  Loader2,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/domains/auth/hooks'
import { useMyAccess } from '@/hooks/useMyAccess'

import {
  MESSAGE_TEMPLATES,
  MESSAGE_TEMPLATE_CATEGORY_LABELS,
  type MessageTemplateCategory,
  type MessageTemplateDefinition,
} from '../constants/message-templates'
import type { MessageTemplateOverrides } from '../db/messageTemplates.db'
import {
  useMessageTemplateOverrides,
  useSaveMessageTemplates,
} from '../hooks/useMessageTemplates'
import { extractTemplateVariables, renderTemplate } from '../utils/renderTemplate'

const CATEGORIES = Object.keys(MESSAGE_TEMPLATE_CATEGORY_LABELS) as MessageTemplateCategory[]

/** Valeur d'exemple injectée dans l'aperçu, pour visualiser le rendu final. */
const SAMPLE_VALUES: Record<string, string> = {
  prenom: 'Awa',
  nom: 'NGUEMA Awa',
  age: '34',
  produit: 'Caisse spéciale',
  typeVersement: 'mensuel',
  montant: '25 000',
  montantTotal: '75 000',
  nombre: '3',
  dateEcheance: '05/03/2026',
  joursRetard: '12 jours',
  detail: '• Versement mensuel — 25 000 FCFA (échéance du 05/03/2026)',
  matricule: 'MK-2026-0142',
  motif: 'Pièce d’identité illisible',
  corrections: '- Photo de la pièce d’identité\n- Numéro de téléphone',
  lien: 'https://kara.ga/corrections/MK-2026-0142',
  code: '482 913',
  dateExpiration: '12/03/2026 18:00',
  tempsRestant: '2 jours',
  plaque: ' (plaque GA-123-AB)',
  compagnie: ', NSIA Assurances',
  echeance: 'dans 7 jours (le 12/03/2026)',
  dateFin: '12/03/2026',
}

function previewOf(body: string): string {
  const variables = Object.fromEntries(
    extractTemplateVariables(body).map((name) => [name, SAMPLE_VALUES[name] ?? `«${name}»`])
  )
  return renderTemplate(body, variables)
}

interface TemplateEditorProps {
  template: MessageTemplateDefinition
  value: string
  onChange: (body: string) => void
  onResetDefault: () => void
  readOnly: boolean
}

function TemplateEditor({ template, value, onChange, onResetDefault, readOnly }: TemplateEditorProps) {
  const [showPreview, setShowPreview] = useState(false)
  const isCustom = value.trim() !== template.defaultBody.trim()
  // Une variable écrite dans le corps mais absente du catalogue ne sera jamais
  // remplacée : on prévient l'administrateur plutôt que d'envoyer un trou.
  const unknownVariables = useMemo(() => {
    const known = new Set(template.variables.map((v) => v.name))
    return extractTemplateVariables(value).filter((name) => !known.has(name))
  }, [value, template.variables])

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              {template.label}
              {isCustom && (
                <Badge className="bg-[#234D65] text-white hover:bg-[#234D65]">Personnalisé</Badge>
              )}
            </CardTitle>
            <p className="mt-1 text-sm text-gray-600">{template.description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreview((v) => !v)}
            >
              <Eye className="mr-2 h-4 w-4" />
              {showPreview ? 'Masquer l’aperçu' : 'Aperçu'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetDefault}
              disabled={readOnly || !isCustom}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Texte par défaut
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          rows={Math.min(18, Math.max(6, value.split('\n').length + 1))}
          className="font-mono text-sm leading-relaxed"
          aria-label={`Corps du message : ${template.label}`}
        />

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Variables disponibles
          </p>
          <div className="flex flex-wrap gap-2">
            {template.variables.map((variable) => (
              <button
                key={variable.name}
                type="button"
                title={variable.description}
                disabled={readOnly}
                onClick={() => onChange(`${value}{{${variable.name}}}`)}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-[#234D65] transition-colors hover:border-[#234D65]/40 hover:bg-[#234D65]/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {`{{${variable.name}}}`}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Cliquez sur une variable pour l’ajouter à la fin du message. Survolez-la pour voir sa
            description.
          </p>
        </div>

        {unknownVariables.length > 0 && (
          <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Variable{unknownVariables.length > 1 ? 's' : ''} inconnue
              {unknownVariables.length > 1 ? 's' : ''} :{' '}
              <span className="font-mono">{unknownVariables.map((v) => `{{${v}}}`).join(', ')}</span>{' '}
              — elle{unknownVariables.length > 1 ? 's seront' : ' sera'} remplacée
              {unknownVariables.length > 1 ? 's' : ''} par du vide dans le message envoyé.
            </AlertDescription>
          </Alert>
        )}

        {showPreview && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Aperçu avec des données d’exemple
            </p>
            <p className="whitespace-pre-wrap text-sm text-gray-800">{previewOf(value)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function MessageTemplatesSettings() {
  const { user } = useAuth()
  const { can, isSuperAdmin } = useMyAccess()
  const canManage = isSuperAdmin || can('messageTemplates.manage')

  const { data: overrides, isLoading, isError, errorCode, refetch } = useMessageTemplateOverrides()
  const { save, isPending: isSaving } = useSaveMessageTemplates()

  // Corps courants de tous les modèles (défaut + personnalisations chargées).
  const [bodies, setBodies] = useState<Record<string, string>>({})
  const [initialBodies, setInitialBodies] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isLoading) return
    const next = Object.fromEntries(
      MESSAGE_TEMPLATES.map((t) => [t.key, overrides?.[t.key]?.trim() || t.defaultBody])
    )
    setBodies(next)
    setInitialBodies(next)
  }, [overrides, isLoading])

  const dirtyKeys = useMemo(
    () => Object.keys(bodies).filter((key) => bodies[key] !== initialBodies[key]),
    [bodies, initialBodies]
  )

  const templatesByCategory = useMemo(() => {
    const map = new Map<MessageTemplateCategory, MessageTemplateDefinition[]>()
    for (const template of MESSAGE_TEMPLATES) {
      const list = map.get(template.category) ?? []
      list.push(template)
      map.set(template.category, list)
    }
    return map
  }, [])

  const handleSave = async () => {
    // Seuls les modèles réellement modifiés sont stockés : les autres suivront
    // les évolutions du texte par défaut livré avec l'application.
    const nextOverrides: MessageTemplateOverrides = {}
    for (const template of MESSAGE_TEMPLATES) {
      const body = (bodies[template.key] ?? '').trim()
      if (body && body !== template.defaultBody.trim()) {
        nextOverrides[template.key] = body
      }
    }

    const empty = MESSAGE_TEMPLATES.filter((t) => !(bodies[t.key] ?? '').trim())
    if (empty.length > 0) {
      toast.error(`Message vide : « ${empty[0].label} ». Renseignez un texte ou revenez au défaut.`)
      return
    }

    try {
      await save(nextOverrides, user?.uid)
      setInitialBodies({ ...bodies })
      toast.success('Modèles de messages enregistrés')
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code: unknown }).code)
          : undefined
      // Même cause que l'échec de lecture : les règles Firestore ne sont pas déployées.
      toast.error(
        code === 'permission-denied'
          ? 'Enregistrement refusé par Firestore : déployez les règles (firebase deploy --only firestore:rules).'
          : error instanceof Error
            ? error.message
            : 'Impossible d’enregistrer les modèles de messages'
      )
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            {errorCode === 'permission-denied' ? (
              <p>
                <span className="font-semibold">Accès refusé par Firestore.</span> Les règles de
                sécurité autorisant <code className="font-mono">settings/messageTemplates</code>{' '}
                ne sont pas encore déployées : lancez{' '}
                <code className="font-mono">firebase deploy --only firestore:rules</code>.
                L&apos;enregistrement échouera tant que ce n&apos;est pas fait.
              </p>
            ) : (
              <p>
                Impossible de charger les modèles enregistrés
                {errorCode ? ` (${errorCode})` : ''}. Vérifiez votre connexion avant
                d&apos;enregistrer, sous peine de perdre vos modifications.
              </p>
            )}
            <p>Les textes par défaut sont affichés en attendant.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!canManage && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Vous pouvez consulter les modèles mais pas les modifier.
          </AlertDescription>
        </Alert>
      )}

      {/* Barre d'enregistrement */}
      <Card className="relative overflow-hidden border border-slate-200/80 bg-white shadow-md">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#234D65] via-[#2c5a73] to-[#cbb171]" />
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 md:p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] p-2.5 shadow-sm">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-gray-900">
                {MESSAGE_TEMPLATES.length} modèles disponibles
              </p>
              <p className="text-sm text-gray-600">
                {dirtyKeys.length > 0
                  ? `${dirtyKeys.length} modification${dirtyKeys.length > 1 ? 's' : ''} non enregistrée${dirtyKeys.length > 1 ? 's' : ''}`
                  : 'Tous les modèles sont à jour'}
              </p>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={!canManage || dirtyKeys.length === 0 || isSaving}
            className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white hover:from-[#2c5a73] hover:to-[#234D65]"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : dirtyKeys.length === 0 ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Enregistrer
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue={CATEGORIES[0]} className="space-y-4">
        <TabsList className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => {
            const count = templatesByCategory.get(category)?.length ?? 0
            return (
              <TabsTrigger key={category} value={category}>
                {MESSAGE_TEMPLATE_CATEGORY_LABELS[category]}
                <span className="ml-1.5 text-xs text-gray-400">({count})</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {CATEGORIES.map((category) => (
          <TabsContent key={category} value={category} className="space-y-4">
            {(templatesByCategory.get(category) ?? []).map((template) => (
              <TemplateEditor
                key={template.key}
                template={template}
                value={bodies[template.key] ?? template.defaultBody}
                readOnly={!canManage}
                onChange={(body) => setBodies((prev) => ({ ...prev, [template.key]: body }))}
                onResetDefault={() =>
                  setBodies((prev) => ({ ...prev, [template.key]: template.defaultBody }))
                }
              />
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
