'use client'

import { Check, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  id: number
  key: string
  title: string
  icon: LucideIcon
  color: string
}

interface StepIndicatorV2Props {
  steps: readonly Step[]
  currentStep: number
  completedSteps: Set<number>
  onStepClick?: (step: number) => void
}

export default function StepIndicatorV2({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
}: StepIndicatorV2Props) {
  return (
    <div className="flex items-center justify-between gap-2 px-2 sm:px-0 animate-in fade-in-0 duration-500 delay-150">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.has(step.id)
        const isCurrent = currentStep === step.id
        const isClickable = isCompleted || isCurrent
        const Icon = step.icon

        return (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step circle */}
            <button
              type="button"
              onClick={() => isClickable && onStepClick?.(step.id)}
              disabled={!isClickable}
              className={cn(
                "relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all duration-300",
                isCompleted && "bg-gradient-to-br from-[#CBB171] to-[#CBB171]/80 text-white shadow-lg shadow-[#CBB171]/20",
                isCurrent && !isCompleted && "bg-gradient-to-br from-[#224D62] to-[#224D62]/80 text-white shadow-lg shadow-[#224D62]/20",
                !isCurrent && !isCompleted && "bg-slate-100 text-slate-400",
                isClickable && "cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-[#224D62]/20 hover:scale-105 active:scale-95",
                !isClickable && "cursor-not-allowed"
              )}
            >
              {isCompleted ? (
                <Check className="w-5 h-5 animate-in zoom-in-50 duration-200" />
              ) : (
                <Icon className="w-5 h-5" />
              )}

              {/* Pulse effect for current step */}
              {isCurrent && !isCompleted && (
                <div className="absolute inset-0 rounded-full bg-[#224D62]/20 animate-ping" />
              )}
            </button>

            {/* Step label */}
            <div className="hidden sm:block ml-3 min-w-0">
              <p className={cn(
                "text-xs font-medium truncate transition-colors",
                isCurrent && "text-[#224D62]",
                isCompleted && "text-[#CBB171]",
                !isCurrent && !isCompleted && "text-slate-400"
              )}>
                Étape {step.id}
              </p>
              <p className={cn(
                "text-sm font-semibold truncate transition-colors",
                isCurrent && "text-[#224D62]",
                isCompleted && "text-slate-700",
                !isCurrent && !isCompleted && "text-slate-400"
              )}>
                {step.title}
              </p>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 sm:mx-4 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full bg-gradient-to-r from-[#CBB171] to-[#224D62] transition-all duration-500",
                    isCompleted ? "w-full" : "w-0"
                  )}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
