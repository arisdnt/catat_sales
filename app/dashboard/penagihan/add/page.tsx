'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

import { FormField } from '@/components/forms/form-field'
import { penagihanSchema, type PenagihanFormData } from '@/lib/form-utils'
import { useTokoQuery } from '@/lib/queries/toko'
import { useProdukQuery } from '@/lib/queries/produk'
import { ArrowLeft, Save, Receipt } from 'lucide-react'
import { apiClient } from '@/lib/api-client'

const metodePembayaranOptions = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Transfer', label: 'Transfer' }
]

const initialData: PenagihanFormData = {
  toko_id: '',
  total_uang_diterima: 0,
  metode_pembayaran: 'Cash',
  detail_penagihan: [
    { produk_id: '', jumlah_terjual: 0, jumlah_kembali: 0 }
  ],
  potongan: {
    jumlah_potongan: 0,
    alasan: ''
  }
}

export default function AddPenagihanPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Fetch data from API
  const { data: tokoResponse } = useTokoQuery()
  const { data: produkResponse } = useProdukQuery()
  
  const tokoData = ((tokoResponse as any)?.data || []) as Array<{ id_toko: number; nama_toko: string }>
  const produkData = ((produkResponse as any)?.data?.data || []) as Array<{ id_produk: number; nama_produk: string; harga_satuan: number }>
  
  const tokoOptions = tokoData.length > 0 
    ? tokoData.map(toko => ({
        value: toko.id_toko.toString(),
        label: toko.nama_toko
      }))
    : [{ value: '', label: 'Data toko belum tersedia' }]
  
  const produkOptions = produkData.length > 0
    ? produkData.map(produk => ({
        value: produk.id_produk.toString(),
        label: produk.nama_produk
      }))
    : [{ value: '', label: 'Data produk belum tersedia' }]

  const form = useForm({
    defaultValues: initialData,
    onSubmit: async ({ value }) => {
      setIsSubmitting(true)
      try {
        await apiClient.createBilling({
          id_toko: parseInt(value.toko_id),
          total_uang_diterima: value.total_uang_diterima,
          metode_pembayaran: value.metode_pembayaran as 'Cash' | 'Transfer',
          details: value.detail_penagihan.map(detail => ({
            id_produk: parseInt(detail.produk_id),
            jumlah_terjual: detail.jumlah_terjual,
            jumlah_kembali: detail.jumlah_kembali
          })),
          potongan: value.potongan?.jumlah_potongan ? {
            jumlah_potongan: value.potongan.jumlah_potongan,
            alasan: value.potongan.alasan
          } : undefined
        })

        toast({
          title: 'Berhasil',
          description: 'Data penagihan berhasil disimpan'
        })

        router.push('/dashboard/penagihan')
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

  const addDetailItem = () => {
    const currentDetails = form.getFieldValue('detail_penagihan')
    form.setFieldValue('detail_penagihan', [
      ...currentDetails,
      { produk_id: '', jumlah_terjual: 0, jumlah_kembali: 0 }
    ])
  }

  const removeDetailItem = (index: number) => {
    const currentDetails = form.getFieldValue('detail_penagihan')
    if (currentDetails.length > 1) {
      form.setFieldValue('detail_penagihan', currentDetails.filter((_, i) => i !== index))
    }
  }

  return (
    <div className="p-8">
        <Card className="max-w-4xl mx-auto border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Informasi Tagihan
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
                    onChange: penagihanSchema.shape.toko_id
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
                  name="metode_pembayaran"
                  validators={{
                    onChange: penagihanSchema.shape.metode_pembayaran
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
              </div>

              <form.Field
                name="total_uang_diterima"
                validators={{
                  onChange: penagihanSchema.shape.total_uang_diterima
                }}
                children={(field) => (
                  <FormField
                    label="Total Uang Diterima"
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
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
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