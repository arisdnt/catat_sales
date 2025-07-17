'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

import { FormField } from '@/components/forms/form-field'
import { pengirimanSchema, type PengirimanFormData } from '@/lib/form-utils'
import { ArrowLeft, Save, Truck } from 'lucide-react'

const tokoOptions = [
  { value: '1', label: 'Toko Berkah Jaya 1' },
  { value: '2', label: 'Toko Sari Melati 2' },
  { value: '3', label: 'Minimarket Bahagia 3' },
  { value: '4', label: 'Toko Serba Ada 4' },
  { value: '5', label: 'Warung Keluarga 5' }
]

const produkOptions = [
  { value: '1', label: 'Sabun Mandi Lifebuoy' },
  { value: '2', label: 'Shampoo Pantene' },
  { value: '3', label: 'Pasta Gigi Pepsodent' },
  { value: '4', label: 'Detergen Rinso' },
  { value: '5', label: 'Minyak Goreng Bimoli' }
]

const initialData: PengirimanFormData = {
  toko_id: '',
  tanggal_kirim: '',
  catatan: '',
  detail_pengiriman: [
    { produk_id: '', jumlah_kirim: 1 }
  ]
}

export default function AddPengirimanPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm({
    defaultValues: initialData,
    onSubmit: async ({ value }) => {
      setIsSubmitting(true)
      try {
        const response = await fetch('/api/pengiriman', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(value)
        })

        if (!response.ok) {
          throw new Error('Gagal menyimpan data pengiriman')
        }

        toast({
          title: 'Berhasil',
          description: 'Data pengiriman berhasil disimpan'
        })

        router.push('/dashboard/pengiriman')
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
    const currentDetails = form.getFieldValue('detail_pengiriman')
    form.setFieldValue('detail_pengiriman', [
      ...currentDetails,
      { produk_id: '', jumlah_kirim: 1 }
    ])
  }

  const removeDetailItem = (index: number) => {
    const currentDetails = form.getFieldValue('detail_pengiriman')
    if (currentDetails.length > 1) {
      form.setFieldValue('detail_pengiriman', currentDetails.filter((_, i) => i !== index))
    }
  }

  return (
    <div className="p-8">
        <Card className="max-w-4xl mx-auto border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Informasi Pengiriman
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
                    onChange: pengirimanSchema.shape.toko_id
                  }}
                  children={(field) => (
                    <FormField
                      label="Toko Tujuan"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={field.state.meta.errors?.[0]?.message}
                      type="select"
                      options={tokoOptions}
                      placeholder="Pilih toko tujuan"
                      required
                    />
                  )}
                />

                <form.Field
                  name="tanggal_kirim"
                  validators={{
                    onChange: pengirimanSchema.shape.tanggal_kirim
                  }}
                  children={(field) => (
                    <FormField
                      label="Tanggal Kirim"
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
                name="catatan"
                validators={{
                  onChange: pengirimanSchema.shape.catatan
                }}
                children={(field) => (
                  <FormField
                    label="Catatan"
                    name={field.name}
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    error={field.state.meta.errors?.[0]?.message}
                    type="textarea"
                    placeholder="Catatan pengiriman (opsional)"
                    rows={3}
                  />
                )}
              />

              {/* Detail Pengiriman */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Detail Produk</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addDetailItem}
                  >
                    Tambah Produk
                  </Button>
                </div>

                <form.Field
                  name="detail_pengiriman"
                  validators={{
                    onChange: pengirimanSchema.shape.detail_pengiriman
                  }}
                  children={(field) => (
                    <div className="space-y-4">
                      {field.state.value.map((detail, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium">Produk {index + 1}</h4>
                            {field.state.value.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeDetailItem(index)}
                                className="text-red-600 hover:text-red-700"
                              >
                                Hapus
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              label="Produk"
                              name={`detail_pengiriman.${index}.produk_id`}
                              value={detail.produk_id}
                              onChange={(value) => {
                                const newDetails = [...field.state.value]
                                newDetails[index].produk_id = value
                                field.handleChange(newDetails)
                              }}
                              type="select"
                              options={produkOptions}
                              placeholder="Pilih produk"
                              required
                            />
                            <FormField
                              label="Jumlah Kirim"
                              name={`detail_pengiriman.${index}.jumlah_kirim`}
                              value={detail.jumlah_kirim}
                              onChange={(value) => {
                                const newDetails = [...field.state.value]
                                newDetails[index].jumlah_kirim = value
                                field.handleChange(newDetails)
                              }}
                              type="number"
                              min={1}
                              required
                            />
                          </div>
                        </div>
                      ))}
                    </div>
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
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
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