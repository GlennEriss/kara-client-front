"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-900 group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg",
          description: "group-[.toast]:text-gray-600",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:!bg-green-50 group-[.toaster]:!text-green-900 group-[.toaster]:!border-green-200 group-[.toast]:!shadow-green-100/50",
          error: "group-[.toaster]:!bg-red-50 group-[.toaster]:!text-red-900 group-[.toaster]:!border-red-200 group-[.toast]:!shadow-red-100/50",
          warning: "group-[.toaster]:!bg-orange-50 group-[.toaster]:!text-orange-900 group-[.toaster]:!border-orange-200 group-[.toast]:!shadow-orange-100/50",
          info: "group-[.toaster]:!bg-blue-50 group-[.toaster]:!text-blue-900 group-[.toaster]:!border-blue-200 group-[.toast]:!shadow-blue-100/50",
          loading: "group-[.toaster]:!bg-gray-50 group-[.toaster]:!text-gray-900 group-[.toaster]:!border-gray-200 group-[.toast]:!shadow-gray-100/50",
        },
      }}
      style={{
        "--normal-bg": "hsl(var(--background))",
        "--normal-text": "hsl(var(--foreground))",
        "--normal-border": "hsl(var(--border))",
        "--success-bg": "#f0fdf4",
        "--success-text": "#166534",
        "--success-border": "#bbf7d0",
        "--error-bg": "#fef2f2", 
        "--error-text": "#991b1b",
        "--error-border": "#fecaca",
        "--warning-bg": "#fffbeb",
        "--warning-text": "#9a3412",
        "--warning-border": "#fed7aa",
        "--info-bg": "#eff6ff",
        "--info-text": "#1e40af",
        "--info-border": "#dbeafe",
      } as React.CSSProperties}
      position="bottom-right"
      expand={false}
      visibleToasts={5}
      duration={4000}
      richColors
      closeButton
      {...props}
    />
  )
}

export { Toaster }
