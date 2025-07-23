'use client'

import { useState, useEffect } from 'react'
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
  status_produk: boolean
  is_priority: boolean
  priority_order: number
}

interface ProdukEditPageProps {
  params: Promise<{ id: string }>
}

export default function EditProdukPage({ params }: ProdukEditPageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [productId, setProductId] = useState<number | null>(null)

  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params
      setProductId(parseInt(resolvedParams.id))
    }
    initializeParams()
  }, [params])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues: {
      nama_produk: '',
      harga_satuan: 0,
      status_produk: true,
      is_priority: false,
      priority_order: 0
    }
  })

  const isPriority = watch('is_priority')

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/produk/${productId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch product')
        }

        const product = await response.json()
        reset({
          nama_produk: product.nama_produk,
          harga_satuan: product.harga_satuan,
          status_produk: product.status_produk,
          is_priority: product.is_priority,
          priority_order: product.priority_order
        })
      } catch (error) {
        console.error('Error fetching product:', error)
        toast({
          title: "Error",
          description: "Gagal memuat data produk",
          variant: "destructive",
        })
        router.back()
      } finally {
        setIsLoading(false)
      }
    }

    if (productId && !isNaN(productId)) {
      fetchProduct()
    } else {
      router.back()
    }
  }, [productId, router, toast, reset])

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true)
      
      const response = await fetch(`/api/produk/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update product')
      }

      toast({
        title: "Berhasil",
        description: "Data produk berhasil diperbarui",
      })

      router.push('/dashboard/master-data/produk')
    } catch (error: any) {
      console.error('Error updating product:', error)
      toast({
        title: "Error",
        description: error.message || "Gagal memperbarui produk",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
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
          <h1 className="text-3xl font-bold">Edit Produk</h1>
          <p className="text-muted-foreground">
            Perbarui informasi produk
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
                  id="status_produk"
                  checked={watch('status_produk')}
                  onCheckedChange={(checked) => setValue('status_produk', checked)}
                />
                <Label htmlFor="status_produk" className="text-sm font-medium">
                  Status Aktif
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Produk yang tidak aktif tidak akan muncul dalam transaksi baru
              </p>
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
                    Simpan Perubahan
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