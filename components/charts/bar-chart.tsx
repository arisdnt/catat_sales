'use client'

import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface BarChartProps {
  data: Array<{
    nama_sales: string
    total_setoran: number
    [key: string]: any
  }>
  title?: string
  height?: number
  formatValue?: (value: number) => string
}

export function BarChart({ data, title, height = 320, formatValue }: BarChartProps) {
  const chartData = {
    labels: data.map(item => item.nama_sales),
    datasets: [
      {
        label: 'Total Setoran',
        data: data.map(item => item.total_setoran),
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderColor: 'rgba(139, 92, 246, 1)',
        borderWidth: 1,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: !!title,
        text: title,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.parsed.x
            return formatValue ? formatValue(value) : `Rp ${value.toLocaleString('id-ID')}`
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatValue ? formatValue(value) : `Rp ${value.toLocaleString('id-ID')}`
          }
        }
      },
      y: {
        ticks: {
          maxTicksLimit: 10
        }
      }
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
      <Bar data={chartData} options={options} />
    </div>
  )
}

export default BarChart