'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

import { FormField } from '@/components/forms/form-field'
import { setoranSchema, type SetoranFormData } from '@/lib/form-utils'
import { useTokoQuery } from '@/lib/queries/toko'
import { useSalesQuery } from '@/lib/queries/sales'
import { ArrowLeft, Save, Banknote } from 'lucide-react'
import { z } from 'zod'

const metodePembayaranOptions = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Transfer', label: 'Transfer' },
  { value: 'Cheque', label: 'Cheque' }
]

interface CustomSetoranFormData {
  toko_id: string
  sales_id: string
  jumlah_setoran: number
  tanggal_setoran: string
  metode_pembayaran: string
  keterangan: string
}

const initialData: CustomSetoranFormData = {
  toko_id: '',
  sales_id: '',
  jumlah_setoran: 0,
  tanggal_setoran: '',
  metode_pembayaran: 'Cash',
  keterangan: ''
}

export default function AddSetoranPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  // Fetch data from API
  const { data: tokoResponse } = useTokoQuery()
  const { data: salesResponse } = useSalesQuery()
  
  const tokoData = (tokoResponse as { data: any[] })?.data || []
  const salesData = (salesResponse as { data: any[] })?.data || []
  
  const tokoOptions = tokoData.length > 0 
    ? tokoData.map(toko => ({
        value: toko.id_toko.toString(),
        label: toko.nama_toko
      }))
    : [{ value: '', label: 'Data toko belum tersedia' }]
  
  const salesOptions = salesData.length > 0
    ? salesData.map(sales => ({
        value: sales.id_sales.toString(),
        label: sales.nama_sales
      }))
    : [{ value: '', label: 'Data sales belum tersedia' }]
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm({
    defaultValues: initialData,
    onSubmit: async ({ value }) => {
      setIsSubmitting(true)
      try {
        const response = await fetch('/api/setoran', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(value)
        })

        if (!response.ok) {
          throw new Error('Gagal menyimpan data setoran')
        }

        toast({
          title: 'Berhasil',
          description: 'Data setoran berhasil disimpan'
        })

        router.push('/dashboard/setoran')
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Terjadi kesalahan',
          variant: 'destructive'
        })
      } finally {
        setIsSubmitting(false)
      }
    },

  })

  return (
    <div className="p-8">
        <Card className="max-w-4xl mx-auto border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5" />
              Informasi Setoran
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
                  name="toko_id"
                  validators={{
                    onChange: z.string().min(1, 'Toko harus dipilih')
                  }}
                  children={(field) => (
                    <FormField
                      label="Toko"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={field.state.meta.errors?.[0]?.message}
                      type="select"
                      options={tokoOptions}
                      placeholder="Pilih toko"
                      required
                    />
                  )}
                />

                <form.Field
                  name="sales_id"
                  validators={{
                    onChange: z.string().min(1, 'Sales harus dipilih')
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
                  name="jumlah_setoran"
                  validators={{
                    onChange: z.number().min(0, 'Jumlah setoran harus lebih besar dari 0')
                  }}
                  children={(field) => (
                    <FormField
                      label="Jumlah Setoran"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={field.state.meta.errors?.[0]?.message}
                      type="currency"
                      placeholder="0"
                      min={0}
                      required
                    />
                  )}
                />

                <form.Field
                  name="tanggal_setoran"
                  validators={{
                    onChange: z.string().min(1, 'Tanggal setoran harus diisi')
                  }}
                  children={(field) => (
                    <FormField
                      label="Tanggal Setoran"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={field.state.meta.errors?.[0]?.message}
                      type="date"
                      required
                    />
                  )}
                />
              </div>

              <form.Field
                name="metode_pembayaran"
                validators={{
                  onChange: z.string().min(1, 'Metode pembayaran harus dipilih')
                }}
                children={(field) => (
                  <FormField
                    label="Metode Pembayaran"
                    name={field.name}
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    error={field.state.meta.errors?.[0]?.message}
                    type="select"
                    options={metodePembayaranOptions}
                    required
                  />
                )}
              />

              <form.Field
                name="keterangan"
                validators={{
                    onChange: z.string().max(500, 'Keterangan maksimal 500 karakter')
                  }}
                children={(field) => (
                  <FormField
                    label="Keterangan"
                    name={field.name}
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    error={field.state.meta.errors?.[0]?.message}
                    type="textarea"
                    placeholder="Keterangan setoran (opsional)"
                    rows={3}
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
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
    </div>
  )
}