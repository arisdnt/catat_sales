'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

import { FormField } from '@/components/forms/form-field'
import { salesSchema, type SalesFormData } from '@/lib/form-utils'
import { ArrowLeft, Save, Users } from 'lucide-react'

export default function EditSalesPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [itemId, setItemId] = useState<string>('')

  const form = useForm({
    defaultValues: {
      nama_sales: '',
      nomor_telepon: '',
      email: '',
      alamat: '',
      target_penjualan: 0,
      komisi_persen: 0,
      status_sales: true
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true)
      try {
        const response = await fetch(`/api/sales/${itemId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(value)
        })

        if (!response.ok) {
          throw new Error('Gagal memperbarui data sales')
        }

        toast({
          title: 'Berhasil',
          description: 'Data sales berhasil diperbarui'
        })

        router.push(`/dashboard/master-data/sales/${itemId}`)
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

  useEffect(() => {
    const initializeParams = async () => {
      const { id } = await params
      setItemId(id)
      fetchSalesData(id)
    }
    initializeParams()
  }, [])

  const fetchSalesData = async (id?: string) => {
    try {
      // Mock data for demo - replace with actual API call
      const mockData = {
        nama_sales: 'John Doe',
        nomor_telepon: '081234567890',
        email: 'john@example.com',
        alamat: 'Jl. Merdeka No. 123, Jakarta',
        target_penjualan: 50000000,
        komisi_persen: 5,
        status_sales: true
      }
      
      // Set form values
      form.setFieldValue('nama_sales', mockData.nama_sales)
      form.setFieldValue('nomor_telepon', mockData.nomor_telepon)
      form.setFieldValue('email', mockData.email)
      form.setFieldValue('alamat', mockData.alamat)
      form.setFieldValue('target_penjualan', mockData.target_penjualan)
      form.setFieldValue('komisi_persen', mockData.komisi_persen)
      form.setFieldValue('status_sales', mockData.status_sales)
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal memuat data sales',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
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
              <Users className="w-5 h-5" />
              Edit Informasi Sales
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
                      required
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form.Field
                  name="email"
                  children={(field) => (
                    <FormField
                      label="Email"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      type="email"
                      placeholder="Masukkan email (opsional)"
                    />
                  )}
                />

                <form.Field
                  name="status_sales"
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

              <form.Field
                name="alamat"
                children={(field) => (
                  <FormField
                    label="Alamat"
                    name={field.name}
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    type="textarea"
                    placeholder="Masukkan alamat lengkap"
                    required
                  />
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form.Field
                  name="target_penjualan"
                  children={(field) => (
                    <FormField
                      label="Target Penjualan"
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
                  name="komisi_persen"
                  children={(field) => (
                    <FormField
                      label="Komisi (%)"
                      name={field.name}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
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
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
    </div>
  )
}