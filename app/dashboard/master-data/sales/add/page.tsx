'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

import { FormField } from '@/components/forms/form-field'
import { salesSchema, type SalesFormData } from '@/lib/form-utils'
import { ArrowLeft, Save, Users } from 'lucide-react'

const initialData: SalesFormData = {
  nama_sales: '',
  nomor_telepon: '',
  email: '',
  alamat: '',
  target_penjualan: 0,
  komisi_persen: 0,
  status_sales: true
}

export default function AddSalesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm({
    defaultValues: initialData,
    onSubmit: async ({ value }) => {
      setIsSubmitting(true)
      try {
        const response = await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(value)
        })

        if (!response.ok) {
          throw new Error('Gagal menyimpan data sales')
        }

        toast({
          title: 'Berhasil',
          description: 'Data sales berhasil disimpan'
        })

        router.push('/dashboard/master-data/sales')
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
    validators: {
      onChange: salesSchema
    }
  })

  return (
    <div className="p-8">
        <Card className="max-w-4xl mx-auto border-0 shadow-lg">
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
                  validators={{
                    onChange: salesSchema.shape.nama_sales
                  }}
                  children={(field) => (
                    <FormField
                      label="Nama Sales"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={field.state.meta.errors?.[0]?.message}
                      placeholder="Masukkan nama sales"
                      required
                    />
                  )}
                />

                <form.Field
                  name="nomor_telepon"
                  validators={{
                    onChange: salesSchema.shape.nomor_telepon
                  }}
                  children={(field) => (
                    <FormField
                      label="Nomor Telepon"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={field.state.meta.errors?.[0]?.message}
                      type="tel"
                      placeholder="Contoh: 08123456789"
                      required
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form.Field
                  name="email"
                  validators={{
                    onChange: salesSchema.shape.email
                  }}
                  children={(field) => (
                    <FormField
                      label="Email"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={field.state.meta.errors?.[0]?.message}
                      type="email"
                      placeholder="Masukkan email (opsional)"
                    />
                  )}
                />

                <form.Field
                  name="status_sales"
                  validators={{
                    onChange: salesSchema.shape.status_sales
                  }}
                  children={(field) => (
                    <FormField
                      label="Status Sales Aktif"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={field.state.meta.errors?.[0]?.message}
                      type="checkbox"
                    />
                  )}
                />
              </div>

              <form.Field
                name="alamat"
                validators={{
                  onChange: salesSchema.shape.alamat
                }}
                children={(field) => (
                  <FormField
                    label="Alamat"
                    name={field.name}
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    error={field.state.meta.errors?.[0]?.message}
                    type="textarea"
                    placeholder="Masukkan alamat lengkap"
                    required
                  />
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form.Field
                  name="target_penjualan"
                  validators={{
                    onChange: salesSchema.shape.target_penjualan
                  }}
                  children={(field) => (
                    <FormField
                      label="Target Penjualan"
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
                  name="komisi_persen"
                  validators={{
                    onChange: salesSchema.shape.komisi_persen
                  }}
                  children={(field) => (
                    <FormField
                      label="Komisi (%)"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={field.state.meta.errors?.[0]?.message}
                      type="number"
                      placeholder="0"
                      min={0}
                      max={100}
                      step={0.1}
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
                  className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700"
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