'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { useToast } from '@/components/ui/use-toast'
import { 
  Search,
  Plus, 
  Edit,
  Trash2,
  Star,
  Package,
  DollarSign,
  TrendingUp,
  Activity,
  Loader2
} from 'lucide-react'
import { formatCurrency } from '@/lib/form-utils'

interface Produk {
  id_produk: number
  nama_produk: string
  harga_satuan: number
  status_produk: boolean
  is_priority: boolean
  priority_order: number
  total_terjual: number
  total_kirim: number
  total_revenue: number
  sisa_stok_estimated: number
}

interface ProdukStats {
  total_produk: number
  produk_aktif: number
  produk_non_aktif: number
  produk_priority: number
  total_nilai_produk: number
  total_terkirim: number
  total_terjual: number
  sisa_stok_total: number
}

export default function ProdukPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [products, setProducts] = useState<Produk[]>([])
  const [stats, setStats] = useState<ProdukStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('semua')
  const [priorityFilter, setPriorityFilter] = useState('semua')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const fetchProducts = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        search: searchTerm,
        status: statusFilter,
        priority: priorityFilter,
        page: currentPage.toString(),
        limit: '20'
      })

      const [productsRes, statsRes] = await Promise.all([
        fetch(`/api/produk?${params}`),
        fetch('/api/produk?action=stats')
      ])

      if (!productsRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const productsData = await productsRes.json()
      const statsData = await statsRes.json()

      setProducts(productsData.data)
      setTotalPages(productsData.pagination.totalPages)
      setStats(statsData)
    } catch (error) {
      console.error('Error fetching products:', error)
      toast({
        title: "Error",
        description: "Gagal memuat data produk",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [searchTerm, statusFilter, priorityFilter, currentPage])

  const handleDelete = async (id: number) => {
    try {
      setDeletingId(id)
      const response = await fetch(`/api/produk/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete product')
      }

      toast({
        title: "Berhasil",
        description: "Produk berhasil dihapus",
      })

      fetchProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
      toast({
        title: "Error",
        description: "Gagal menghapus produk",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('semua')
    setPriorityFilter('semua')
    setCurrentPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Master Data Produk</h1>
          <p className="text-muted-foreground">
            Kelola data produk dan pantau performa penjualan
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/master-data/produk/add')}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Produk
        </Button>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_produk}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Produk Aktif</CardTitle>
                <Activity className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.produk_aktif}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Produk Non-Aktif</CardTitle>
                <Activity className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.produk_non_aktif}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Produk Priority</CardTitle>
                <Star className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.produk_priority}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Nilai</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.total_nilai_produk)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Terkirim</CardTitle>
                <Package className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.total_terkirim?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Semua produk yang telah dikirim
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Terjual</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats.total_terjual?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Semua produk yang telah terjual
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sisa Stok Total</CardTitle>
                <Activity className={`h-4 w-4 ${
                  (stats.sisa_stok_total || 0) < 0 ? 'text-red-500' : 
                  (stats.sisa_stok_total || 0) === 0 ? 'text-yellow-500' :
                  'text-green-500'
                }`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  (stats.sisa_stok_total || 0) < 0 ? 'text-red-600' : 
                  (stats.sisa_stok_total || 0) === 0 ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {(stats.sisa_stok_total || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Terkirim - Terjual
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tingkat Penjualan</CardTitle>
                <DollarSign className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {stats.total_terkirim > 0 
                    ? `${Math.round((stats.total_terjual / stats.total_terkirim) * 100)}%`
                    : '0%'
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  Rasio terjual dari terkirim
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filter & Pencarian</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Cari Produk</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nama produk..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Status</SelectItem>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="non-aktif">Non-Aktif</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="non-priority">Non-Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={resetFilters}>
                Reset Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Produk</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Produk</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Total Terkirim</TableHead>
                    <TableHead>Total Terjual</TableHead>
                    <TableHead>Sisa Stok</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        Tidak ada data produk
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product) => (
                      <TableRow key={product.id_produk}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {product.is_priority && (
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            )}
                            <span className="font-medium">{product.nama_produk}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(product.harga_satuan)}</TableCell>
                        <TableCell>
                          <Badge variant={product.status_produk ? "default" : "secondary"}>
                            {product.status_produk ? 'Aktif' : 'Non-Aktif'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.is_priority ? "default" : "outline"}>
                            {product.is_priority ? `Priority (${product.priority_order})` : 'Normal'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Package className="h-4 w-4 text-blue-500" />
                            <span className="font-medium text-blue-600">
                              {product.total_kirim.toLocaleString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            <span className="font-medium text-green-600">
                              {product.total_terjual.toLocaleString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Activity className={`h-4 w-4 ${
                              product.sisa_stok_estimated < 0 ? 'text-red-500' : 
                              product.sisa_stok_estimated === 0 ? 'text-yellow-500' :
                              'text-green-500'
                            }`} />
                            <span className={`font-bold ${
                              product.sisa_stok_estimated < 0 ? 'text-red-600' : 
                              product.sisa_stok_estimated === 0 ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {product.sisa_stok_estimated.toLocaleString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-4 w-4 text-purple-500" />
                            <span className="font-medium text-purple-600">
                              {formatCurrency(product.total_revenue)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/dashboard/master-data/produk/${product.id_produk}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Apakah Anda yakin ingin menghapus produk "{product.nama_produk}"?
                                    Tindakan ini tidak dapat dibatalkan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(product.id_produk)}
                                    disabled={deletingId === product.id_produk}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    {deletingId === product.id_produk ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : null}
                                    Hapus
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-4">
                  <Button
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}