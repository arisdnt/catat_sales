'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

import { FormField } from '@/components/forms/form-field'
import { produkSchema, type ProdukFormData } from '@/lib/form-utils'
import { ArrowLeft, Save, Package } from 'lucide-react'

const kategoriOptions = [
  { value: 'Makanan', label: 'Makanan' },
  { value: 'Minuman', label: 'Minuman' },
  { value: 'Kebersihan', label: 'Kebersihan' },
  { value: 'Kesehatan', label: 'Kesehatan' },
  { value: 'Elektronik', label: 'Elektronik' },
  { value: 'Pakaian', label: 'Pakaian' },
  { value: 'Alat Tulis', label: 'Alat Tulis' },
  { value: 'Lainnya', label: 'Lainnya' }
]

export default function EditProdukPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [productId, setProductId] = useState<string>('')

  const form = useForm({
    defaultValues: {
      nama_produk: '',
      harga_satuan: 0,
      kategori: '',
      status_produk: true,
      deskripsi: '' as string | undefined
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true)
      try {
        const response = await fetch(`/api/produk/${productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(value)
        })

        if (!response.ok) {
          throw new Error('Gagal memperbarui data produk')
        }

        toast({
          title: 'Berhasil',
          description: 'Data produk berhasil diperbarui'
        })

        router.push(`/dashboard/master-data/produk/${productId}`)
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Terjadi kesalahan',
          variant: 'destructive'
        })
      } finally {
        setIsSubmitting(false)
      }
    }
  })

  useEffect(() => {
    const initializeParams = async () => {
      const { id } = await params
      setProductId(id)
      fetchProdukData(id)
    }
    initializeParams()
  }, [])

  const fetchProdukData = async (id?: string) => {
    try {
      // Mock data for demo - replace with actual API call
      const mockData = {
        nama_produk: 'Sabun Mandi Lifebuoy',
        harga_satuan: 5000,
        kategori: 'Kebersihan',
        status_produk: true,
        deskripsi: 'Sabun mandi dengan formula antibakteri untuk perlindungan maksimal terhadap kuman dan bakteri.'
      }
      
      // Set form values
      form.setFieldValue('nama_produk', mockData.nama_produk)
      form.setFieldValue('harga_satuan', mockData.harga_satuan)
      form.setFieldValue('kategori', mockData.kategori)
      form.setFieldValue('status_produk', mockData.status_produk)
      form.setFieldValue('deskripsi', mockData.deskripsi)
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal memuat data produk',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto animate-pulse">
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
        <Card className="max-w-4xl mx-auto border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Edit Informasi Produk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                form.handleSubmit()
              }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form.Field
                  name="nama_produk"
                  children={(field) => (
                    <FormField
                      label="Nama Produk"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={field.state.meta.errors?.[0]}
                      placeholder="Masukkan nama produk"
                      required
                    />
                  )}
                />

                <form.Field
                  name="kategori"
                  children={(field) => (
                    <FormField
                      label="Kategori"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={field.state.meta.errors?.[0]}
                      type="select"
                      options={kategoriOptions}
                      placeholder="Pilih kategori"
                      required
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form.Field
                  name="harga_satuan"
                  children={(field) => (
                    <FormField
                      label="Harga Satuan"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={field.state.meta.errors?.[0]}
                      type="currency"
                      placeholder="0"
                      min={0}
                      required
                    />
                  )}
                />

                <form.Field
                  name="status_produk"
                  children={(field) => (
                    <FormField
                      label="Status Produk Aktif"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={field.state.meta.errors?.[0]}
                      type="checkbox"
                    />
                  )}
                />
              </div>

              <form.Field
                name="deskripsi"
                children={(field) => (
                  <FormField
                    label="Deskripsi"
                    name={field.name}
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    error={field.state.meta.errors?.[0]}
                    type="textarea"
                    placeholder="Masukkan deskripsi produk (opsional)"
                    rows={4}
                  />
                )}
              />

              <div className="flex items-center justify-end gap-4 pt-6 border-t">
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
                  disabled={isSubmitting || !form.state.isValid}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
    </div>
  )
}