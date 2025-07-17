'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Save, Banknote, AlertCircle } from 'lucide-react'
import { useCreateSetoranMutation } from '@/lib/queries/setoran'
import { z } from 'zod'

// Schema sesuai dengan struktur database
const setoranSchema = z.object({
  total_setoran: z.number().min(0, 'Total setoran harus lebih besar dari 0'),
  penerima_setoran: z.string().min(1, 'Penerima setoran harus diisi').max(100, 'Penerima setoran maksimal 100 karakter')
})

type SetoranFormData = z.infer<typeof setoranSchema>

const initialData: SetoranFormData = {
  total_setoran: 0,
  penerima_setoran: ''
}

export default function CreateSetoranPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [formData, setFormData] = useState<SetoranFormData>(initialData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const createSetoranMutation = useCreateSetoranMutation()

  const validateForm = (): boolean => {
    try {
      setoranSchema.parse(formData)
      setErrors({})
      return true
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        err.errors.forEach((error) => {
          if (error.path[0]) {
            newErrors[error.path[0] as string] = error.message
          }
        })
        setErrors(newErrors)
      }
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      return
    }

    try {
      await createSetoranMutation.mutateAsync(formData)
      router.push('/dashboard/setoran')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan data'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }

  const updateFormData = (field: keyof SetoranFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center justify-between text-green-900">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5" />
                Form Setoran Baru
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex items-center gap-2 border-gray-300 hover:bg-gray-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Batal
                </Button>
                <Button
                  type="submit"
                  form="setoran-form"
                  disabled={createSetoranMutation.isPending}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-6 shadow-lg"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {createSetoranMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 lg:p-8">
            <form id="setoran-form" onSubmit={handleSubmit} className="space-y-6 lg:space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* Total Setoran */}
                <div className="space-y-2">
                  <Label htmlFor="total_setoran" className="text-sm font-medium text-gray-700">
                    Total Setoran <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                      Rp
                    </span>
                    <Input
                      id="total_setoran"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.total_setoran || ''}
                      onChange={(e) => updateFormData('total_setoran', parseFloat(e.target.value) || 0)}
                      className={`pl-10 ${errors.total_setoran ? 'border-red-500 focus:border-red-500' : ''}`}
                      placeholder="0"
                      required
                    />
                  </div>
                  {errors.total_setoran && (
                    <p className="text-sm text-red-600">{errors.total_setoran}</p>
                  )}
                </div>

                {/* Penerima Setoran */}
                <div className="space-y-2">
                  <Label htmlFor="penerima_setoran" className="text-sm font-medium text-gray-700">
                    Penerima Setoran <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="penerima_setoran"
                    type="text"
                    value={formData.penerima_setoran}
                    onChange={(e) => updateFormData('penerima_setoran', e.target.value)}
                    className={errors.penerima_setoran ? 'border-red-500 focus:border-red-500' : ''}
                    placeholder="Nama penerima setoran"
                    maxLength={100}
                    required
                  />
                  {errors.penerima_setoran && (
                    <p className="text-sm text-red-600">{errors.penerima_setoran}</p>
                  )}
                </div>
              </div>

              {/* Summary Card */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 lg:p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-4">Ringkasan Setoran</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-green-700">Total Setoran</p>
                    <p className="text-xl font-bold text-green-900">
                      Rp {formData.total_setoran.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700">Penerima</p>
                    <p className="text-lg font-semibold text-green-900">
                      {formData.penerima_setoran || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Info Card */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">i</span>
                  </div>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Informasi Setoran</p>
                    <p>Setoran akan dicatat dengan tanggal dan waktu saat ini. Pastikan data yang dimasukkan sudah benar sebelum menyimpan.</p>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}