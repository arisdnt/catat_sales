'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

import { FormField } from '@/components/forms/form-field'
import { produkSchema, type ProdukFormData } from '@/lib/form-utils'
import { ArrowLeft, Save, Package } from 'lucide-react'

const initialData: ProdukFormData = {
  nama_produk: '',
  harga_satuan: 0,
  kategori: '',
  status_produk: true,
  deskripsi: ''
}

const kategoriOptions = [
  { value: 'Makanan', label: 'Makanan' },
  { value: 'Minuman', label: 'Minuman' },
  { value: 'Kebersihan', label: 'Kebersihan' },
  { value: 'Kesehatan', label: 'Kesehatan' },
  { value: 'Elektronik', label: 'Elektronik' },
  { value: 'Pakaian', label: 'Pakaian' },
  { value: 'Alat Tulis', label: 'Alat Tulis' },
  { value: 'Lainnya', label: 'Lainnya' }
]

export default function AddProdukPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm({
    defaultValues: initialData,
    onSubmit: async ({ value }) => {
      setIsSubmitting(true)
      try {
        const response = await fetch('/api/produk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(value)
        })

        if (!response.ok) {
          throw new Error('Gagal menyimpan data produk')
        }

        toast({
          title: 'Berhasil',
          description: 'Data produk berhasil disimpan'
        })

        router.push('/dashboard/master-data/produk')
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
              <Package className="w-5 h-5" />
              Informasi Produk
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
                  name="nama_produk"
                  children={(field) => (
                    <FormField
                      label="Nama Produk"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      placeholder="Masukkan nama produk"
                      required
                    />
                  )}
                />

                <form.Field
                  name="kategori"
                  children={(field) => (
                    <FormField
                      label="Kategori"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      type="select"
                      options={kategoriOptions}
                      placeholder="Pilih kategori"
                      required
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form.Field
                  name="harga_satuan"
                  children={(field) => (
                    <FormField
                      label="Harga Satuan"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      type="currency"
                      placeholder="0"
                      min={0}
                      required
                    />
                  )}
                />

                <form.Field
                  name="status_produk"
                  children={(field) => (
                    <FormField
                      label="Status Produk Aktif"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      type="checkbox"
                    />
                  )}
                />
              </div>

              <form.Field
                name="deskripsi"
                children={(field) => (
                  <FormField
                    label="Deskripsi"
                    name={field.name}
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    type="textarea"
                    placeholder="Masukkan deskripsi produk (opsional)"
                    rows={4}
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
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
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