'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from '@tanstack/react-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

import { FormField } from '@/components/forms/form-field'
import { useSalesDetailQuery, useUpdateSalesMutation } from '@/lib/queries/sales'
import { ArrowLeft, Save, Users } from 'lucide-react'

export default function EditSalesPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { toast } = useToast()
  const [salesId, setSalesId] = useState<number | null>(null)

  // Initialize sales ID from params
  useState(() => {
    params.then(({ id }) => {
      setSalesId(parseInt(id))
    })
  })

  const { data: salesResponse, isLoading, error } = useSalesDetailQuery(salesId!)
  const updateSales = useUpdateSalesMutation()

  const sales = (salesResponse as { data: any })?.data

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
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Edit Sales</h1>
            <p className="text-sm sm:text-base text-gray-600">Edit informasi sales: {sales.nama_sales}</p>
          </div>
        </div>

        {/* Form */}
        <Card className="w-full border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Informasi Sales
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
                  name="nama_sales"
                  children={(field) => (
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
                />

                <form.Field
                  name="nomor_telepon"
                  children={(field) => (
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
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form.Field
                  name="status_aktif"
                  children={(field) => (
                    <FormField
                      label="Status Sales Aktif"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      type="checkbox"
                    />
                  )}
                />
              </div>

              <div className="flex items-center justify-end gap-4 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={updateSales.isPending}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={updateSales.isPending || !form.state.isValid}
                  className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateSales.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}