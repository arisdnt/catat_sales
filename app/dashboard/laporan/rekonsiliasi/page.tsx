'use client'

import { useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Eye,
  CheckCircle,
  AlertTriangle,
  Users,
  Building,
  FileText,
  BarChart3
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useLaporanQuery, type RekonsiliasiData } from '@/lib/queries/laporan'
import { DataTable, createSortableHeader, createStatusBadge, formatCurrency, formatDate } from '@/components/shared/data-table'
import { exportReconciliationData } from '@/lib/excel-export'

export default function RekonsiliasiPage() {
  const { data: response, isLoading, error, refetch } = useLaporanQuery('rekonsiliasi')
  const reconData = (response as any)?.data || []
  const { toast } = useToast()

  const columns = useMemo<ColumnDef<RekonsiliasiData>[]>(() => [
    {
      accessorKey: 'id_setoran',
      header: createSortableHeader('ID Setoran'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">#{row.getValue('id_setoran')}</div>
            <div className="text-sm text-gray-500">
              {formatDate(row.original.tanggal_setoran)}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'penerima_setoran',
      header: createSortableHeader('Penerima'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-900">{row.getValue('penerima_setoran')}</span>
        </div>
      ),
    },
    {
      accessorKey: 'total_setoran',
      header: createSortableHeader('Total Setoran'),
      cell: ({ row }) => (
        <div className="text-right font-medium text-gray-900">
          {formatCurrency(row.getValue('total_setoran'))}
        </div>
      ),
    },
    {
      accessorKey: 'total_penagihan_cash',
      header: createSortableHeader('Total Penagihan Cash'),
      cell: ({ row }) => (
        <div className="text-right font-medium text-gray-900">
          {formatCurrency(row.getValue('total_penagihan_cash'))}
        </div>
      ),
    },
    {
      accessorKey: 'selisih',
      header: createSortableHeader('Selisih'),
      cell: ({ row }) => {
        const selisih = row.getValue('selisih') as number
        const isMatch = selisih === 0
        return (
          <div className="text-right">
            <div className={`font-medium ${isMatch ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(selisih)}
            </div>
            <div className="flex items-center justify-end gap-1 mt-1">
              {isMatch ? (
                <CheckCircle className="w-3 h-3 text-green-500" />
              ) : (
                <AlertTriangle className="w-3 h-3 text-red-500" />
              )}
              <span className={`text-xs ${isMatch ? 'text-green-600' : 'text-red-600'}`}>
                {isMatch ? 'Sesuai' : 'Selisih'}
              </span>
            </div>
          </div>
        )
      },
    },
  ], [])

  const stats = {
    totalRecords: (reconData as any[]).length,
    matchingRecords: (reconData as any[]).filter((r: any) => r.selisih === 0).length,
    differenceRecords: (reconData as any[]).filter((r: any) => r.selisih !== 0).length,
    totalSetoran: (reconData as any[]).reduce((sum: number, r: any) => sum + r.total_setoran, 0),
    totalPenagihan: (reconData as any[]).reduce((sum: number, r: any) => sum + r.total_penagihan_cash, 0),
    totalSelisih: (reconData as any[]).reduce((sum: number, r: any) => sum + Math.abs(r.selisih), 0),
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="text-red-600 mb-4">Error loading reconciliation data</div>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      <DataTable
        data={reconData}
        columns={columns}
        title="Laporan Rekonsiliasi Setoran"
        description={`Terdapat total ${stats.totalRecords} rekonsiliasi, ${stats.matchingRecords} sesuai, ${stats.differenceRecords} selisih, total selisih ${formatCurrency(stats.totalSelisih)}`}
        searchPlaceholder="Cari rekonsiliasi..."
        onExport={() => {
          const result = exportReconciliationData(reconData)
          if (result.success) {
            toast({
              title: "Export Data",
              description: `Data rekonsiliasi berhasil diexport ke ${result.filename}`,
            })
          } else {
            toast({
              title: "Export Error",
              description: result.error || "Terjadi kesalahan saat export",
              variant: "destructive",
            })
          }
        }}
        onRefresh={() => refetch()}
        loading={isLoading}
        emptyStateMessage="Tidak ada data rekonsiliasi ditemukan."
        emptyStateIcon={BarChart3}
        showAddButton={false}
        filters={[
          {
            key: 'selisih',
            label: 'Status',
            type: 'select',
            options: [
              { value: 'all', label: 'Semua' },
              { value: '0', label: 'Sesuai' },
              { value: 'diff', label: 'Selisih' }
            ]
          }
        ]}
        actions={[
          {
            label: 'Lihat Detail',
            icon: Eye,
            onClick: (row: RekonsiliasiData) => {
              toast({
                title: "Detail Rekonsiliasi",
                description: `Melihat detail rekonsiliasi setoran #${row.id_setoran}`,
              })
            },
            variant: 'view'
          }
        ]}
      />
    </div>
  )
}