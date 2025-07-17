export interface Database {
  public: {
    Tables: {
      sales: {
        Row: {
          id_sales: number
          nama_sales: string
          nomor_telepon: string | null
          status_aktif: boolean
          dibuat_pada: string
          diperbarui_pada: string
        }
        Insert: {
          id_sales?: number
          nama_sales: string
          nomor_telepon?: string | null
          status_aktif?: boolean
          dibuat_pada?: string
          diperbarui_pada?: string
        }
        Update: {
          id_sales?: number
          nama_sales?: string
          nomor_telepon?: string | null
          status_aktif?: boolean
          dibuat_pada?: string
          diperbarui_pada?: string
        }
      }
      produk: {
        Row: {
          id_produk: number
          nama_produk: string
          harga_satuan: number
          status_produk: boolean
          is_priority: boolean | null
          priority_order: number | null
          dibuat_pada: string
          diperbarui_pada: string
        }
        Insert: {
          id_produk?: number
          nama_produk: string
          harga_satuan: number
          status_produk?: boolean
          is_priority?: boolean | null
          priority_order?: number | null
          dibuat_pada?: string
          diperbarui_pada?: string
        }
        Update: {
          id_produk?: number
          nama_produk?: string
          harga_satuan?: number
          status_produk?: boolean
          is_priority?: boolean | null
          priority_order?: number | null
          dibuat_pada?: string
          diperbarui_pada?: string
        }
      }
      toko: {
        Row: {
          id_toko: number
          id_sales: number
          nama_toko: string
          alamat: string | null
          desa: string | null
          kecamatan: string | null
          kabupaten: string | null
          link_gmaps: string | null
          status_toko: boolean
          dibuat_pada: string
          diperbarui_pada: string
        }
        Insert: {
          id_toko?: number
          id_sales: number
          nama_toko: string
          alamat?: string | null
          desa?: string | null
          kecamatan?: string | null
          kabupaten?: string | null
          link_gmaps?: string | null
          status_toko?: boolean
          dibuat_pada?: string
          diperbarui_pada?: string
        }
        Update: {
          id_toko?: number
          id_sales?: number
          nama_toko?: string
          alamat?: string | null
          desa?: string | null
          kecamatan?: string | null
          kabupaten?: string | null
          link_gmaps?: string | null
          status_toko?: boolean
          dibuat_pada?: string
          diperbarui_pada?: string
        }
      }
      pengiriman: {
        Row: {
          id_pengiriman: number
          id_toko: number
          tanggal_kirim: string
          id_bulk_pengiriman: number | null
          dibuat_pada: string
          diperbarui_pada: string
        }
        Insert: {
          id_pengiriman?: number
          id_toko: number
          tanggal_kirim: string
          id_bulk_pengiriman?: number | null
          dibuat_pada?: string
          diperbarui_pada?: string
        }
        Update: {
          id_pengiriman?: number
          id_toko?: number
          tanggal_kirim?: string
          id_bulk_pengiriman?: number | null
          dibuat_pada?: string
          diperbarui_pada?: string
        }
      }
      bulk_pengiriman: {
        Row: {
          id_bulk_pengiriman: number
          id_sales: number
          tanggal_kirim: string
          total_toko: number
          total_item: number
          keterangan: string | null
          dibuat_pada: string
          diperbarui_pada: string
        }
        Insert: {
          id_bulk_pengiriman?: number
          id_sales: number
          tanggal_kirim: string
          total_toko: number
          total_item: number
          keterangan?: string | null
          dibuat_pada?: string
          diperbarui_pada?: string
        }
        Update: {
          id_bulk_pengiriman?: number
          id_sales?: number
          tanggal_kirim?: string
          total_toko?: number
          total_item?: number
          keterangan?: string | null
          dibuat_pada?: string
          diperbarui_pada?: string
        }
      }
      detail_pengiriman: {
        Row: {
          id_detail_kirim: number
          id_pengiriman: number
          id_produk: number
          jumlah_kirim: number
          dibuat_pada: string
          diperbarui_pada: string
        }
        Insert: {
          id_detail_kirim?: number
          id_pengiriman: number
          id_produk: number
          jumlah_kirim: number
          dibuat_pada?: string
          diperbarui_pada?: string
        }
        Update: {
          id_detail_kirim?: number
          id_pengiriman?: number
          id_produk?: number
          jumlah_kirim?: number
          dibuat_pada?: string
          diperbarui_pada?: string
        }
      }
      penagihan: {
        Row: {
          id_penagihan: number
          id_toko: number
          total_uang_diterima: number
          metode_pembayaran: 'Cash' | 'Transfer'
          ada_potongan: boolean
          dibuat_pada: string
          diperbarui_pada: string
        }
        Insert: {
          id_penagihan?: number
          id_toko: number
          total_uang_diterima: number
          metode_pembayaran: 'Cash' | 'Transfer'
          ada_potongan?: boolean
          dibuat_pada?: string
          diperbarui_pada?: string
        }
        Update: {
          id_penagihan?: number
          id_toko?: number
          total_uang_diterima?: number
          metode_pembayaran?: 'Cash' | 'Transfer'
          ada_potongan?: boolean
          dibuat_pada?: string
          diperbarui_pada?: string
        }
      }
      detail_penagihan: {
        Row: {
          id_detail_tagih: number
          id_penagihan: number
          id_produk: number
          jumlah_terjual: number
          jumlah_kembali: number
          dibuat_pada: string
          diperbarui_pada: string
        }
        Insert: {
          id_detail_tagih?: number
          id_penagihan: number
          id_produk: number
          jumlah_terjual: number
          jumlah_kembali: number
          dibuat_pada?: string
          diperbarui_pada?: string
        }
        Update: {
          id_detail_tagih?: number
          id_penagihan?: number
          id_produk?: number
          jumlah_terjual?: number
          jumlah_kembali?: number
          dibuat_pada?: string
          diperbarui_pada?: string
        }
      }
      potongan_penagihan: {
        Row: {
          id_potongan: number
          id_penagihan: number
          jumlah_potongan: number
          alasan: string | null
          dibuat_pada: string
          diperbarui_pada: string
        }
        Insert: {
          id_potongan?: number
          id_penagihan: number
          jumlah_potongan: number
          alasan?: string | null
          dibuat_pada?: string
          diperbarui_pada?: string
        }
        Update: {
          id_potongan?: number
          id_penagihan?: number
          jumlah_potongan?: number
          alasan?: string | null
          dibuat_pada?: string
          diperbarui_pada?: string
        }
      }
      setoran: {
        Row: {
          id_setoran: number
          total_setoran: number
          penerima_setoran: string
          dibuat_pada: string
          diperbarui_pada: string
        }
        Insert: {
          id_setoran?: number
          total_setoran: number
          penerima_setoran: string
          dibuat_pada?: string
          diperbarui_pada?: string
        }
        Update: {
          id_setoran?: number
          total_setoran?: number
          penerima_setoran?: string
          dibuat_pada?: string
          diperbarui_pada?: string
        }
      }
    }
    Views: {
      v_laporan_pengiriman: {
        Row: {
          id_pengiriman: number
          tanggal_kirim: string
          nama_toko: string
          nama_sales: string
          nama_produk: string
          jumlah_kirim: number
          nilai_kirim: number
        }
      }
      v_laporan_penagihan: {
        Row: {
          id_penagihan: number
          tanggal_tagih: string
          nama_toko: string
          nama_sales: string
          nama_produk: string
          jumlah_terjual: number
          jumlah_kembali: number
          nilai_terjual: number
          total_uang_diterima: number
          metode_pembayaran: string
          ada_potongan: boolean
        }
      }
      v_rekonsiliasi_setoran: {
        Row: {
          id_setoran: number
          tanggal_setoran: string
          total_setoran: number
          penerima_setoran: string
          total_penagihan_cash: number
          selisih: number
        }
      }
      v_produk_prioritas: {
        Row: {
          id_produk: number
          nama_produk: string
          harga_satuan: number
          priority_order: number
          status_produk: boolean
        }
      }
      v_produk_non_prioritas: {
        Row: {
          id_produk: number
          nama_produk: string
          harga_satuan: number
          status_produk: boolean
        }
      }
    }
  }
}