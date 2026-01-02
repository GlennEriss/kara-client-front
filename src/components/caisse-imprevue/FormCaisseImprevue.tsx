'use client'
import React, { Suspense, useEffect } from 'react'
import {
    Stepper,
    StepperIndicator,
    StepperItem,
    StepperSeparator,
    StepperTrigger,
} from "@/components/ui/stepper"
import { useFormCaisseImprevueProvider } from '@/providers/FormCaisseImprevueProvider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const Step1 = React.lazy(() => import('./Step1'))
const Step2 = React.lazy(() => import('./Step2'))
const Step3 = React.lazy(() => import('./Step3'))

export default function FormCaisseImprevue() {
    const { currentStep, steps, setStep, goToNextStep, goToPreviousStep, canGoNext, canGoPrevious, mediator } = useFormCaisseImprevueProvider()
    const formTopRef = React.useRef<HTMLDivElement>(null)

    // Mettre à jour le contexte de navigation du médiateur quand l'étape change
    useEffect(() => {
        mediator.setNavigationContext(currentStep, steps.length, goToNextStep)
    }, [currentStep, steps.length, goToNextStep, mediator])

    // Scroll vers le haut du formulaire quand l'étape change
    useEffect(() => {
        if (formTopRef.current) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                })
            })
        }
    }, [currentStep])

    const getCurrentStepComponent = () => {
        switch (currentStep) {
            case 1:
                return <Step1 />
            case 2:
                return <Step2 />
            case 3:
                return <Step3 />
            default:
                return <Step1 />
        }
    }

    const currentStepData = steps.find(s => s.step === currentStep)

    return (
        <div className="space-y-8 max-w-6xl mx-auto p-6">
            {/* Header */}
            <Card ref={formTopRef} className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-[#224D62]">
                        Nouvelle Demande - Caisse Imprévue
                    </CardTitle>
                    <CardDescription className="text-lg">
                        Créez une nouvelle demande d'aide en 3 étapes simples
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Stepper */}
            <section>
                <div className="mx-auto max-w-4xl space-y-6">
                    <Stepper value={currentStep}>
                        {steps.map((stepData) => (
                            <StepperItem
                                key={stepData.step}
                                step={stepData.step}
                                className="not-last:flex-1"
                            >
                                <StepperTrigger
                                    onClick={() => setStep(stepData.step)}
                                    className="cursor-pointer"
                                >
                                    <StepperIndicator asChild>
                                        {stepData.step}
                                    </StepperIndicator>
                                    <div className="mt-2 text-center hidden sm:block">
                                        <p className="text-sm font-medium">{stepData.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {stepData.description}
                                        </p>
                                    </div>
                                </StepperTrigger>
                                {stepData.step < steps.length && <StepperSeparator />}
                            </StepperItem>
                        ))}
                    </Stepper>

                    {/* Affichage mobile du titre de l'étape courante */}
                    {currentStepData && (
                        <div className="sm:hidden text-center p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm font-medium text-[#224D62]">
                                Étape {currentStepData.step}: {currentStepData.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {currentStepData.description}
                            </p>
                        </div>
                    )}
                </div>
            </section>

            {/* Contenu de l'étape */}
            <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                    <Suspense fallback={
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#224D62]" />
                        </div>
                    }>
                        {getCurrentStepComponent()}
                    </Suspense>
                </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between">
                <Button
                    type="button"
                    variant="outline"
                    onClick={goToPreviousStep}
                    disabled={!canGoPrevious}
                    className="gap-2"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Précédent
                </Button>

                <div className="text-sm text-muted-foreground">
                    Étape {currentStep} sur {steps.length}
                </div>
                <Button
                    type="submit"
                    className={cn("gap-2",
                        currentStep < steps.length ?
                            "bg-[#224D62] hover:bg-[#2c5a73]" :
                            "bg-green-600 hover:bg-green-700"
                    )}
                >
                    {currentStep < steps.length ? "Suivant" : "Soumettre la demande"}
                    {currentStep < steps.length ? <ChevronRight className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
            </div>
        </div>
    )
}
