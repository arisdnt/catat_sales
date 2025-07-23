'use client'

import { Construction, BarChart3 } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center">
          {/* Icon Section */}
          <div className="mb-8">
            <div className="flex justify-center mb-6">
              <Construction className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 text-gray-400" />
            </div>
            <div className="flex items-center justify-center gap-3 mb-6">
              <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-700">
                Dashboard
              </h1>
            </div>
          </div>

          {/* Content Section */}
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-600">
              Masih Dalam Pengembangan
            </h2>
            
            <p className="text-base sm:text-lg text-gray-500 leading-relaxed px-4">
              Dashboard statistik dan analitik sedang dalam tahap pengembangan. 
              Fitur ini akan segera tersedia dengan tampilan yang lebih lengkap dan informatif.
            </p>
            
            <div className="pt-4">
              <p className="text-sm text-gray-400">
                Terima kasih atas kesabaran Anda
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}