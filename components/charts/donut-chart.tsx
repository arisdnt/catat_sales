'use client'

import React from 'react'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend)

interface DonutChartProps {
  data: Array<{
    name: string
    value: number
    [key: string]: any
  }>
  title?: string
  height?: number
  colors?: string[]
  formatValue?: (value: number) => string
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
]

export function DonutChart({ data, title, height = 320, colors = DEFAULT_COLORS, formatValue }: DonutChartProps) {
  const chartData = {
    labels: data.map(item => item.name),
    datasets: [
      {
        data: data.map(item => item.value),
        backgroundColor: colors.slice(0, data.length),
        borderColor: colors.slice(0, data.length).map(color => color),
        borderWidth: 2,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
        },
      },
      title: {
        display: !!title,
        text: title,
        padding: {
          bottom: 20
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.parsed
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
            const percentage = ((value / total) * 100).toFixed(1)
            return `${context.label}: ${formatValue ? formatValue(value) : value.toLocaleString('id-ID')} (${percentage}%)`
          }
        }
      }
    },
    cutout: '60%', // This makes it a donut chart
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
      <Doughnut data={chartData} options={options} />
    </div>
  )
}

export default DonutChart