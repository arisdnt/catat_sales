'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, X, Receipt, Calendar, DollarSign, FileText, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { useCreatePengeluaran } from '@/lib/queries/pengeluaran'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { formatCurrency } from '@/lib/utils'

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

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4 }
  }
}

export default function CreatePengeluaranPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const createMutation = useCreatePengeluaran()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch
  } = useForm<PengeluaranFormData>({
    resolver: zodResolver(pengeluaranSchema),
    defaultValues: {
      tanggal_pengeluaran: new Date().toISOString().split('T')[0]
    }
  })

  const bukti_foto = watch('bukti_foto')
  const jumlah = watch('jumlah')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Error',
          description: 'File harus berupa gambar',
          variant: 'destructive'
        })
        return
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'Ukuran file maksimal 5MB',
          variant: 'destructive'
        })
        return
      }

      setValue('bukti_foto', file)
      
      // Create preview URL
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const removeFile = () => {
    setValue('bukti_foto', undefined)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  const onSubmit = async (data: PengeluaranFormData) => {
    try {
      // Create FormData object
      const formData = new FormData()
      formData.append('jumlah', data.jumlah.toString())
      formData.append('keterangan', data.keterangan)
      formData.append('tanggal_pengeluaran', new Date(data.tanggal_pengeluaran).toISOString())
      
      if (data.bukti_foto) {
        formData.append('bukti_foto', data.bukti_foto)
      }

      await createMutation.mutateAsync(formData)

      toast({
        title: 'Berhasil',
        description: 'Pengeluaran berhasil ditambahkan'
      })

      router.push('/dashboard/pengeluaran')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal menambahkan pengeluaran',
        variant: 'destructive'
      })
    }
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Tambah Pengeluaran</h1>
            <p className="text-gray-600 text-sm sm:text-base">Tambahkan pengeluaran operasional baru dengan detail yang akurat</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex items-center gap-2 border-gray-300 hover:bg-gray-50"
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

        {/* Form Card */}
        <motion.div 
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50">
              <CardTitle className="flex items-center gap-2 text-red-900">
                <Receipt className="w-5 h-5" />
                Form Pengeluaran Operasional
              </CardTitle>
              <CardDescription className="text-red-700">
                Lengkapi informasi pengeluaran operasional dengan detail yang akurat
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 lg:p-8">
            <form id="pengeluaran-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6 lg:space-y-8">
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
                  {!bukti_foto && (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                      <div className="mt-4">
                        <Label htmlFor="bukti_foto" className="cursor-pointer">
                          <span className="text-sm font-medium text-primary hover:text-primary/80">
                            Pilih file gambar
                          </span>
                          <Input
                            id="bukti_foto"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </Label>
                        <p className="text-xs text-muted-foreground mt-2">
                          PNG, JPG, JPEG hingga 5MB
                        </p>
                      </div>
                    </div>
                  )}

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
                  type="submit"
                  form="pengeluaran-form"
                  disabled={isSubmitting || !jumlah}
                  className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 px-6 shadow-lg min-w-[140px]"
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Pengeluaran'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  </div>
  )
}