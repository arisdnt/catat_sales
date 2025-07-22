'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

import { formatCurrency } from '@/lib/form-utils'
import { useDeleteSalesMutation } from '@/lib/queries/sales'
// Materialized views removed - using direct queries
import { useComprehensivePrefetch } from '@/lib/hooks/use-smart-prefetch'
import { VirtualTableList } from '@/components/search'
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Phone,
  Store,
  Activity,
  Hash,
  MapPin,
  ShoppingCart,
  Truck,
  DollarSign,
  AlertCircle
} from 'lucide-react'

interface SalesDetailPageProps {
  params: { id: string }
}

export default function OptimizedSalesDetailPage({ params }: SalesDetailPageProps) {
  const router = useRouter()
  const salesId = parseInt(params.id)
  
  // Use optimized queries with materialized views
  // TODO: Replace with direct queries - materialized views removed  
  const salesData: any = null
  const salesLoading = false
  const salesError = null
  const storesData: any[] = []
  const storesLoading = false
  const shipmentsData: any[] = []
  const shipmentsLoading = false
  const billingsData: any[] = []
  const billingsLoading = false
  
  const deleteMutation = useDeleteSalesMutation()
  
  // Smart prefetching for navigation and related data
  const { prefetchEntity, prefetchOnInteraction } = useComprehensivePrefetch('sales')
  
  // Prefetch edit page data on component mount
  useEffect(() => {
    prefetchEntity('sales', salesId)
  }, [salesId, prefetchEntity])

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(salesId)
      router.push('/dashboard/master-data/sales')
    } catch (error) {
      console.error('Failed to delete sales:', error)
    }
  }

  const handleEditHover = (element: HTMLElement) => {
    prefetchOnInteraction(element, 'sales', salesId)
  }

  if (salesLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (salesError || !salesData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sales not found</h2>
          <p className="text-muted-foreground mb-4">
            The sales record you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  const recentShipments = Array.isArray(shipmentsData) ? shipmentsData.slice(0, 5) : []
  const salesStores = (storesData as any[]) || []

  return (
    <div className="container mx-auto p-6 space-y-6">
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
            <h1 className="text-2xl font-bold">{(salesData as any)?.nama_sales || 'Loading...'}</h1>
            <p className="text-muted-foreground">Sales Detail</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/master-data/sales/${salesId}/edit`)}
            onMouseEnter={(e) => handleEditHover(e.currentTarget)}
            className="flex items-center"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {(salesData as any)?.nama_sales || 'this sales'} and all related data. 
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center space-x-2">
        <Badge variant={(salesData as any)?.status_aktif ? 'default' : 'secondary'}>
          {(salesData as any)?.status_aktif ? 'Active' : 'Inactive'}
        </Badge>
        {((salesData as any)?.total_stores || 0) > 0 && (
          <Badge variant="outline">
            {(salesData as any)?.total_stores || 0} Store{((salesData as any)?.total_stores || 0) > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Stats Cards with optimized data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contact Info</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(salesData as any)?.nomor_telepon || 'No phone'}
            </div>
            <p className="text-xs text-muted-foreground">
              Phone number
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency((salesData as any)?.total_revenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              All time revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stores Managed</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(salesData as any)?.total_stores || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active stores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {(salesData as any)?.last_shipment_date ? 
                new Date((salesData as any).last_shipment_date).toLocaleDateString('id-ID') : 
                'No activity'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Last shipment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stores List with Virtual Scrolling */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Assigned Stores ({(salesStores as any[])?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {storesLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="ml-2">Loading stores...</span>
            </div>
          ) : (salesStores as any[])?.length > 0 ? (
            <VirtualTableList
              items={salesStores as any[]}
              renderRow={(store: any, index: number) => (
                <div 
                  key={store.id_toko}
                  className="flex items-center justify-between p-3 border-b hover:bg-muted/50 cursor-pointer"
                  onClick={() => router.push(`/dashboard/master-data/toko/${store.id_toko}`)}
                  onMouseEnter={(e) => prefetchOnInteraction(e.currentTarget, 'toko', store.id_toko)}
                >
                  <div>
                    <h4 className="font-medium">{store.nama_toko}</h4>
                    <p className="text-sm text-muted-foreground">
                      {[store.kecamatan, store.kabupaten].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <Badge variant={store.status_toko ? 'default' : 'secondary'}>
                    {store.status_toko ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              )}
              maxHeight={400}
              rowHeight={70}
            />
          ) : (
            <div className="text-center py-8">
              <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No stores assigned yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity with Virtual Scrolling */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Truck className="h-5 w-5 mr-2" />
            Recent Shipments ({recentShipments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {shipmentsLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="ml-2">Loading shipments...</span>
            </div>
          ) : recentShipments.length > 0 ? (
            <VirtualTableList
              items={recentShipments as any[]}
              renderRow={(shipment: any, index: number) => (
                <div 
                  key={shipment.id_pengiriman}
                  className="flex items-center justify-between p-3 border-b hover:bg-muted/50 cursor-pointer"
                  onClick={() => router.push(`/dashboard/pengiriman/${shipment.id_pengiriman}`)}
                  onMouseEnter={(e) => prefetchOnInteraction(e.currentTarget, 'pengiriman', shipment.id_pengiriman)}
                >
                  <div>
                    <h4 className="font-medium">{shipment.nama_toko}</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(shipment.tanggal_kirim).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{shipment.total_items || 0} items</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(shipment.total_value || 0)}
                    </p>
                  </div>
                </div>
              )}
              maxHeight={300}
              rowHeight={70}
            />
          ) : (
            <div className="text-center py-8">
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No recent shipments</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}