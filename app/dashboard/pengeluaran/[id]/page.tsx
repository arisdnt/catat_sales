'use client'

import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Receipt, Calendar, DollarSign, FileText, Camera, Edit, Trash2, Loader2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { motion } from 'framer-motion'
import { formatCurrency } from '@/lib/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1
    }
  }
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4 }
  }
}

export default function ViewPengeluaranPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [imageModalOpen, setImageModalOpen] = useState(false)

  const id = params.id as string

  // Fetch pengeluaran data
  const { data: pengeluaran, isLoading, error } = useQuery({
    queryKey: ['pengeluaran', id],
    queryFn: async () => {
      const response = await apiClient.get(`/admin/pengeluaran/${id}`) as any
      return response.data || response
    },
    enabled: !!id
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await (apiClient as any).delete(`/admin/pengeluaran/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengeluaran'] })
      toast({
        title: 'Berhasil',
        description: 'Pengeluaran berhasil dihapus'
      })
      router.push('/dashboard/pengeluaran')
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Gagal menghapus pengeluaran',
        variant: 'destructive'
      })
    }
  })

  const handleDelete = () => {
    deleteMutation.mutate()
    setShowDeleteDialog(false)
  }

  const handleEdit = () => {
    router.push(`/dashboard/pengeluaran/edit/${id}`)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      
      toast({
        title: 'Berhasil',
        description: 'Bukti foto berhasil diunduh'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal mengunduh bukti foto',
        variant: 'destructive'
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Memuat data pengeluaran...</p>
        </div>
      </div>
    )
  }

  if (error || !pengeluaran) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Data pengeluaran tidak ditemukan</p>
          <Button onClick={() => router.push('/dashboard/pengeluaran')}>
            Kembali ke Daftar Pengeluaran
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <motion.div 
          variants={pageVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
              Detail Pengeluaran
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Informasi lengkap pengeluaran operasional
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </Button>
            <Button
              type="button"
              onClick={() => router.push(`/dashboard/pengeluaran/edit/${id}`)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Button>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div 
          variants={pageVariants}
          initial="hidden"
          animate="visible"
          className="w-full"
        >
          {pengeluaran && (
            <div className="space-y-6">
              {/* Information Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Informasi Pengeluaran */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Informasi Pengeluaran</h2>
                  <div className="space-y-4">
                    <div>
                       <label className="text-sm font-medium text-gray-700">Tanggal</label>
                       <p className="mt-1 text-lg text-gray-900">{formatDate(pengeluaran.tanggal)}</p>
                     </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Jumlah</label>
                      <p className="mt-1 text-lg font-semibold text-red-600">{formatCurrency(pengeluaran.jumlah)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Keterangan</label>
                      <p className="mt-1 text-gray-900">{pengeluaran.keterangan}</p>
                    </div>
                  </div>
                </div>

                {/* Informasi Sistem */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Informasi Sistem</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">ID Pengeluaran</label>
                      <p className="mt-1 text-lg text-gray-900">{pengeluaran.id_pengeluaran}</p>
                    </div>
                    <div>
                       <label className="text-sm font-medium text-gray-700">Dibuat</label>
                       <p className="mt-1 text-gray-900">{pengeluaran.created_at ? new Date(pengeluaran.created_at).toLocaleString('id-ID') : '-'}</p>
                     </div>
                     <div>
                       <label className="text-sm font-medium text-gray-700">Diperbarui</label>
                       <p className="mt-1 text-gray-900">{pengeluaran.updated_at ? new Date(pengeluaran.updated_at).toLocaleString('id-ID') : '-'}</p>
                     </div>
                  </div>
                </div>
              </div>

              {/* Bukti Foto - Full Width */}
              {pengeluaran.url_bukti_foto && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Bukti Foto</h2>
                  <div className="w-full">
                    <img
                       src={pengeluaran.url_bukti_foto}
                       alt="Bukti pengeluaran"
                       className="w-full h-auto max-h-96 object-contain rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                       onClick={() => setImageModalOpen(true)}
                     />
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => downloadImage(pengeluaran.url_bukti_foto, `bukti-pengeluaran-${pengeluaran.id_pengeluaran}.jpg`)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Bukti
                    </Button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex gap-3">
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Hapus
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Image Modal */}
      {imageModalOpen && pengeluaran.url_bukti_foto && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setImageModalOpen(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={pengeluaran.url_bukti_foto}
              alt="Bukti pengeluaran"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setImageModalOpen(false)}
              className="absolute top-4 right-4"
            >
              Tutup
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengeluaran</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus pengeluaran ini? Tindakan ini tidak dapat dibatalkan.
              {pengeluaran.url_bukti_foto && (
                <span className="block mt-2 text-amber-600">
                  Bukti foto yang terkait juga akan dihapus.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                'Hapus'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}