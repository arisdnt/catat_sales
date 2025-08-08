'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useCreatePengeluaran } from '@/lib/queries/pengeluaran'

const formSchema = z.object({
  jumlah: z.number().positive('Jumlah harus lebih dari 0'),
  keterangan: z.string().min(1, 'Keterangan tidak boleh kosong'),
  tanggal_pengeluaran: z.string().min(1, 'Tanggal pengeluaran harus diisi'),
  bukti_foto: z.instanceof(File).optional(),
})

type FormData = z.infer<typeof formSchema>

interface PengeluaranFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PengeluaranForm({ open, onOpenChange }: PengeluaranFormProps) {
  const { toast } = useToast()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  
  const createMutation = useCreatePengeluaran()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jumlah: 0,
      keterangan: '',
      tanggal_pengeluaran: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm
    },
  })

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg']
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Error',
          description: 'Hanya file JPEG dan PNG yang diperbolehkan',
          variant: 'destructive',
        })
        return
      }

      // Validate file size (5MB)
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        toast({
          title: 'Error',
          description: 'Ukuran file maksimal 5MB',
          variant: 'destructive',
        })
        return
      }

      setSelectedFile(file)
      form.setValue('bukti_foto', file)
      
      // Create preview URL
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    form.setValue('bukti_foto', undefined)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  const onSubmit = async (data: FormData) => {
    try {
      const formData = new FormData()
      formData.append('jumlah', data.jumlah.toString())
      formData.append('keterangan', data.keterangan)
      formData.append('tanggal_pengeluaran', new Date(data.tanggal_pengeluaran).toISOString())
      
      if (data.bukti_foto) {
        formData.append('bukti_foto', data.bukti_foto)
      }

      await createMutation.mutateAsync(formData)
      
      toast({
        title: 'Berhasil',
        description: 'Pengeluaran berhasil disimpan',
      })
      
      // Reset form and close dialog
      form.reset()
      removeFile()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal menyimpan pengeluaran',
        variant: 'destructive',
      })
    }
  }

  const handleClose = () => {
    form.reset()
    removeFile()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Pengeluaran Baru</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tanggal_pengeluaran"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tanggal Pengeluaran</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="jumlah"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jumlah (Rp)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="keterangan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keterangan</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Deskripsi pengeluaran..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bukti_foto"
              render={() => (
                <FormItem>
                  <FormLabel>Bukti Foto (Opsional)</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      {!selectedFile ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                          <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600 mb-2">
                            Klik untuk upload atau drag & drop
                          </p>
                          <p className="text-xs text-gray-500">
                            PNG, JPG hingga 5MB
                          </p>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </div>
                      ) : (
                        <div className="relative">
                          <div className="border rounded-lg p-4 bg-gray-50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium truncate">
                                {selectedFile.name}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={removeFile}
                                className="h-6 w-6 p-0 text-gray-500 hover:text-red-600"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            {previewUrl && (
                              <img
                                src={previewUrl}
                                alt="Preview"
                                className="w-full h-32 object-cover rounded border"
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={createMutation.isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}