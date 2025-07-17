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

interface HorizontalBarChartProps {
  data: Array<{
    nama_produk?: string
    total_terjual?: number
    [key: string]: any
  }>
  title?: string
  height?: number
  dataKey?: string
  labelKey?: string
  color?: string
}

export function HorizontalBarChart({ 
  data, 
  title, 
  height = 320, 
  dataKey = 'total_terjual',
  labelKey = 'nama_produk',
  color = 'rgba(245, 158, 11, 0.8)'
}: HorizontalBarChartProps) {
  const chartData = {
    labels: data.map(item => item[labelKey]),
    datasets: [
      {
        label: title || 'Data',
        data: data.map(item => item[dataKey]),
        backgroundColor: color,
        borderColor: color.replace('0.8', '1'),
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
            return `${context.dataset.label}: ${value.toLocaleString('id-ID')}`
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return value.toLocaleString('id-ID')
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

export default HorizontalBarChart