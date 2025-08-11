"use client"
import React, { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { jobSchema, type JobFormData } from '@/types/schemas'
import { useJobs, useJobMutations } from '@/hooks/useJobs'
import { toast } from 'sonner'
import { Plus, Search, Edit3, Trash2, Briefcase, RefreshCw } from 'lucide-react'

function JobSkeleton() {
    return (
        <Card className="h-full">
            <CardContent className="p-4">
                <div className="animate-pulse space-y-3">
                    <div className="h-5 w-2/3 bg-gray-200 rounded" />
                    <div className="h-4 w-1/2 bg-gray-200 rounded" />
                    <div className="h-3 w-1/3 bg-gray-100 rounded" />
                </div>
            </CardContent>
        </Card>
    )
}

export default function JobsList() {
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(12)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [jobToDelete, setJobToDelete] = useState<{ id: string; name: string } | null>(null)
    const [editingJob, setEditingJob] = useState<{ id: string; name: string; description?: string } | null>(null)

    const filters = useMemo(() => ({ search: search.trim() || undefined }), [search])
    const { data, isLoading, error, refetch } = useJobs(filters, page, limit)
    const { create, update, remove } = useJobMutations()

    const form = useForm<JobFormData>({ resolver: zodResolver(jobSchema), defaultValues: { name: '', description: '' } })

    const openCreate = () => {
        setEditingJob(null)
        form.reset({ name: '', description: '' })
        setIsCreateOpen(true)
    }

    const openEdit = (job: { id: string; name: string; description?: string }) => {
        setEditingJob(job)
        form.reset({ name: job.name, description: job.description || '' })
        setIsCreateOpen(true)
    }

    const submitJob = async (values: JobFormData) => {
        try {
            if (editingJob) {
                await update.mutateAsync({ id: editingJob.id, updates: values })
                toast.success('Job mis à jour')
            } else {
                // Remplacer 'adminId' par l'ID admin réel
                await create.mutateAsync({ name: values.name, adminId: 'admin' as any, description: values.description })
                toast.success('Job créé')
            }
            setIsCreateOpen(false)
            await refetch()
        } catch (e) {
            toast.error("Erreur lors de l'enregistrement du job")
        }
    }

    const confirmDelete = async () => {
        if (!jobToDelete) return
        try {
            await remove.mutateAsync(jobToDelete.id)
            toast.success('Job supprimé')
            setIsDeleteOpen(false)
            setJobToDelete(null)
            await refetch()
        } catch (e) {
            toast.error('Erreur lors de la suppression')
        }
    }

    const stats = useMemo(() => {
        const total = data?.pagination.totalItems ?? 0
        return { total }
    }, [data])

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
                        Gestion des Jobs
                    </h1>
                    <p className="text-gray-600 mt-1">{stats.total.toLocaleString()} jobs au total</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="h-9">
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Actualiser
                    </Button>
                    <Button size="sm" onClick={openCreate} className="h-9 bg-[#234D65] hover:bg-[#234D65]/90 text-white">
                        <Plus className="h-4 w-4 mr-2" /> Nouveau Job
                    </Button>
                </div>
            </div>

            {/* Filtres */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex gap-2 items-center">
                        <div className="relative max-w-sm w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value) }} placeholder="Rechercher par nom..." className="pl-9" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Liste */}
            {error ? (
                (() => {
                    console.error('Erreur chargement jobs:', error); return (
                        <Alert variant="destructive">
                            <AlertDescription>
                                Une erreur est survenue lors du chargement des jobs
                            </AlertDescription>
                        </Alert>
                    )
                })()
            ) : isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: limit }).map((_, i) => (<JobSkeleton key={i} />))}
                </div>
            ) : (data && data.data.length > 0) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {data.data.map((job) => (
                        <Card key={job.id} className="h-full hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center"><Briefcase className="w-4 h-4 text-blue-600" /></div>
                                        <div>
                                            <div className="font-medium text-gray-900">{job.name}</div>
                                        </div>
                                    </div>
                                </div>
                                {job.description && (<p className="text-sm text-gray-600 line-clamp-2">{job.description}</p>)}
                                <div className="mt-4 flex items-center justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => openEdit({ id: job.id, name: job.name, description: job.description })} className="h-8 w-8 p-0"><Edit3 className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="sm" onClick={() => { setJobToDelete({ id: job.id, name: job.name }); setIsDeleteOpen(true) }} className="h-8 w-8 p-0 text-red-600 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="text-center py-12">
                        Aucun job trouvé
                    </CardContent>
                </Card>
            )}

            {/* Pagination */}
            {data && data.pagination.totalItems > limit && (
                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="text-sm text-gray-600">Page {data.pagination.currentPage} / {data.pagination.totalPages} • {data.pagination.totalItems} résultats</div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" disabled={!data.pagination.hasPrevPage} onClick={() => setPage((p) => Math.max(1, p - 1))}>Précédent</Button>
                            <Button variant="outline" size="sm" disabled={!data.pagination.hasNextPage} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Modal création / édition */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingJob ? 'Modifier un job' : 'Nouveau job'}</DialogTitle>
                        <DialogDescription>Renseignez les informations du job</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(submitJob)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nom</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Nom du job" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Description (optionnel)" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
                                <Button type="submit">Enregistrer</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Confirmation suppression */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmer la suppression</DialogTitle>
                        <DialogDescription>Supprimer définitivement "{jobToDelete?.name}" ?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Annuler</Button>
                        <Button variant="destructive" onClick={confirmDelete}>Supprimer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

