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
import { ArrowLeft, Save, Banknote } from 'lucide-react'

const tokoOptions = [
  { value: '1', label: 'Toko Berkah Jaya 1' },
  { value: '2', label: 'Toko Sari Melati 2' },
  { value: '3', label: 'Minimarket Bahagia 3' }
]

const salesOptions = [
  { value: '1', label: 'Ahmad Susanto' },
  { value: '2', label: 'Budi Santoso' },
  { value: '3', label: 'Citra Dewi' }
]

const metodePembayaranOptions = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Transfer', label: 'Transfer' },
  { value: 'Cheque', label: 'Cheque' }
]

const initialData: SetoranFormData = {
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
                    onChange: setoranSchema.shape.toko_id
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
                    onChange: setoranSchema.shape.sales_id
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
                    onChange: setoranSchema.shape.jumlah_setoran
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
                    onChange: setoranSchema.shape.tanggal_setoran
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
                  onChange: setoranSchema.shape.metode_pembayaran
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
                  onChange: setoranSchema.shape.keterangan
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