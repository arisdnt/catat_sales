'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'

interface FormData {
  nama_produk: string
  harga_satuan: number
  is_priority: boolean
  priority_order: number
}

export default function AddProdukPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues: {
      nama_produk: '',
      harga_satuan: 0,
      is_priority: false,
      priority_order: 0
    }
  })

  const isPriority = watch('is_priority')

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true)
      
      const response = await fetch('/api/produk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create product')
      }

      toast({
        title: "Berhasil",
        description: "Produk baru berhasil ditambahkan",
      })

      router.push('/dashboard/master-data/produk')
    } catch (error: any) {
      console.error('Error creating product:', error)
      toast({
        title: "Error",
        description: error.message || "Gagal menambahkan produk",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tambah Produk Baru</h1>
              <p className="text-gray-600 mt-1">Lengkapi form di bawah untuk menambahkan produk baru</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="px-4 py-2"
              >
                Batal
              </Button>
              <Button
                type="submit"
                form="produk-form"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Simpan Produk
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
         <div className="space-y-8">
          <form id="produk-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Product Information Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Save className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Informasi Produk</h3>
                  <p className="text-sm text-gray-600">Masukkan detail produk yang akan ditambahkan</p>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-6 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="nama_produk" className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Produk <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="nama_produk"
                      {...register('nama_produk', { 
                        required: 'Nama produk harus diisi',
                        minLength: {
                          value: 2,
                          message: 'Nama produk minimal 2 karakter'
                        }
                      })}
                      className="border-gray-300 focus:border-blue-500 rounded-lg"
                      placeholder="Masukkan nama produk"
                    />
                    {errors.nama_produk && (
                      <p className="text-red-500 text-sm mt-1">{errors.nama_produk.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="harga_satuan" className="block text-sm font-medium text-gray-700 mb-2">
                      Harga Satuan <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="harga_satuan"
                      type="number"
                      min="0"
                      step="0.01"
                      {...register('harga_satuan', { 
                        required: 'Harga satuan harus diisi',
                        min: {
                          value: 0.01,
                          message: 'Harga satuan harus lebih dari 0'
                        },
                        valueAsNumber: true
                      })}
                      className="border-gray-300 focus:border-blue-500 rounded-lg"
                      placeholder="Masukkan harga satuan"
                    />
                    {errors.harga_satuan && (
                      <p className="text-red-500 text-sm mt-1">{errors.harga_satuan.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Priority Settings Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Pengaturan Priority</h3>
                  <p className="text-sm text-gray-600">Atur apakah produk ini menjadi produk priority</p>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-6 bg-white">
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <Switch
                      id="is_priority"
                      checked={isPriority}
                      onCheckedChange={(checked) => setValue('is_priority', checked)}
                    />
                    <label htmlFor="is_priority" className="text-sm font-medium text-gray-700">
                      Produk Priority
                    </label>
                  </div>
                  <p className="text-sm text-gray-600">
                    Produk priority akan ditampilkan lebih dulu dalam daftar
                  </p>

                  {isPriority && (
                    <div>
                      <label htmlFor="priority_order" className="block text-sm font-medium text-gray-700 mb-2">
                        Urutan Priority
                      </label>
                      <Input
                        id="priority_order"
                        type="number"
                        min="0"
                        {...register('priority_order', { 
                          valueAsNumber: true,
                          min: {
                            value: 0,
                            message: 'Urutan priority tidak boleh negatif'
                          }
                        })}
                        className="border-gray-300 focus:border-blue-500 rounded-lg"
                        placeholder="0"
                      />
                      <p className="text-sm text-gray-600 mt-1">
                        Angka lebih kecil akan ditampilkan lebih dulu (0 = prioritas tertinggi)
                      </p>
                      {errors.priority_order && (
                        <p className="text-red-500 text-sm mt-1">{errors.priority_order.message}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}