'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

import { FormField } from '@/components/forms/form-field'
import { tokoSchema, type TokoFormData } from '@/lib/form-utils'
import { ArrowLeft, Save, Store } from 'lucide-react'

const salesOptions = [
  { value: '1', label: 'Ahmad Susanto' },
  { value: '2', label: 'Budi Santoso' },
  { value: '3', label: 'Citra Dewi' },
  { value: '4', label: 'Denny Prasetyo' },
  { value: '5', label: 'Eka Sari' }
]

const statusOptions = [
  { value: 'aktif', label: 'Aktif' },
  { value: 'nonaktif', label: 'Nonaktif' }
]

export default function EditTokoPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [itemId, setItemId] = useState<string>('')

  const form = useForm({
    defaultValues: {
      nama_toko: '',
      kecamatan: '',
      kabupaten: '',
      no_telepon: '',
      link_gmaps: '',
      sales_id: '',
      status: 'aktif' as const
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true)
      try {
        const response = await fetch(`/api/toko/${itemId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(value)
        })

        if (!response.ok) {
          throw new Error('Gagal memperbarui data toko')
        }

        toast({
          title: 'Berhasil',
          description: 'Data toko berhasil diperbarui'
        })

        router.push(`/dashboard/master-data/toko/${itemId}`)
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
      setItemId(id)
      fetchTokoData(id)
    }
    initializeParams()
  }, [])

  const fetchTokoData = async (id?: string) => {
    try {
      // Mock data for demo - replace with actual API call
      const mockData = {
        nama_toko: 'Toko Berkah Jaya 1',
        kecamatan: 'Kec. Sukamaju',
        kabupaten: 'Kab. Sukabumi',
        no_telepon: '081234567890',
        link_gmaps: 'https://goo.gl/maps/example1',
        sales_id: '1',
        status: 'aktif' as const
      }
      
      // Set form values
      form.setFieldValue('nama_toko', mockData.nama_toko)
      form.setFieldValue('kecamatan', mockData.kecamatan)
      form.setFieldValue('kabupaten', mockData.kabupaten)
      form.setFieldValue('no_telepon', mockData.no_telepon)
      form.setFieldValue('link_gmaps', mockData.link_gmaps)
      form.setFieldValue('sales_id', mockData.sales_id)
      form.setFieldValue('status', mockData.status)
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal memuat data toko',
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
              <Store className="w-5 h-5" />
              Edit Informasi Toko
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
                  name="nama_toko"
                  validators={{
                    onChange: tokoSchema.shape.nama_toko
                  }}
                  children={(field) => (
                    <FormField
                      label="Nama Toko"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={field.state.meta.errors?.[0]?.message}
                      placeholder="Masukkan nama toko"
                      required
                    />
                  )}
                />

                <form.Field
                  name="sales_id"
                  validators={{
                    onChange: tokoSchema.shape.sales_id
                  }}
                  children={(field) => (
                    <FormField
                      label="Sales"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={field.state.meta.errors?.[0]?.message}
                      type="select"
                      options={salesOptions}
                      placeholder="Pilih sales"
                      required
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form.Field
                  name="kecamatan"
                  validators={{
                    onChange: tokoSchema.shape.kecamatan
                  }}
                  children={(field) => (
                    <FormField
                      label="Kecamatan"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={field.state.meta.errors?.[0]?.message}
                      placeholder="Masukkan nama kecamatan"
                      required
                    />
                  )}
                />

                <form.Field
                  name="kabupaten"
                  validators={{
                    onChange: tokoSchema.shape.kabupaten
                  }}
                  children={(field) => (
                    <FormField
                      label="Kabupaten"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={field.state.meta.errors?.[0]?.message}
                      placeholder="Masukkan nama kabupaten"
                      required
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form.Field
                  name="no_telepon"
                  validators={{
                    onChange: tokoSchema.shape.no_telepon
                  }}
                  children={(field) => (
                    <FormField
                      label="No. Telepon"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={field.state.meta.errors?.[0]?.message}
                      placeholder="Contoh: 081234567890"
                      type="tel"
                    />
                  )}
                />

                <form.Field
                  name="link_gmaps"
                  children={(field) => (
                    <FormField
                      label="Link Google Maps"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      placeholder="https://maps.google.com/..."
                    />
                  )}
                />

                <form.Field
                  name="status"
                  children={(field) => (
                    <FormField
                      label="Status"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      type="select"
                      options={statusOptions}
                      required
                    />
                  )}
                />
              </div>

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
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
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