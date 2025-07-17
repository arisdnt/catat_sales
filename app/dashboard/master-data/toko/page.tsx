'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Eye,
  Edit,
  Trash2,
  MapPin,
  Plus,
  Download,
  RefreshCw,
  Store,
  Users,
  Phone,
  ExternalLink
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

import { DataTable, createSortableHeader, createStatusBadge, formatCurrency } from '@/components/shared/data-table'

interface Toko {
  id: string
  nama_toko: string
  alamat: string
  desa: string
  kecamatan: string
  kabupaten: string
  sales_nama: string
  status: 'aktif' | 'nonaktif'
  pic_nama: string
  pic_telepon: string
  pic_whatsapp: string
  link_gmaps: string
  created_at: string
  updated_at: string
}

const statusConfig = {
  aktif: { label: 'Aktif', color: 'bg-green-100 text-green-800 border-green-200' },
  nonaktif: { label: 'Non-aktif', color: 'bg-red-100 text-red-800 border-red-200' }
}

export default function TokoTablePage() {
  const [data, setData] = useState<Toko[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const columns = useMemo<ColumnDef<Toko>[]>(
    () => [
      {
        accessorKey: 'nama_toko',
        header: createSortableHeader('Nama Toko'),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Store className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">{row.getValue('nama_toko')}</div>
              <div className="text-sm text-gray-500">{row.original.desa}</div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'sales_nama',
        header: createSortableHeader('Sales'),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900">{row.getValue('sales_nama')}</span>
          </div>
        ),
      },
      {
        accessorKey: 'alamat',
        header: 'Alamat',
        cell: ({ row }) => (
          <div className="max-w-[200px]">
            <div className="text-sm text-gray-900 truncate">{row.getValue('alamat')}</div>
            <div className="text-xs text-gray-500">
              {row.original.kecamatan}, {row.original.kabupaten}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'pic_nama',
        header: createSortableHeader('PIC'),
        cell: ({ row }) => (
          <div>
            <div className="text-sm font-medium text-gray-900">{row.getValue('pic_nama')}</div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {row.original.pic_telepon}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'kabupaten',
        header: createSortableHeader('Kabupaten'),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900">{row.getValue('kabupaten')}</span>
          </div>
        ),
      },
      {
         accessorKey: 'status',
         header: createSortableHeader('Status'),
         cell: ({ row }) => createStatusBadge(row.getValue('status'), statusConfig),
       },
    ],
    []
  )



  useEffect(() => {
    fetchStores()
  }, [])

  const fetchStores = async () => {
    try {
      // Generate 100 mock stores dengan data yang realistis
      const mockStores: Toko[] = Array.from({ length: 100 }, (_, i) => {
        const storeNames = [
          'Toko Berkah Jaya', 'Warung Sari Melati', 'Minimarket Bahagia', 'Toko Serba Ada',
          'Warung Keluarga', 'Toko Bangunan', 'Minimarket 24 Jam', 'Warung Bu Tini',
          'Toko Elektronik', 'Warung Kopi', 'Toko Kelontong', 'Minimarket Swalayan',
          'Toko Sejahtera', 'Warung Fresh', 'Toko Alat Tulis', 'Warung Nasi',
          'Toko Obat', 'Minimarket Keluarga', 'Warung Bakso', 'Toko Pakaian',
          'Minimarket Berkah', 'Warung Pecel', 'Toko Sepatu', 'Minimarket Sumber',
          'Warung Soto', 'Toko Bunga', 'Minimarket Sinar', 'Warung Ayam',
          'Toko Handphone', 'Minimarket Global', 'Warung Bakmi', 'Toko Sepeda',
          'Minimarket Bintang', 'Warung Mitra', 'Toko Modern', 'Minimarket Cahaya',
          'Warung Gudeg', 'Toko Elektronik', 'Minimarket Harapan', 'Warung Rawon',
          'Toko Jam', 'Minimarket Mentari', 'Warung Nasi Padang', 'Toko Kacamata',
          'Warung Berkah', 'Toko Komputer', 'Minimarket Rejeki', 'Warung Empal',
          'Toko Mainan', 'Minimarket Lima'
        ]
        
        const salesNames = [
          'Ahmad Susanto', 'Budi Santoso', 'Citra Dewi', 'Denny Prasetyo', 'Eka Sari',
          'Farid Rahman', 'Gita Indira', 'Hadi Nugroho', 'Ika Putri'
        ]
        
        const kabupatenList = [
          'Kab. Sukabumi', 'Kab. Bogor', 'Kab. Cianjur', 'Kab. Bandung',
          'Kab. Garut', 'Kab. Tasikmalaya', 'Kota Cirebon', 'Kab. Cirebon',
          'Kab. Kuningan', 'Kab. Subang'
        ]
        
        const kecamatanList = [
          'Kec. Sukamaju', 'Kec. Makmur', 'Kec. Damai', 'Kec. Ciawi',
          'Kec. Sentosa', 'Kec. Mande', 'Kec. Dayeuhkolot', 'Kec. Bojongsoang',
          'Kec. Tarogong Kidul', 'Kec. Tawang', 'Kec. Sukarame', 'Kec. Kejaksan'
        ]
        
        const desaList = [
          'Sukamaju', 'Makmur Jaya', 'Damai Sejahtera', 'Ciawi Hilir',
          'Sentosa Indah', 'Mande', 'Dayeuhkolot', 'Bojongsoang',
          'Tarogong Kidul', 'Cihideung', 'Sukarame', 'Kejaksan'
        ]
        
        const picNames = [
          'Ahmad Suharto', 'Budi Setiawan', 'Citra Sari', 'Denny Irawan',
          'Eka Wulandari', 'Farid Hakim', 'Gita Maharani', 'Hadi Pranoto',
          'Ika Safitri', 'Joko Susilo', 'Kiki Amalia', 'Lina Sari',
          'Maya Indah', 'Nana Suryani', 'Oki Setiawan', 'Putu Ayu'
        ]
        
        const storeName = storeNames[i % storeNames.length]
        const salesName = salesNames[i % salesNames.length]
        const kabupaten = kabupatenList[i % kabupatenList.length]
        const kecamatan = kecamatanList[i % kecamatanList.length]
        const desa = desaList[i % desaList.length]
        const picName = picNames[i % picNames.length]
        
        return {
          id: (i + 1).toString(),
          nama_toko: `${storeName} ${i + 1}`,
          alamat: `Jl. Raya No. ${100 + i}`,
          desa: desa,
          kecamatan: kecamatan,
          kabupaten: kabupaten,
          sales_nama: salesName,
          status: i === 99 ? 'nonaktif' : 'aktif', // 1 toko nonaktif
          pic_nama: picName,
          pic_telepon: `0812345678${(i % 100).toString().padStart(2, '0')}`,
          pic_whatsapp: `0812345678${(i % 100).toString().padStart(2, '0')}`,
          link_gmaps: `https://goo.gl/maps/example${i + 1}`,
          created_at: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
          updated_at: new Date().toISOString()
        }
      })
      
      setData(mockStores)
    } catch (error) {
      console.error('Error fetching stores:', error)
      toast({
        title: 'Error',
        description: 'Gagal memuat data toko',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus toko ini?')) {
      try {
        setData(data.filter(s => s.id !== id))
        toast({
          title: 'Berhasil',
          description: 'Toko berhasil dihapus'
        })
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Gagal menghapus toko',
          variant: 'destructive'
        })
      }
    }
  }

  const stats = {
    totalStores: data.length,
    activeStores: data.filter(s => s.status === 'aktif').length,
    inactiveStores: data.filter(s => s.status === 'nonaktif').length,
    newThisMonth: data.filter(s => {
      const created = new Date(s.created_at)
      const now = new Date()
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
    }).length
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">

      <DataTable 
         data={data}
         columns={columns}
         title="Daftar Toko"
         description={`Terdapat total ${stats.totalStores} toko, ${stats.activeStores} aktif, ${stats.inactiveStores} nonaktif, dan ${stats.newThisMonth} baru bulan ini`}
         searchPlaceholder="Cari toko..."
         onAdd={() => window.location.href = '/dashboard/master-data/toko/add'}
         onExport={() => {
           toast({
             title: "Export Data",
             description: "Data toko berhasil diexport",
           })
         }}
         onRefresh={() => {
           setLoading(true)
           // Simulate refresh
           setTimeout(() => setLoading(false), 1000)
         }}
         addButtonLabel="Tambah Toko"
         loading={loading}
         emptyStateMessage="Belum ada data toko"
         emptyStateIcon={Store}
         filters={[
           {
             key: 'status',
             label: 'Status',
             type: 'select',
             options: [
               { label: 'Aktif', value: 'aktif' },
               { label: 'Non-aktif', value: 'nonaktif' }
             ]
           },
           {
             key: 'kabupaten',
             label: 'Kabupaten',
             type: 'select',
             options: Array.from(new Set(data.map(item => item.kabupaten))).map(kabupaten => ({
               label: kabupaten,
               value: kabupaten
             }))
           },
           {
             key: 'sales_nama',
             label: 'Sales',
             type: 'select',
             options: Array.from(new Set(data.map(item => item.sales_nama))).map(sales => ({
               label: sales,
               value: sales
             }))
           }
         ]}
         actions={[
           {
             label: 'Lihat di Maps',
             icon: MapPin,
             onClick: (row) => window.open(row.link_gmaps, '_blank'),
             className: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
           },
           {
             label: 'Lihat Detail',
             icon: Eye,
             onClick: (row) => window.location.href = `/dashboard/master-data/toko/${row.id}`,
             className: 'text-green-600 hover:text-green-700 hover:bg-green-50'
           },
           {
             label: 'Edit',
             icon: Edit,
             onClick: (row) => window.location.href = `/dashboard/master-data/toko/${row.id}/edit`,
             className: 'text-gray-600 hover:text-gray-700 hover:bg-gray-50'
           },
           {
             label: 'Hapus',
             icon: Trash2,
             onClick: (row) => handleDelete(row.id),
             className: 'text-red-600 hover:text-red-700 hover:bg-red-50'
           }
         ]}
       />
    </div>
  )
}