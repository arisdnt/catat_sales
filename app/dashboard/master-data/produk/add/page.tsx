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
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Tambah Produk Baru</h1>
          <p className="text-muted-foreground">
            Lengkapi form di bawah untuk menambahkan produk baru
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Produk</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nama_produk">
                  Nama Produk <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nama_produk"
                  {...register('nama_produk', { 
                    required: 'Nama produk harus diisi',
                    minLength: {
                      value: 2,
                      message: 'Nama produk minimal 2 karakter'
                    }
                  })}
                  placeholder="Masukkan nama produk"
                />
                {errors.nama_produk && (
                  <p className="text-sm text-red-500">{errors.nama_produk.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="harga_satuan">
                  Harga Satuan <span className="text-red-500">*</span>
                </Label>
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
                  placeholder="Masukkan harga satuan"
                />
                {errors.harga_satuan && (
                  <p className="text-sm text-red-500">{errors.harga_satuan.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Switch
                  id="is_priority"
                  checked={isPriority}
                  onCheckedChange={(checked) => setValue('is_priority', checked)}
                />
                <Label htmlFor="is_priority" className="text-sm font-medium">
                  Produk Priority
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Produk priority akan ditampilkan lebih dulu dalam daftar
              </p>

              {isPriority && (
                <div className="space-y-2">
                  <Label htmlFor="priority_order">
                    Urutan Priority
                  </Label>
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
                    placeholder="0"
                  />
                  <p className="text-sm text-muted-foreground">
                    Angka lebih kecil akan ditampilkan lebih dulu (0 = prioritas tertinggi)
                  </p>
                  {errors.priority_order && (
                    <p className="text-sm text-red-500">{errors.priority_order.message}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Simpan Produk
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}