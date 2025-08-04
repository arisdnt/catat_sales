import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { toZonedTime } from "date-fns-tz"

// Indonesia timezone constant
export const INDONESIA_TIMEZONE = 'Asia/Jakarta'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Convert date to Indonesia timezone and format
export function formatDate(date: string | Date): string {
  const zonedDate = toZonedTime(new Date(date), INDONESIA_TIMEZONE)
  return format(zonedDate, 'dd/MM/yyyy')
}

export function formatDateTime(date: string | Date): string {
  const zonedDate = toZonedTime(new Date(date), INDONESIA_TIMEZONE)
  return format(zonedDate, 'dd/MM/yyyy HH:mm')
}

// Format date with Indonesia timezone using Intl API
export function formatDateIndonesia(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: INDONESIA_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }
  
  return new Intl.DateTimeFormat('id-ID', { ...defaultOptions, ...options }).format(new Date(date))
}

// Format datetime with Indonesia timezone using Intl API
export function formatDateTimeIndonesia(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: INDONESIA_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
  
  return new Intl.DateTimeFormat('id-ID', { ...defaultOptions, ...options }).format(new Date(date))
}

// Get current date in Indonesia timezone as ISO string (YYYY-MM-DD)
export function getCurrentDateIndonesia(): string {
  const now = new Date()
  const indonesiaTime = new Intl.DateTimeFormat('sv-SE', {
    timeZone: INDONESIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now)
  
  return indonesiaTime
}

// Get current datetime in Indonesia timezone
export function getCurrentDateTimeIndonesia(): Date {
  return toZonedTime(new Date(), INDONESIA_TIMEZONE)
}