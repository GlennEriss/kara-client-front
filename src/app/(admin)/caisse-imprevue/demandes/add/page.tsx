/**
 * Page de création d'une demande Caisse Imprévue V2
 * 
 * Formulaire multi-étapes avec persistance localStorage
 */

'use client'

import { useRouter } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, FileText } from 'lucide-react'
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

      {/* Header avec design moderne */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white">
        <CardContent className="p-4 md:p-6 lg:p-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="text-white hover:bg-white/20 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3 flex-1">
              <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
                <FileText className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-black">
                  Créer une demande
                </h1>
                <p className="text-sm md:text-base text-white/80 mt-1">
                  Remplissez le formulaire en 3 étapes
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
