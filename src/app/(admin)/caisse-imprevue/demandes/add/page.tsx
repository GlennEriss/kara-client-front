/**
 * Page de création d'une demande Caisse Imprévue V2
 * 
 * Formulaire multi-étapes avec persistance localStorage
 */

'use client'

import { useRouter } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useDemandForm, useCreateDemand } from '@/domains/financial/caisse-imprevue/hooks'
import { useAuth } from '@/domains/auth/hooks/useAuth'
import { toast } from 'sonner'
import { CreateDemandFormV2 } from '@/domains/financial/caisse-imprevue/components/forms'

export default function CreateDemandPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { form, currentStep, nextStep, previousStep, isSubmitting, setIsSubmitting } = useDemandForm()
  const createMutation = useCreateDemand()

  const handleSubmit = async (data: any) => {
    if (!user?.uid) {
      toast.error('Vous devez être connecté pour créer une demande')
      return
    }

    setIsSubmitting(true)
    try {
      await createMutation.mutateAsync({
        data,
        createdBy: user.uid,
      })
      router.push('/caisse-imprevue/demandes')
    } catch (error) {
      console.error('Erreur lors de la création:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto p-3 md:p-4 lg:p-6 space-y-4 md:space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/caisse-imprevue/demandes">Demandes</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbPage>Créer une demande</BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-black">Créer une demande</h1>
          <p className="text-sm md:text-base text-kara-neutral-600">
            Remplissez le formulaire en 3 étapes
          </p>
        </div>
      </div>

      {/* Formulaire */}
      <CreateDemandFormV2
        form={form}
        currentStep={currentStep}
        onNext={nextStep}
        onPrevious={previousStep}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting || createMutation.isPending}
      />
    </div>
  )
}
