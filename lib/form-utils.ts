import { z } from 'zod'

// Common validation schemas
export const phoneSchema = z.string()
  .regex(/^(\+62|62|0)8[1-9][0-9]{6,9}$/, 'Format nomor telepon tidak valid')

export const emailSchema = z.string()
  .email('Format email tidak valid')

export const currencySchema = z.number()
  .min(0, 'Nilai harus lebih besar dari 0')

export const percentageSchema = z.number()
  .min(0, 'Persentase harus lebih besar dari 0')
  .max(100, 'Persentase tidak boleh lebih dari 100')

// Toko validation schema
export const tokoSchema = z.object({
  nama_toko: z.string()
    .min(2, 'Nama toko harus minimal 2 karakter')
    .max(100, 'Nama toko maksimal 100 karakter'),
  alamat: z.string()
    .min(5, 'Alamat harus minimal 5 karakter')
    .max(255, 'Alamat maksimal 255 karakter'),
  desa: z.string()
    .min(2, 'Nama desa harus minimal 2 karakter')
    .max(100, 'Nama desa maksimal 100 karakter'),
  kecamatan: z.string()
    .min(2, 'Nama kecamatan harus minimal 2 karakter')
    .max(100, 'Nama kecamatan maksimal 100 karakter'),
  kabupaten: z.string()
    .min(2, 'Nama kabupaten harus minimal 2 karakter')
    .max(100, 'Nama kabupaten maksimal 100 karakter'),
  pic_nama: z.string()
    .min(2, 'Nama PIC harus minimal 2 karakter')
    .max(100, 'Nama PIC maksimal 100 karakter'),
  pic_telepon: phoneSchema,
  link_gmaps: z.string()
    .url('Link Google Maps tidak valid')
    .optional()
    .or(z.literal('')),
  sales_id: z.string()
    .min(1, 'Sales harus dipilih'),
  status: z.enum(['aktif', 'nonaktif'], {
    required_error: 'Status harus dipilih'
  })
})

// Produk validation schema (sesuai dengan struktur database)
export const produkSchema = z.object({
  nama_produk: z.string()
    .min(2, 'Nama produk harus minimal 2 karakter')
    .max(255, 'Nama produk maksimal 255 karakter'),
  harga_satuan: currencySchema,
  status_produk: z.boolean({
    required_error: 'Status produk harus dipilih'
  })
})

// Sales validation schema
export const salesSchema = z.object({
  nama_sales: z.string()
    .min(2, 'Nama sales harus minimal 2 karakter')
    .max(100, 'Nama sales maksimal 100 karakter'),
  nomor_telepon: phoneSchema,
  email: emailSchema.optional().or(z.literal('')),
  alamat: z.string()
    .min(5, 'Alamat harus minimal 5 karakter')
    .max(255, 'Alamat maksimal 255 karakter'),
  target_penjualan: currencySchema,
  komisi_persen: percentageSchema,
  status_sales: z.boolean({
    required_error: 'Status sales harus dipilih'
  })
})

// Pengiriman validation schema
export const pengirimanSchema = z.object({
  toko_id: z.string()
    .min(1, 'Toko harus dipilih'),
  tanggal_kirim: z.string()
    .min(1, 'Tanggal kirim harus diisi'),
  catatan: z.string()
    .max(500, 'Catatan maksimal 500 karakter')
    .optional(),
  detail_pengiriman: z.array(z.object({
    produk_id: z.string().min(1, 'Produk harus dipilih'),
    jumlah_kirim: z.number().min(1, 'Jumlah kirim harus lebih dari 0')
  })).min(1, 'Minimal harus ada satu produk')
})

// Penagihan validation schema
export const penagihanSchema = z.object({
  toko_id: z.string()
    .min(1, 'Toko harus dipilih'),
  total_uang_diterima: currencySchema,
  metode_pembayaran: z.enum(['Cash', 'Transfer'], {
    required_error: 'Metode pembayaran harus dipilih'
  }),
  detail_penagihan: z.array(z.object({
    produk_id: z.string().min(1, 'Produk harus dipilih'),
    jumlah_terjual: z.number().min(0, 'Jumlah terjual tidak boleh negatif'),
    jumlah_kembali: z.number().min(0, 'Jumlah kembali tidak boleh negatif')
  })).min(1, 'Minimal harus ada satu produk'),
  potongan: z.object({
    jumlah_potongan: z.number().min(0, 'Jumlah potongan tidak boleh negatif'),
    alasan: z.string().max(255, 'Alasan maksimal 255 karakter').optional()
  }).optional()
})

// Setoran validation schema (sesuai dengan struktur database)
export const setoranSchema = z.object({
  total_setoran: currencySchema,
  penerima_setoran: z.string()
    .min(1, 'Penerima setoran harus diisi')
    .max(100, 'Penerima setoran maksimal 100 karakter')
})

// Form field types
export type TokoFormData = z.infer<typeof tokoSchema>
export type ProdukFormData = z.infer<typeof produkSchema>
export type SalesFormData = z.infer<typeof salesSchema>
export type PengirimanFormData = z.infer<typeof pengirimanSchema>
export type PenagihanFormData = z.infer<typeof penagihanSchema>
export type SetoranFormData = z.infer<typeof setoranSchema>

// Form field validation helper
export const validateField = <T>(
  schema: z.ZodSchema<T>,
  value: unknown
): { isValid: boolean; error?: string } => {
  const result = schema.safeParse(value)
  
  if (result.success) {
    return { isValid: true }
  }
  
  return {
    isValid: false,
    error: result.error.errors[0]?.message || 'Invalid value'
  }
}

// Currency formatting helper
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

// Date formatting helper
export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

// Form state type
export interface FormState {
  isSubmitting: boolean
  isValid: boolean
  isDirty: boolean
  errors: Record<string, string>
}