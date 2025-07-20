// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'

import { 
  useTokoAggregateDetailQuery, 
  useSalesAggregatesQuery,
} from '@/lib/queries/materialized-views'
import { useUpdateTokoMutation } from '@/lib/queries/toko'
import { useComprehensivePrefetch } from '@/lib/hooks/use-smart-prefetch'
import { SalesSelect } from '@/components/forms/optimized-select'
import { VirtualList } from '@/components/search'
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
  const { data: tokoData, isLoading: tokoLoading, error: tokoError } = useTokoAggregateDetailQuery(tokoId)
  const { data: salesData, isLoading: salesLoading } = useSalesAggregatesQuery()
  const updateMutation = useUpdateTokoMutation()
  
  // Smart prefetching
  const { prefetchEntity } = useComprehensivePrefetch('toko')
  
  const form = useForm({
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
    onSubmit: async ({ value }) => {
      try {
        await updateMutation.mutateAsync({
          id: tokoId,
          data: value,
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
    },
  })

  // Populate form when data loads
  useEffect(() => {
    if (tokoData) {
      form.setFieldValue('nama_toko', tokoData.nama_toko || '')
      form.setFieldValue('id_sales', tokoData.id_sales || 0)
      form.setFieldValue('alamat', tokoData.alamat || '')
      form.setFieldValue('desa', tokoData.desa || '')
      form.setFieldValue('kecamatan', tokoData.kecamatan || '')
      form.setFieldValue('kabupaten', tokoData.kabupaten || '')
      form.setFieldValue('link_gmaps', tokoData.link_gmaps || '')
      form.setFieldValue('status_toko', tokoData.status_toko ?? true)
    }
  }, [tokoData, form])

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
            <p className="text-muted-foreground">{tokoData.nama_toko}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Store Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Store Name */}
            <form.Field name="nama_toko">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="nama_toko">Store Name *</Label>
                  <Input
                    id="nama_toko"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Enter store name"
                    required
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-500">{field.state.meta.errors[0]}</p>
                  )}
                </div>
              )}
            </form.Field>

            {/* Sales Assignment with Optimized Select */}
            <form.Field name="id_sales">
              {(field) => (
                <div className="space-y-2">
                  <Label>Assigned Sales *</Label>
                  <SalesSelect
                    value={field.state.value}
                    onValueChange={field.handleChange}
                    placeholder="Select sales representative"
                    filters={{ activeOnly: true }}
                    disabled={salesLoading}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-500">{field.state.meta.errors[0]}</p>
                  )}
                </div>
              )}
            </form.Field>

            {/* Address */}
            <form.Field name="alamat">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="alamat">Address</Label>
                  <Textarea
                    id="alamat"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Enter complete address"
                    rows={3}
                  />
                </div>
              )}
            </form.Field>

            {/* Location Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <form.Field name="desa">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="desa">Village</Label>
                    <Input
                      id="desa"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Village name"
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="kecamatan">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="kecamatan">District</Label>
                    <Input
                      id="kecamatan"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="District name"
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="kabupaten">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="kabupaten">Regency</Label>
                    <Input
                      id="kabupaten"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Regency name"
                    />
                  </div>
                )}
              </form.Field>
            </div>

            {/* Google Maps Link */}
            <form.Field name="link_gmaps">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="link_gmaps">Google Maps Link</Label>
                  <Input
                    id="link_gmaps"
                    type="url"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="https://maps.google.com/..."
                  />
                </div>
              )}
            </form.Field>

            {/* Status */}
            <form.Field name="status_toko">
              {(field) => (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="status_toko"
                    checked={field.state.value}
                    onCheckedChange={field.handleChange}
                  />
                  <Label htmlFor="status_toko">Active Store</Label>
                </div>
              )}
            </form.Field>

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
                disabled={updateMutation.isPending || !form.state.isFormValid}
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