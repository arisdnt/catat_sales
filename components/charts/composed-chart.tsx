'use client'

import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Chart } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
)

interface ComposedChartProps {
  data: Array<{
    month: string
    total_penjualan: number
    total_setoran: number
    [key: string]: any
  }>
  title?: string
  height?: number
  formatValue?: (value: number) => string
}

export function ComposedChart({ data, title, height = 320, formatValue }: ComposedChartProps) {
  const chartData = {
    labels: data.map(item => {
      // Format month from YYYY-MM to readable format
      const date = new Date(item.month + '-01')
      return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'short' })
    }),
    datasets: [
      {
        type: 'bar' as const,
        label: 'Penjualan',
        data: data.map(item => item.total_penjualan),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
        yAxisID: 'y',
      },
      {
        type: 'bar' as const,
        label: 'Setoran',
        data: data.map(item => item.total_setoran),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
        yAxisID: 'y',
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: !!title,
        text: title,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.parsed.y
            return `${context.dataset.label}: ${formatValue ? formatValue(value) : `Rp ${value.toLocaleString('id-ID')}`}`
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: true,
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatValue ? formatValue(value) : `Rp ${value.toLocaleString('id-ID')}`
          }
        }
      },
    },
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-gray-500">Tidak ada data untuk ditampilkan</p>
      </div>
    )
  }

  return (
    <div style={{ height }}>
      <Chart type='bar' data={chartData} options={options} />
    </div>
  )
}

export default ComposedChart