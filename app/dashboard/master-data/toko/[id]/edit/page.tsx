'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from '@tanstack/react-form'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/forms/form-field'
import { tokoSchema, type TokoFormData } from '@/lib/form-utils'
import { useTokoDetailQuery, useUpdateTokoMutation, useSalesQuery } from '@/lib/queries/toko'
import { Save } from 'lucide-react'

const statusOptions = [
  { value: true, label: 'Aktif' },
  { value: false, label: 'Non-aktif' }
]

export default function EditTokoPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [tokoId, setTokoId] = useState<number | null>(null)

  // Initialize params
  useEffect(() => {
    params.then(({ id }) => {
      setTokoId(parseInt(id))
    })
  }, [params])

  const { data: tokoResponse, isLoading } = useTokoDetailQuery(tokoId!)
  const { data: salesResponse } = useSalesQuery()
  const updateToko = useUpdateTokoMutation()

  const toko: { id_toko: number; nama_toko: string; kecamatan: string; kabupaten: string; status_toko: boolean; id_sales: number; no_telepon?: string; link_gmaps?: string } = (tokoResponse as { data: any })?.data
  const salesData: { id_sales: number; nama_sales: string }[] = (salesResponse as { data: any[] })?.data || []
  const salesOptions = salesData.map(s => ({ value: s.id_sales.toString(), label: s.nama_sales }))

  const form = useForm({
    defaultValues: {
      nama_toko: '',
      kecamatan: '',
      kabupaten: '',
      no_telepon: '',
      link_gmaps: '',
      sales_id: '',
      status_toko: true
    },
    onSubmit: async ({ value }) => {
      if (tokoId) {
        const updateData = {
          nama_toko: value.nama_toko,
          kecamatan: value.kecamatan,
          kabupaten: value.kabupaten,
          no_telepon: value.no_telepon || null,
          link_gmaps: value.link_gmaps || null,
          status_toko: value.status_toko,
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
  useEffect(() => {
    if (toko && toko.id_sales !== undefined) {
      form.setFieldValue('nama_toko', toko.nama_toko || '')
      form.setFieldValue('kecamatan', toko.kecamatan || '')
      form.setFieldValue('kabupaten', toko.kabupaten || '')
      form.setFieldValue('no_telepon', toko.no_telepon || '')
      form.setFieldValue('link_gmaps', toko.link_gmaps || '')
      form.setFieldValue('sales_id', toko.id_sales.toString())
      form.setFieldValue('status_toko', toko.status_toko)
    }
  }, [toko, form])

  if (isLoading) {
    return (
      <div className="w-full h-full bg-white">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="animate-pulse">
            <div className="flex justify-between items-center mb-6">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="flex gap-2">
                <div className="h-10 bg-gray-200 rounded w-20"></div>
                <div className="h-10 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
        {/* Header with Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Edit Toko</h1>
            <p className="text-gray-600">Edit informasi toko: {toko?.nama_toko}</p>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={updateToko.isPending}
              className="bg-white hover:bg-gray-50 border-gray-300"
            >
              Batal
            </Button>
            <Button
              type="submit"
              form="toko-form"
              disabled={updateToko.isPending || !form.state.isValid}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateToko.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </div>

        {/* Form */}
        <div className="w-full">
          <form
            id="toko-form"
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              form.handleSubmit()
            }}
            className="w-full"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                    error={field.state.meta.errors?.[0] ? (typeof field.state.meta.errors[0] === 'string' ? field.state.meta.errors[0] : (field.state.meta.errors[0] as any)?.message) : undefined}
                    type="select"
                    options={salesOptions}
                    placeholder="Pilih sales"
                    required
                  />
                )}
              </form.Field>

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
                    error={field.state.meta.errors?.[0] ? (typeof field.state.meta.errors[0] === 'string' ? field.state.meta.errors[0] : (field.state.meta.errors[0] as any)?.message) : undefined}
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
                    error={field.state.meta.errors?.[0] ? (typeof field.state.meta.errors[0] === 'string' ? field.state.meta.errors[0] : (field.state.meta.errors[0] as any)?.message) : undefined}
                      placeholder="Masukkan nama kabupaten"
                    required
                  />
                )}
              </form.Field>

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
                    error={field.state.meta.errors?.[0] ? (typeof field.state.meta.errors[0] === 'string' ? field.state.meta.errors[0] : (field.state.meta.errors[0] as any)?.message) : undefined}
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
          </form>
        </div>
      </div>
    </div>
  )
}