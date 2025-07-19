'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from '@tanstack/react-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import { FormField } from '@/components/forms/form-field'
import { tokoSchema, type TokoFormData } from '@/lib/form-utils'
import { useTokoDetailQuery, useUpdateTokoMutation, useSalesQuery } from '@/lib/queries/toko'
import { Save, Store } from 'lucide-react'

const statusOptions = [
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Non-aktif' }
]

export default function EditTokoPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [tokoId, setTokoId] = useState<number | null>(null)

  // Initialize params
  useState(() => {
    params.then(({ id }) => {
      setTokoId(parseInt(id))
    })
  })

  const { data: tokoResponse, isLoading } = useTokoDetailQuery(tokoId!)
  const { data: salesResponse } = useSalesQuery()
  const updateToko = useUpdateTokoMutation()

  const toko: { id_toko: number; nama_toko: string; kecamatan: string; kabupaten: string; status_toko: boolean; sales_id: number; no_telepon?: string; link_gmaps?: string } = (tokoResponse as { data: any })?.data
  const salesData: { id_sales: number; nama_sales: string }[] = (salesResponse as { data: any[] })?.data || []
  const salesOptions = salesData.map(s => ({ value: s.id_sales.toString(), label: s.nama_sales }))

  const form = useForm({
    defaultValues: {
      nama_toko: toko?.nama_toko || '',
      kecamatan: toko?.kecamatan || '',
      kabupaten: toko?.kabupaten || '',
      no_telepon: toko?.no_telepon || '',
      link_gmaps: toko?.link_gmaps || '',
      sales_id: toko?.sales_id || '',
      status_toko: toko?.status_toko ?? true
    },
    onSubmit: async ({ value }) => {
      if (tokoId) {
        const updateData = {
          ...value,
          status_toko: Boolean(value.status_toko),
          id_sales: parseInt(value.sales_id as string)
        }
        updateToko.mutate(
          { id: tokoId, data: updateData },
          {
            onSuccess: () => {
              router.push(`/dashboard/master-data/toko/${tokoId}`)
            }
          }
        )
      }
    }
  })

  // Update form values when toko data loads
  useState(() => {
    if (toko) {
      form.setFieldValue('nama_toko', toko.nama_toko)
      form.setFieldValue('kecamatan', toko.kecamatan)
      form.setFieldValue('kabupaten', toko.kabupaten)
      form.setFieldValue('no_telepon', toko.no_telepon || '')
      form.setFieldValue('link_gmaps', toko.link_gmaps || '')
      form.setFieldValue('sales_id', toko.sales_id.toString())
      form.setFieldValue('status_toko', Boolean(toko.status_toko))
    }
  })

  if (isLoading) {
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
                >
                  {(field) => (
                    <FormField
                      label="Nama Toko"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}

                      placeholder="Masukkan nama toko"
                      required
                    />
                  )}
                </form.Field>

                <form.Field
                  name="sales_id"
                  validators={{
                    onChange: tokoSchema.shape.sales_id
                  }}
                >
                  {(field) => (
                    <FormField
                      label="Sales"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={field.state.meta.errors?.[0] as any}
                      type="select"
                      options={salesOptions}
                      placeholder="Pilih sales"
                      required
                    />
                  )}
                </form.Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form.Field
                  name="kecamatan"
                  validators={{
                    onChange: tokoSchema.shape.kecamatan
                  }}
                >
                  {(field) => (
                    <FormField
                      label="Kecamatan"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={field.state.meta.errors?.[0] as any}
                      placeholder="Masukkan nama kecamatan"
                      required
                    />
                  )}
                </form.Field>

                <form.Field
                  name="kabupaten"
                  validators={{
                    onChange: tokoSchema.shape.kabupaten
                  }}
                >
                  {(field) => (
                    <FormField
                      label="Kabupaten"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={field.state.meta.errors?.[0] as any}
                      placeholder="Masukkan nama kabupaten"
                      required
                    />
                  )}
                </form.Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form.Field
                  name="no_telepon"
                >
                  {(field) => (
                    <FormField
                      label="No. Telepon"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={field.state.meta.errors?.[0] as any}
                      placeholder="Contoh: 081234567890"
                      type="tel"
                    />
                  )}
                </form.Field>

                <form.Field
                  name="link_gmaps"
                >
                  {(field) => (
                    <FormField
                      label="Link Google Maps"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      placeholder="https://maps.google.com/..."
                    />
                  )}
                </form.Field>

                <form.Field
                  name="status_toko"
                >
                  {(field) => (
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
                </form.Field>
              </div>

              <div className="flex items-center justify-end gap-4 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={updateToko.isPending}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={updateToko.isPending || !form.state.isValid}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateToko.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
    </div>
  )
}