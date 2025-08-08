import { createClient } from '@/lib/supabase'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { handleAdminApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

const pengeluaranSchema = z.object({
  jumlah: z.number().positive('Jumlah harus lebih dari 0'),
  keterangan: z.string().min(1, 'Keterangan tidak boleh kosong'),
  tanggal_pengeluaran: z.string().datetime('Format tanggal tidak valid'),
})

// GET single pengeluaran
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleAdminApiRequest(request, async () => {
    const supabase = createClient()
    const { id } = await params

    if (!id) {
      return createErrorResponse('ID pengeluaran diperlukan', 400)
    }

    const { data, error } = await supabase
      .from('pengeluaran_operasional')
      .select('*')
      .eq('id_pengeluaran', id)
      .single()

    if (error) {
      console.error('Database error:', error)
      return createErrorResponse('Pengeluaran tidak ditemukan', 404)
    }

    return createSuccessResponse(data)
  })
}

// PUT update pengeluaran
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleAdminApiRequest(request, async () => {
    const supabase = createClient()
    const { id } = await params
    const formData = await request.formData()
    
    if (!id) {
      return createErrorResponse('ID pengeluaran diperlukan', 400)
    }

    // Extract form data
    const jumlah = parseFloat(formData.get('jumlah') as string)
    const keterangan = formData.get('keterangan') as string
    const tanggal_pengeluaran = formData.get('tanggal_pengeluaran') as string
    const bukti_foto = formData.get('bukti_foto') as File | null

    // Validate required fields
    const validationResult = pengeluaranSchema.safeParse({
      jumlah,
      keterangan,
      tanggal_pengeluaran
    })

    if (!validationResult.success) {
      return createErrorResponse('Validation failed', 400)
    }

    // Get existing record
    const { data: existingRecord, error: fetchError } = await supabase
      .from('pengeluaran_operasional')
      .select('url_bukti_foto')
      .eq('id_pengeluaran', id)
      .single()

    if (fetchError) {
      return createErrorResponse('Pengeluaran tidak ditemukan', 404)
    }

    let url_bukti_foto = existingRecord.url_bukti_foto

    // Handle file upload if new file provided
    if (bukti_foto && bukti_foto.size > 0) {
      // Validate file type and size
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg']
      const maxSize = 5 * 1024 * 1024 // 5MB

      if (!allowedTypes.includes(bukti_foto.type)) {
        return createErrorResponse('Invalid file type. Only JPEG and PNG are allowed.', 400)
      }

      if (bukti_foto.size > maxSize) {
        return createErrorResponse('File size too large. Maximum 5MB allowed.', 400)
      }

      // Delete old file if exists
      if (existingRecord.url_bukti_foto) {
        const oldFileName = existingRecord.url_bukti_foto.split('/').pop()
        if (oldFileName) {
          await supabase.storage
            .from('bukti-pengeluaran')
            .remove([oldFileName])
        }
      }

      // Generate unique filename
      const timestamp = Date.now()
      const fileExtension = bukti_foto.name.split('.').pop()
      const fileName = `pengeluaran_${timestamp}.${fileExtension}`

      // Upload new file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('bukti-pengeluaran')
        .upload(fileName, bukti_foto, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return createErrorResponse('Failed to upload file', 500)
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('bukti-pengeluaran')
        .getPublicUrl(fileName)
      
      url_bukti_foto = urlData.publicUrl
    }

    // Update data in database
    const { data, error } = await supabase
      .from('pengeluaran_operasional')
      .update({
        jumlah,
        keterangan,
        tanggal_pengeluaran,
        url_bukti_foto
      })
      .eq('id_pengeluaran', id)
      .select()
      .single()

    if (error) {
      console.error('Database update error:', error)
      return createErrorResponse('Failed to update pengeluaran', 500)
    }

    return createSuccessResponse(
      { message: 'Pengeluaran berhasil diperbarui', data }
    )
  })
}

// DELETE pengeluaran
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleAdminApiRequest(request, async () => {
    const supabase = createClient()
    const { id } = await params

    if (!id) {
      return createErrorResponse('ID pengeluaran diperlukan', 400)
    }

    // Get the record first to check if it has a file to delete
    const { data: existingRecord, error: fetchError } = await supabase
      .from('pengeluaran_operasional')
      .select('url_bukti_foto')
      .eq('id_pengeluaran', id)
      .single()

    if (fetchError) {
      return createErrorResponse('Pengeluaran tidak ditemukan', 404)
    }

    // Delete the record
    const { error: deleteError } = await supabase
      .from('pengeluaran_operasional')
      .delete()
      .eq('id_pengeluaran', id)

    if (deleteError) {
      console.error('Database delete error:', deleteError)
      return createErrorResponse('Failed to delete pengeluaran', 500)
    }

    // Delete associated file if exists
    if (existingRecord.url_bukti_foto) {
      const fileName = existingRecord.url_bukti_foto.split('/').pop()
      if (fileName) {
        await supabase.storage
          .from('bukti-pengeluaran')
          .remove([fileName])
      }
    }

    return createSuccessResponse(
      { message: 'Pengeluaran berhasil dihapus' }
    )
  })
}