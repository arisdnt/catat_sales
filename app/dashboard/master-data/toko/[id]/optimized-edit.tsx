'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'

// Materialized views removed - using direct queries
import { useUpdateTokoMutation } from '@/lib/queries/toko'
import { useComprehensivePrefetch } from '@/lib/hooks/use-smart-prefetch'
import { SalesSelect } from '@/components/forms/optimized-select'
import { useToast } from '@/components/ui/use-toast'

interface TokoEditPageProps {
  params: { id: string }
}

interface TokoFormData {
  nama_toko: string
  id_sales: number
  alamat?: string
  desa?: string
  kecamatan?: string
  kabupaten?: string
  link_gmaps?: string
  status_toko: boolean
}

export default function OptimizedTokoEditPage({ params }: TokoEditPageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const tokoId = parseInt(params.id)
  
  // Use optimized queries with materialized views
  // TODO: Replace with direct queries - materialized views removed
  const tokoData: TokoFormData | null = null
  const tokoLoading = false
  const tokoError = null
  const salesData: any[] = []
  const salesLoading = false
  const updateMutation = useUpdateTokoMutation()
  
  // Smart prefetching
  const { prefetchEntity } = useComprehensivePrefetch('toko')
  
  const form = useForm<TokoFormData>({
    defaultValues: {
      nama_toko: '',
      id_sales: 0,
      alamat: '',
      desa: '',
      kecamatan: '',
      kabupaten: '',
      link_gmaps: '',
      status_toko: true,
    },
  })

  const onSubmit = async (data: TokoFormData) => {
    try {
      await updateMutation.mutateAsync({
        id: tokoId,
        data,
      })
      
      toast({
        title: "Success",
        description: "Store updated successfully",
      })
      
      router.push(`/dashboard/master-data/toko/${tokoId}`)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update store",
        variant: "destructive",
      })
    }
  }

  // Populate form when data loads
  // TODO: Implement when data loading is restored
  // useEffect(() => {
  //   if (tokoData) {
  //     form.setValue('nama_toko', tokoData.nama_toko || '')
  //     form.setValue('id_sales', tokoData.id_sales || 0)
  //     form.setValue('alamat', tokoData.alamat || '')
  //     form.setValue('desa', tokoData.desa || '')
  //     form.setValue('kecamatan', tokoData.kecamatan || '')
  //     form.setValue('kabupaten', tokoData.kabupaten || '')
  //     form.setValue('link_gmaps', tokoData.link_gmaps || '')
  //     form.setValue('status_toko', tokoData.status_toko ?? true)
  //   }
  // }, [tokoData, form])

  // Prefetch detail page data
  useEffect(() => {
    prefetchEntity('toko', tokoId)
  }, [tokoId, prefetchEntity])

  if (tokoLoading) {
    return (
      <div className="container mx-auto p-6 bg-white min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (tokoError || !tokoData) {
    return (
      <div className="container mx-auto p-6 bg-white min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Store not found</h2>
          <p className="text-muted-foreground mb-4">
            The store you&apos;re trying to edit doesn&apos;t exist.
          </p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Store</h1>
            <p className="text-muted-foreground">{(tokoData as TokoFormData | null)?.nama_toko || 'Loading...'}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Card>
          <CardHeader>
            <CardTitle>Store Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Store Name */}
            <div className="space-y-2">
              <Label htmlFor="nama_toko">Store Name *</Label>
              <Input
                id="nama_toko"
                {...form.register('nama_toko', { required: 'Store name is required' })}
                placeholder="Enter store name"
              />
              {form.formState.errors.nama_toko && (
                <p className="text-sm text-red-500">{form.formState.errors.nama_toko.message}</p>
              )}
            </div>

            {/* Sales Assignment with Optimized Select */}
            <div className="space-y-2">
              <Label>Assigned Sales *</Label>
              <SalesSelect
                value={form.watch('id_sales')}
                onValueChange={(value) => form.setValue('id_sales', typeof value === 'string' ? parseInt(value) : value)}
                placeholder="Select sales representative"
                filters={{ activeOnly: true }}
                disabled={salesLoading}
              />
              {form.formState.errors.id_sales && (
                <p className="text-sm text-red-500">{form.formState.errors.id_sales.message}</p>
              )}
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="alamat">Address</Label>
              <Textarea
                id="alamat"
                {...form.register('alamat')}
                placeholder="Enter complete address"
                rows={3}
              />
            </div>

            {/* Location Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="desa">Village</Label>
                <Input
                  id="desa"
                  {...form.register('desa')}
                  placeholder="Village name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kecamatan">District</Label>
                <Input
                  id="kecamatan"
                  {...form.register('kecamatan')}
                  placeholder="District name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kabupaten">Regency</Label>
                <Input
                  id="kabupaten"
                  {...form.register('kabupaten')}
                  placeholder="Regency name"
                />
              </div>
            </div>

            {/* Google Maps Link */}
            <div className="space-y-2">
              <Label htmlFor="link_gmaps">Google Maps Link</Label>
              <Input
                id="link_gmaps"
                type="url"
                {...form.register('link_gmaps')}
                placeholder="https://maps.google.com/..."
              />
            </div>

            {/* Status */}
            <div className="flex items-center space-x-2">
              <Switch
                id="status_toko"
                checked={form.watch('status_toko')}
                onCheckedChange={(checked) => form.setValue('status_toko', checked)}
              />
              <Label htmlFor="status_toko">Active Store</Label>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending || !form.formState.isValid}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}