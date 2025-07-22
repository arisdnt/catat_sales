'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from '@tanstack/react-form'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/forms/form-field'
import { useSalesDetailQuery, useUpdateSalesMutation } from '@/lib/queries/sales'
import { ArrowLeft, Save } from 'lucide-react'

interface SalesData {
  nama_sales: string
  nomor_telepon: string
  status_aktif: boolean
}

export default function EditSalesPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [salesId, setSalesId] = useState<number | null>(null)

  // Initialize sales ID from params
  useState(() => {
    params.then(({ id }) => {
      setSalesId(parseInt(id))
    })
  })

  const { data: salesResponse, isLoading, error } = useSalesDetailQuery(salesId!)
  const updateSales = useUpdateSalesMutation()

  const sales = (salesResponse as { data: SalesData })?.data

  const form = useForm({
    defaultValues: {
      nama_sales: sales?.nama_sales || '',
      nomor_telepon: sales?.nomor_telepon || '',
      status_aktif: sales?.status_aktif ?? true
    },
    onSubmit: async ({ value }) => {
      if (!salesId) return
      
      updateSales.mutate(
        { id: salesId, data: value },
        {
          onSuccess: () => {
            router.push(`/dashboard/master-data/sales/${salesId}`)
          }
        }
      )
    },
  })

  // Update form values when sales data loads
  useState(() => {
    if (sales && !isLoading) {
      form.setFieldValue('nama_sales', sales.nama_sales || '')
      form.setFieldValue('nomor_telepon', sales.nomor_telepon || '')
      form.setFieldValue('status_aktif', sales.status_aktif ?? true)
    }
  })

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl mx-auto animate-pulse">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-10 w-10 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (error || !sales) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl mx-auto text-center">
          <div className="text-red-600 mb-4">
            {error ? 'Error loading sales data' : 'Data sales tidak ditemukan'}
          </div>
          <Button onClick={() => router.back()} variant="outline">
            Kembali
          </Button>
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
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Edit Sales</h1>
            <p className="text-gray-600">Edit informasi sales: {sales.nama_sales}</p>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={updateSales.isPending}
              className="bg-white hover:bg-gray-50 border-gray-300"
            >
              Batal
            </Button>
            <Button
              type="submit"
              form="sales-form"
              disabled={updateSales.isPending || !form.state.isValid}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateSales.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </div>

        {/* Form */}
        <div className="w-full">
          <form
            id="sales-form"
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              form.handleSubmit()
            }}
            className="w-full"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <form.Field name="nama_sales">
                {(field) => (
                  <FormField
                    label="Nama Sales"
                    name={field.name}
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    placeholder="Masukkan nama sales"
                    required
                  />
                )}
              </form.Field>

              <form.Field name="nomor_telepon">
                {(field) => (
                  <FormField
                    label="Nomor Telepon"
                    name={field.name}
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    type="tel"
                    placeholder="Contoh: 08123456789"
                  />
                )}
              </form.Field>

              <form.Field name="status_aktif">
                {(field) => (
                  <FormField
                    label="Status Sales Aktif"
                    name={field.name}
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    type="checkbox"
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