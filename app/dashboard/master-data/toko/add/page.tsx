'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

import { FormField } from '@/components/forms/form-field'
import { tokoSchema, type TokoFormData } from '@/lib/form-utils'
import { ArrowLeft, Save, Store } from 'lucide-react'

const initialData: TokoFormData = {
  nama_toko: '',
  alamat: '',
  desa: '',
  kecamatan: '',
  kabupaten: '',
  pic_nama: '',
  pic_telepon: '',
  link_gmaps: '',
  sales_id: '',
  status: 'aktif'
}

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

export default function AddTokoPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm({
    defaultValues: initialData,
    onSubmit: async ({ value }) => {
      setIsSubmitting(true)
      try {
        const response = await fetch('/api/toko', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(value)
        })

        if (!response.ok) {
          throw new Error('Gagal menyimpan data toko')
        }

        toast({
          title: 'Berhasil',
          description: 'Data toko berhasil disimpan'
        })

        router.push('/dashboard/master-data/toko')
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

  return (
    <div className="p-8">
        <Card className="max-w-4xl mx-auto border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              Informasi Toko
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
                      error={typeof field.state.meta.errors?.[0] === 'string' ? field.state.meta.errors[0] : field.state.meta.errors?.[0]?.message}
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
                      error={typeof field.state.meta.errors?.[0] === 'string' ? field.state.meta.errors[0] : field.state.meta.errors?.[0]?.message}
                      type="select"
                      options={salesOptions}
                      placeholder="Pilih sales"
                      required
                    />
                  )}
                />
              </div>

              <form.Field
                name="alamat"
                validators={{
                  onChange: tokoSchema.shape.alamat
                }}
                children={(field) => (
                  <FormField
                    label="Alamat"
                    name={field.name}
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    error={typeof field.state.meta.errors?.[0] === 'string' ? field.state.meta.errors[0] : field.state.meta.errors?.[0]?.message}
                     type="textarea"
                    placeholder="Masukkan alamat lengkap"
                    required
                  />
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <form.Field
                  name="desa"
                  validators={{
                    onChange: tokoSchema.shape.desa
                  }}
                  children={(field) => (
                    <FormField
                      label="Desa"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={typeof field.state.meta.errors?.[0] === 'string' ? field.state.meta.errors[0] : field.state.meta.errors?.[0]?.message}
                       placeholder="Masukkan nama desa"
                      required
                    />
                  )}
                />

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
                      error={typeof field.state.meta.errors?.[0] === 'string' ? field.state.meta.errors[0] : field.state.meta.errors?.[0]?.message}
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
                      error={typeof field.state.meta.errors?.[0] === 'string' ? field.state.meta.errors[0] : field.state.meta.errors?.[0]?.message}
                       placeholder="Masukkan nama kabupaten"
                      required
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form.Field
                  name="pic_nama"
                  validators={{
                    onChange: tokoSchema.shape.pic_nama
                  }}
                  children={(field) => (
                    <FormField
                      label="Nama PIC"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={typeof field.state.meta.errors?.[0] === 'string' ? field.state.meta.errors[0] : field.state.meta.errors?.[0]?.message}
                       placeholder="Masukkan nama person in charge"
                      required
                    />
                  )}
                />

                <form.Field
                  name="pic_telepon"
                  validators={{
                    onChange: tokoSchema.shape.pic_telepon
                  }}
                  children={(field) => (
                    <FormField
                      label="Telepon PIC"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={typeof field.state.meta.errors?.[0] === 'string' ? field.state.meta.errors[0] : field.state.meta.errors?.[0]?.message}
                       type="tel"
                      placeholder="Contoh: 08123456789"
                      required
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form.Field
                  name="link_gmaps"
                  validators={{
                    onChange: tokoSchema.shape.link_gmaps
                  }}
                  children={(field) => (
                    <FormField
                      label="Link Google Maps"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={typeof field.state.meta.errors?.[0] === 'string' ? field.state.meta.errors[0] : field.state.meta.errors?.[0]?.message}
                       placeholder="https://maps.google.com/..."
                    />
                  )}
                />

                <form.Field
                  name="status"
                  validators={{
                    onChange: tokoSchema.shape.status
                  }}
                  children={(field) => (
                    <FormField
                      label="Status"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={typeof field.state.meta.errors?.[0] === 'string' ? field.state.meta.errors[0] : field.state.meta.errors?.[0]?.message}
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
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}