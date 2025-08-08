'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Upload, X, Receipt, Calendar, DollarSign, FileText, Camera, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { formatCurrency } from '@/lib/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

const pengeluaranSchema = z.object({
  jumlah: z.number().min(1, 'Jumlah harus lebih dari 0'),
  keterangan: z.string().min(1, 'Keterangan wajib diisi'),
  tanggal_pengeluaran: z.string().min(1, 'Tanggal wajib diisi'),
  bukti_foto: z.instanceof(File).optional()
})

type PengeluaranFormData = z.infer<typeof pengeluaranSchema>

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

export default function EditPengeluaranPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)

  const id = params.id as string

  // Fetch existing data
  const { data: pengeluaran, isLoading: isLoadingData } = useQuery({
    queryKey: ['pengeluaran', id],
    queryFn: async () => {
      const response = await apiClient.get(`/admin/pengeluaran/${id}`) as any
      return response.data || response
    },
    enabled: !!id
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset
  } = useForm<PengeluaranFormData>({
    resolver: zodResolver(pengeluaranSchema)
  })

  const bukti_foto = watch('bukti_foto')
  const jumlah = watch('jumlah')

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const headers = await apiClient.getAuthHeadersPublic()
      
      const response = await fetch(`/api/admin/pengeluaran/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': headers.Authorization,
          // Don't set Content-Type for FormData - browser will set it automatically with boundary
        },
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update pengeluaran')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengeluaran'] })
      toast({
        title: 'Berhasil',
        description: 'Pengeluaran berhasil diperbarui'
      })
      router.push('/dashboard/pengeluaran')
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memperbarui pengeluaran',
        variant: 'destructive'
      })
    }
  })

  // Set form data when pengeluaran data is loaded
  useEffect(() => {
    if (pengeluaran) {
      const tanggalFormatted = new Date(pengeluaran.tanggal_pengeluaran).toISOString().split('T')[0]
      reset({
        jumlah: pengeluaran.jumlah,
        keterangan: pengeluaran.keterangan,
        tanggal_pengeluaran: tanggalFormatted
      })
      
      if (pengeluaran.url_bukti_foto) {
        setExistingImageUrl(pengeluaran.url_bukti_foto)
      }
    }
  }, [pengeluaran, reset])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg']
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Error',
          description: 'Tipe file tidak didukung. Gunakan JPEG, PNG, atau JPG.',
          variant: 'destructive'
        })
        return
      }

      // Validate file size (5MB)
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        toast({
          title: 'Error',
          description: 'Ukuran file terlalu besar. Maksimal 5MB.',
          variant: 'destructive'
        })
        return
      }

      setValue('bukti_foto', file)
      
      // Create preview URL
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setExistingImageUrl(null) // Hide existing image when new file is selected
    }
  }

  const removeFile = () => {
    setValue('bukti_foto', undefined)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    // Show existing image again if available
    if (pengeluaran?.url_bukti_foto) {
      setExistingImageUrl(pengeluaran.url_bukti_foto)
    }
  }

  const onSubmit = async (data: PengeluaranFormData) => {
    const formData = new FormData()
    formData.append('jumlah', data.jumlah.toString())
    formData.append('keterangan', data.keterangan)
    formData.append('tanggal_pengeluaran', new Date(data.tanggal_pengeluaran).toISOString())
    
    if (data.bukti_foto) {
      formData.append('bukti_foto', data.bukti_foto)
    }

    await updateMutation.mutateAsync(formData)
  }

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Memuat data pengeluaran...</p>
        </div>
      </div>
    )
  }

  if (!pengeluaran) {
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Edit Pengeluaran</h1>
            <p className="text-gray-600 text-sm sm:text-base">Perbarui data pengeluaran operasional</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Batal
            </Button>
            {jumlah && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Total Pengeluaran</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(jumlah)}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Form */}
        <motion.div 
          variants={pageVariants}
          initial="hidden"
          animate="visible"
          className="w-full"
        >
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Tanggal */}
              <div className="space-y-2">
                <Label htmlFor="tanggal_pengeluaran" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Tanggal Pengeluaran
                </Label>
                <Input
                  id="tanggal_pengeluaran"
                  type="date"
                  {...register('tanggal_pengeluaran')}
                  className={errors.tanggal_pengeluaran ? 'border-red-500' : ''}
                />
                {errors.tanggal_pengeluaran && (
                  <p className="text-sm text-red-500">{errors.tanggal_pengeluaran.message}</p>
                )}
              </div>

              {/* Jumlah */}
              <div className="space-y-2">
                <Label htmlFor="jumlah" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Jumlah Pengeluaran
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    Rp
                  </span>
                  <Input
                    id="jumlah"
                    type="number"
                    step="1000"
                    placeholder="0"
                    {...register('jumlah', { valueAsNumber: true })}
                    className={`pl-10 ${errors.jumlah ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.jumlah && (
                  <p className="text-sm text-red-500">{errors.jumlah.message}</p>
                )}
                {jumlah && (
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(jumlah)}
                  </p>
                )}
              </div>

              {/* Keterangan */}
              <div className="space-y-2">
                <Label htmlFor="keterangan" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Keterangan
                </Label>
                <Textarea
                  id="keterangan"
                  placeholder="Masukkan detail keterangan pengeluaran..."
                  rows={4}
                  {...register('keterangan')}
                  className={errors.keterangan ? 'border-red-500' : ''}
                />
                {errors.keterangan && (
                  <p className="text-sm text-red-500">{errors.keterangan.message}</p>
                )}
              </div>

              {/* Bukti Foto */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Bukti Foto (Opsional)
                </Label>
                <div className="space-y-4">
                  {/* Show existing image if no new file selected */}
                  {existingImageUrl && !previewUrl && (
                    <div className="relative inline-block">
                      <img
                        src={existingImageUrl}
                        alt="Bukti pengeluaran saat ini"
                        className="max-w-full max-h-64 rounded-lg border shadow-sm"
                      />
                      <p className="text-sm text-gray-500 mt-2">Bukti foto saat ini</p>
                    </div>
                  )}

                  {/* File upload area */}
                  {!bukti_foto && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <Upload className="mx-auto h-8 w-8 text-gray-400" />
                      <div className="mt-2">
                        <Label htmlFor="bukti_foto" className="cursor-pointer">
                          <span className="text-sm font-medium text-blue-600 hover:text-blue-500">
                            {existingImageUrl ? 'Ganti foto' : 'Pilih file gambar'}
                          </span>
                          <Input
                            id="bukti_foto"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </Label>
                        <p className="text-xs text-gray-500 mt-1">
                          PNG, JPG, JPEG hingga 5MB
                        </p>
                      </div>
                    </div>
                  )}

                  {/* New file preview */}
                  {previewUrl && (
                    <div className="relative inline-block">
                      <img
                        src={previewUrl}
                        alt="Preview bukti pengeluaran"
                        className="max-w-full max-h-64 rounded-lg border shadow-sm"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={removeFile}
                        className="absolute -top-2 -right-2 h-8 w-8 rounded-full p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-[140px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Receipt className="w-4 h-4 mr-2" />
                      Perbarui Pengeluaran
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}