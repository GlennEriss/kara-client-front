"use client"
import GabonPhoneInput from '@/components/shared/GabonPhoneInput'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AdminUser } from '@/db/admin.db'
import { createAdminWithId, updateAdmin } from '@/db/admin.db'
import { createFile } from '@/db/upload-image.db'
import { generateMatricule } from '@/db/user.db'
import { useAuth } from '@/hooks/useAuth'
import { cn, compressImage, getImageInfo, IMAGE_COMPRESSION_PRESETS } from '@/lib/utils'
import { CivilityEnum, GenderEnum } from '@/schemas/identity.schema'
import { AdminCreateFormData, adminCreateSchema, AdminRoleEnum } from '@/schemas/schemas'
import { PermissionsEditor } from '@/components/admin/PermissionsEditor'
import { useMyAccess } from '@/hooks/useMyAccess'
import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, CheckCircle, Loader2 } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

interface AdminFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: AdminCreateFormData) => Promise<void> | void
  mode?: 'create' | 'edit'
  initialValues?: Partial<AdminUser>
}

export default function AdminFormModal({ isOpen, onClose, onSubmit, mode = 'create', initialValues }: AdminFormModalProps) {
  const { user } = useAuth()
  const { isSuperAdmin: iAmSuperAdmin } = useMyAccess()
  // Aligné sur les règles Firestore : seule l'écriture SuperAdmin est autorisée
  // sur la collection admins — l'UI ne propose donc la gestion qu'aux SuperAdmins.
  const canManageAdmins = iAmSuperAdmin
  // Numéro gabonais strict : GabonPhoneInput émet toujours +241 suivi de 8 chiffres.
  const phoneSchema = z
    .string()
    .regex(/^\+241\d{8}$/, 'Numéro gabonais invalide (8 chiffres, ex : 65 34 56 78)')

  const schema = adminCreateSchema.extend({
    // Autoriser l'email vide ('') en plus d'un email valide
    email: z.string().email('Format d\'email invalide').min(1, 'L\'email est obligatoire'),
    contacts: z.array(phoneSchema).length(1, 'Un seul numéro de téléphone est requis'),
    uid: z.string().optional(), // Champ caché pour l'UID en mode édition
  })

  type AdminFormValues = z.infer<typeof schema>

  const emptyDefaults: AdminFormValues = {
    civility: 'Monsieur',
    lastName: '',
    firstName: '',
    birthDate: '',
    gender: 'Homme',
    email: '',
    contacts: [''],
    roles: ['Admin'],
    permissions: [],
    photoURL: null,
    photoPath: null,
    uid: undefined,
  }

  const form = useForm<AdminFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyDefaults,
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null)

  // Pré-remplissage en mode édition
  useEffect(() => {
    if (mode === 'edit' && initialValues && isOpen) {
      form.reset({
        uid: initialValues.id || '',
        civility: (initialValues.civility as any) ?? 'Monsieur',
        lastName: initialValues.lastName ?? '',
        firstName: initialValues.firstName ?? '',
        birthDate: initialValues.birthDate ?? '',
        gender: (initialValues.gender as any) ?? 'Homme',
        email: initialValues.email ?? '',
        contacts: initialValues.contacts && initialValues.contacts.length > 0 ? [initialValues.contacts[0]] : [''],
        roles: (initialValues.roles as any) ?? ['Admin'],
        permissions: (initialValues.permissions as any) ?? [],
        photoURL: initialValues.photoURL ?? null,
        photoPath: initialValues.photoPath ?? null,
      })
      setPhotoPreview(initialValues.photoURL ?? null)
      setCompressionInfo(null)
    }
  }, [mode, initialValues, isOpen])

  function dataURLtoFile(dataUrl: string, filename: string): File {
    const arr = dataUrl.split(',')
    const mimeMatch = arr[0].match(/:(.*?);/)
    const mime = mimeMatch ? mimeMatch[1] : 'image/webp'
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new File([u8arr], filename, { type: mime })
  }

  const handlePhotoUpload = async (file: File) => {
    try {
      setIsUploading(true)
      // 1) Compression en WebP
      const compressedDataUrl = await compressImage(file, IMAGE_COMPRESSION_PRESETS.profile)
      const info = getImageInfo(compressedDataUrl)
      setCompressionInfo(`${info.format} • ${info.sizeText}`)
      setPhotoPreview(compressedDataUrl)

      // 2) Conversion en File et upload vers Storage
      const finalFile = dataURLtoFile(compressedDataUrl, `admin-profile-${Date.now()}.webp`)
      const { url, path } = await createFile(finalFile, 'admins', 'admin-photos')

      // 3) Mettre à jour le formulaire
      form.setValue('photoURL', url)
      form.setValue('photoPath', path)
    } catch (e) {
      console.error('Erreur upload photo admin:', e)
    } finally {
      setIsUploading(false)
    }
  }

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      void handlePhotoUpload(file)
    }
  }

  const handleSubmit = async (values: AdminFormValues) => {
    setIsSubmitting(true)
    try {
      if (mode === 'edit') {
        // Mode édition: pas de création Auth/Firestore ici. On délègue au parent.
        if (!values.uid) {
          toast.error('UID manquant pour la mise à jour')
          return
        }

        const response = await fetch('/api/auth/update-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              uid: values.uid,
              email: values.email,
              role: values.roles?.[0] || 'Admin',
              civility: values.civility,
              birthDate: values.birthDate,
              photoURL: values.photoURL,
              firstName: values.firstName,
              lastName: values.lastName,
              phoneNumber: values.contacts?.[0],
            }),
          })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          toast.error(`Erreur Firebase Auth: ${errorData.error || 'Mise à jour échouée'}`)
          return
        }

        // Mise à jour de la collection admins
        let phone = (values.contacts?.[0] || '').trim()
        if (phone && !phone.startsWith('+')) {
          phone = `+241${phone.replace(/[^\d]/g, '').replace(/^0+/, '')}`
        }

        const isSuperAdminRoleEdit = (values.roles || []).some((r) => String(r).toLowerCase().includes('superadmin'))
        await updateAdmin(values.uid, {
          firstName: values.firstName,
          lastName: values.lastName,
          birthDate: values.birthDate,
          civility: values.civility as any,
          gender: values.gender as any,
          email: values.email?.trim() ? values.email.trim() : undefined,
          contacts: phone ? [phone] : [],
          roles: values.roles as any,
          permissions: isSuperAdminRoleEdit ? [] : (values.permissions ?? []),
          photoURL: values.photoURL,
          photoPath: values.photoPath,
        })

        // Notifier le parent du succès
        await onSubmit(values as AdminCreateFormData)
        
        toast.success('Administrateur mis à jour avec succès')
        
        // Nettoyage des champs après update
        form.reset(emptyDefaults)
        setPhotoPreview(null)
        setCompressionInfo(null)
        onClose()
        return
      }

      // Mode création: logique existante
      const matricule = await generateMatricule()

      let phone = (values.contacts?.[0] || '').trim()
      if (!phone) throw new Error('Numéro de téléphone requis')
      if (!phone.startsWith('+')) {
        phone = `+241${phone.replace(/[^\d]/g, '').replace(/^0+/, '')}`
      }

      const displayName = `${values.firstName} ${values.lastName}`.trim()

      //upload photo admin
      let uploadedPhotoURL: string | null = values.photoURL ?? null
      let uploadedPhotoPath: string | null = values.photoPath ?? null
      if (photoPreview) {
        const finalFile = dataURLtoFile(photoPreview, 'photo.webp')
        const { url, path } = await createFile(finalFile, matricule, `admins-photo/${matricule}`)
        uploadedPhotoURL = url
        uploadedPhotoPath = path
        form.setValue('photoURL', url)
        form.setValue('photoPath', path)
      }

      const authResponse = await fetch('/api/auth/create-admin/by-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: matricule,
          email: values.email,
          password: matricule,
          role: values.roles?.[0] || 'Admin',
          civility: values.civility,
          birthDate: values.birthDate,
          photoURL: uploadedPhotoURL,
          firstName: values.firstName,
          lastName: values.lastName,
          phoneNumber: phone,
        }),
      })
      if (!authResponse.ok) {
        const errorData = await authResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Création Firebase Auth échouée')
      }

      // Créer l'admin dans la collection admins avec l'ID = matricule
      const isSuperAdminRoleCreate = (values.roles || []).some((r) => String(r).toLowerCase().includes('superadmin'))
      await createAdminWithId(matricule, {
        firstName: values.firstName,
        lastName: values.lastName,
        birthDate: values.birthDate,
        civility: values.civility as any,
        gender: values.gender as any,
        email: values.email?.trim() ? values.email.trim() : undefined,
        contacts: [phone],
        roles: values.roles as any,
        permissions: isSuperAdminRoleCreate ? [] : (values.permissions ?? []),
        photoURL: uploadedPhotoURL,
        photoPath: uploadedPhotoPath,
        isActive: true,
        createdBy: user?.uid || 'SuperAdmin'
      })

      await onSubmit({ ...values, contacts: [phone], photoURL: uploadedPhotoURL, photoPath: uploadedPhotoPath } as AdminCreateFormData)
      // Nettoyage des champs après création
      form.reset(emptyDefaults)
      setPhotoPreview(null)
      setCompressionInfo(null)
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde de l’administrateur')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent size="md">
        <ModalHeader title={mode === 'edit' ? 'Modifier un administrateur' : 'Ajouter un administrateur'} />

        <ModalBody>
        {/* Upload Photo - Cercle cliquable */}
        <div className="w-full flex items-center justify-center mb-4">
          <div
            className={cn(
              'relative w-28 h-28 rounded-full border-2 border-dashed cursor-pointer group',
              photoPreview ? 'border-[#224D62]/50 bg-[#224D62]/5' : 'border-[#224D62]/30 hover:border-[#224D62]/50 hover:bg-[#224D62]/5'
            )}
            onClick={() => { if (!isUploading && !isSubmitting) fileInputRef.current?.click() }}
            aria-disabled={isUploading || isSubmitting}
            style={{ pointerEvents: (isUploading || isSubmitting) ? 'none' as const : 'auto' }}
          >
            {isUploading ? (
              <div className="w-full h-full rounded-full flex items-center justify-center bg-gradient-to-r from-[#224D62]/10 to-[#CBB171]/10">
                <Loader2 className="w-6 h-6 text-[#224D62] animate-spin" />
              </div>
            ) : photoPreview ? (
              <div className="w-full h-full rounded-full overflow-hidden">
                <Avatar className="w-full h-full">
                  <AvatarImage src={photoPreview} alt="Photo admin" />
                  <AvatarFallback className="bg-[#224D62]/10">
                    <Camera className="w-8 h-8 text-[#224D62]" />
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -top-2 -right-2">
                  <span className="inline-flex items-center gap-1 bg-gradient-to-r from-[#CBB171] to-[#224D62] text-white text-[10px] px-2 py-1 rounded-full shadow-sm">
                    <CheckCircle className="w-3 h-3" /> OK
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full h-full rounded-full flex items-center justify-center bg-gradient-to-r from-[#224D62]/10 to-[#CBB171]/10 group-hover:from-[#224D62]/20 group-hover:to-[#CBB171]/20 transition-all duration-300">
                <Camera className="w-8 h-8 text-[#224D62] group-hover:scale-110 transition-transform" />
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onSelectFile} className="hidden" disabled={isUploading || isSubmitting} />
          </div>
        </div>
        {compressionInfo && (
          <p className="text-center text-xs text-[#224D62] mb-4">{compressionInfo}</p>
        )}

        <Form {...form}>
          <form id="admin-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="civility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Civilité</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val)
                        // Règle: Monsieur => Homme, sinon Femme
                        form.setValue('gender', val === 'Monsieur' ? 'Homme' : 'Femme')
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CivilityEnum.options.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sexe</FormLabel>
                    <Select value={field.value} disabled>
                      <FormControl>
                        <SelectTrigger className="opacity-70">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GenderEnum.options.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom</FormLabel>
                    <FormControl>
                      <Input placeholder="Prénom" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="birthDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date de naissance</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: admin@kara.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contacts.0"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numéro de téléphone</FormLabel>
                  <FormControl>
                    <GabonPhoneInput
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription>
                    Un seul numéro est enregistré
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="roles"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rôle</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange([val as z.infer<typeof AdminRoleEnum>])}
                    defaultValue={field.value?.[0]}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AdminRoleEnum.options.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Éditeur d'accès fin (masqué pour les superAdmins : ils ont tous les droits) */}
            {(() => {
              const selectedRoles = form.watch('roles') || []
              const isSuperAdminRole = selectedRoles.some((r) => String(r).toLowerCase().includes('superadmin'))
              if (isSuperAdminRole) {
                return (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    Les super administrateurs disposent de <strong>tous les droits</strong> — aucune permission à configurer.
                  </div>
                )
              }
              if (!canManageAdmins) return null
              const permissions = form.watch('permissions') || []
              return (
                <FormItem>
                  <FormLabel>Accès &amp; permissions</FormLabel>
                  <FormDescription>
                    Cochez précisément les sections et actions autorisées pour cet administrateur.
                  </FormDescription>
                  <PermissionsEditor
                    value={permissions}
                    onChange={(next) => form.setValue('permissions', next, { shouldDirty: true })}
                  />
                </FormItem>
              )
            })()}

          </form>
        </Form>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>Annuler</Button>
          <Button type="submit" form="admin-form" disabled={isUploading || isSubmitting}>
            {isSubmitting ? (
              <span className="inline-flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {mode === 'edit' ? 'Mise à jour...' : 'Enregistrement...'}</span>
            ) : (
              mode === 'edit' ? 'Mettre à jour' : 'Enregistrer'
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}
