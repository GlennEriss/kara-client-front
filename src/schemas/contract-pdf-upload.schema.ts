import { z } from 'zod'

export const contractPdfUploadSchema = z.object({
  contractPdf: z.object({
    file: z.instanceof(File, {
      message: 'Veuillez sélectionner un fichier PDF'
    }).refine(
      (file) => file.type === 'application/pdf',
      {
        message: 'Le fichier doit être au format PDF'
      }
    ).refine(
      (file) => file.size <= 10 * 1024 * 1024, // 10MB
      {
        message: 'La taille du fichier ne doit pas dépasser 10MB'
      }
    ),
    originalFileName: z.string().min(1, 'Le nom du fichier est requis'),
    fileSize: z.number().min(0, 'La taille du fichier est requise'),
    path: z.string().optional(),
    url: z.string().optional()
  })
})

export type ContractPdfUploadFormData = z.infer<typeof contractPdfUploadSchema>
