"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, X, FileImage, AlertCircle, FileText } from 'lucide-react'

interface FileInputProps {
  accept?: string
  maxSize?: number // en MB
  onFileSelect: (file: File | undefined) => void
  disabled?: boolean
  label?: string
  placeholder?: string
  className?: string
  currentFile?: File | undefined
  resetKey?: number
}

export default function FileInput({
  accept = "image/*",
  maxSize = 5,
  onFileSelect,
  disabled = false,
  label = "Sélectionner un fichier",
  placeholder = "Glissez-déposez un fichier ici ou cliquez pour parcourir",
  className = "",
  currentFile,
  resetKey = 0
}: FileInputProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [internalFile, setInternalFile] = useState<File | undefined>(currentFile)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Réinitialiser l'état interne quand resetKey change
  useEffect(() => {
    setInternalFile(undefined)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [resetKey])

  // Synchroniser l'état interne avec currentFile
  useEffect(() => {
    setInternalFile(currentFile)
    if (currentFile) {
      setError(null)
    }
  }, [currentFile])

  const validateFile = useCallback((file: File): string | null => {
    if (maxSize && file.size > maxSize * 1024 * 1024) {
      return `Le fichier est trop volumineux. Taille maximale : ${maxSize}MB`
    }
    
    if (accept && accept !== "*") {
      const acceptedTypes = accept.split(',').map(type => type.trim())
      const isValidType = acceptedTypes.some(type => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.replace('/*', ''))
        }
        if (type === '.pdf') {
          // Accepter les différents types MIME pour PDF
          return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
        }
        return file.type === type
      })
      
      if (!isValidType) {
        return `Type de fichier non supporté. Types acceptés : ${accept}`
      }
    }
    
    return null
  }, [accept, maxSize])

  const handleFileSelect = useCallback((file: File) => {
    setError(null)
    const validationError = validateFile(file)
    
    if (validationError) {
      setError(validationError)
      setInternalFile(undefined)
      onFileSelect(undefined)
      return
    }
    
    // Mettre à jour l'état interne et notifier le parent
    setInternalFile(file)
    onFileSelect(file)
  }, [validateFile, onFileSelect])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [disabled])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  const handleRemoveFile = useCallback(() => {
    setInternalFile(undefined)
    onFileSelect(undefined)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setError(null)
  }, [onFileSelect])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Utiliser l'état interne pour l'affichage
  const displayFile = internalFile || currentFile

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer
          ${isDragOver 
            ? 'border-[#234D65] bg-[#234D65]/5' 
            : 'border-gray-300 hover:border-[#234D65] hover:bg-gray-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${error ? 'border-red-300 bg-red-50' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />
        
        {displayFile ? (
          // Affichage du fichier sélectionné
          <div className="space-y-3">
            <div className="flex items-center justify-center">
              {displayFile.type === 'application/pdf' ? (
                <FileText className="w-12 h-12 text-[#234D65]" />
              ) : (
                <FileImage className="w-12 h-12 text-[#234D65]" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900 truncate" title={displayFile.name}>
                {displayFile.name.length > 30 
                  ? `${displayFile.name.slice(0, 27)}...` 
                  : displayFile.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(displayFile.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleRemoveFile()
              }}
              disabled={disabled}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors duration-200"
            >
              <X className="w-4 h-4" />
              Supprimer
            </button>
          </div>
        ) : (
          // Zone de drop vide
          <div className="space-y-3">
            <Upload className={`mx-auto w-12 h-12 ${error ? 'text-red-400' : 'text-gray-400'}`} />
            <div className="space-y-1">
              <p className={`text-sm font-medium ${error ? 'text-red-600' : 'text-gray-600'}`}>
                {placeholder}
              </p>
              <p className="text-xs text-gray-500">
                Types acceptés : {accept === "image/*" ? "Images (JPG, PNG, WebP)" : accept}
                {maxSize && ` • Taille max : ${maxSize}MB`}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
} 