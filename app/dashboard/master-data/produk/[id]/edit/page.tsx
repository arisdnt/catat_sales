'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

import { formatCurrency } from '@/lib/form-utils'
import { useProdukDetailQuery, useUpdateProdukMutation, type UpdateProdukData } from '@/lib/queries/produk'
import { ArrowLeft, Save, Package, DollarSign, Star, Activity } from 'lucide-react'

const formSchema = z.object({
  nama_produk: z.string().min(1, 'Nama produk harus diisi').max(255, 'Nama produk maksimal 255 karakter'),
  harga_satuan: z.number().min(0, 'Harga satuan harus lebih dari 0'),
  status_produk: z.boolean(),
  is_priority: z.boolean(),
})

type FormData = z.infer<typeof formSchema>

export default function EditProdukPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { toast } = useToast()
  const [productId, setProductId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize product ID from params
  useState(() => {
    params.then(({ id }) => {
      setProductId(parseInt(id))
    })
  })

  // Queries and mutations
  const { data: productResponse, isLoading, error } = useProdukDetailQuery(productId!)
  const updateProduct = useUpdateProdukMutation()

  const product = (productResponse as { data: any })?.data

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama_produk: '',
      harga_satuan: 0,
      status_produk: true,
      is_priority: false,
    },
  })

  // Update form when product data is loaded
  useState(() => {
    if (product) {
      form.reset({
        nama_produk: product.nama_produk,
        harga_satuan: product.harga_satuan,
        status_produk: product.status_produk,
        is_priority: product.is_priority || false,
      })
    }
  })

  const onSubmit = (data: FormData) => {
    if (!productId) return
    
    setIsSubmitting(true)
    updateProduct.mutate(
      { id: productId, data },
      {
        onSuccess: () => {
          router.push(`/dashboard/master-data/produk/${productId}`)
        },
        onSettled: () => {
          setIsSubmitting(false)
        }
      }
    )
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto animate-pulse">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-10 w-10 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-red-600 mb-4">
            {error ? 'Error loading product data' : 'Data produk tidak ditemukan'}
          </div>
          <Button onClick={() => router.back()}>
            Kembali
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Edit Produk</h1>
            <p className="text-sm text-muted-foreground">ID: {product.id_produk}</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Informasi Dasar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="nama_produk"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Produk</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Masukkan nama produk"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="harga_satuan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Harga Satuan</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Masukkan harga satuan"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status_produk"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Status Aktif</FormLabel>
                          <FormDescription>
                            Produk dapat dijual
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_priority"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Prioritas</FormLabel>
                          <FormDescription>
                            Produk prioritas
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
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
        </Form>
      </div>
    </div>
  )
}