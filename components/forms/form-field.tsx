'use client'

import { ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AlertCircle, X } from 'lucide-react'

interface FormFieldProps {
  label: string
  name: string
  value: any
  onChange: (value: any) => void
  onBlur?: () => void
  error?: string
  type?: 'text' | 'email' | 'tel' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox' | 'currency'
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  children?: ReactNode
  options?: { value: string; label: string }[]
  rows?: number
  min?: number
  max?: number
  step?: number
}

export function FormField({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  className,
  children,
  options = [],
  rows = 3,
  min,
  max,
  step
}: FormFieldProps) {
  const hasError = !!error
  const fieldId = `field-${name}`

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = type === 'number' || type === 'currency' ? 
      parseFloat(e.target.value) || 0 : 
      e.target.value
    onChange(newValue)
  }

  const handleSelectChange = (newValue: string) => {
    onChange(newValue)
  }

  const handleCheckboxChange = (checked: boolean) => {
    onChange(checked)
  }

  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <Textarea
            id={fieldId}
            name={name}
            value={value || ''}
            onChange={handleInputChange}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className={cn(
              'resize-none',
              hasError && 'border-red-500 focus-visible:ring-red-500'
            )}
          />
        )

      case 'select':
        return (
          <Select
            value={value || ''}
            onValueChange={handleSelectChange}
            disabled={disabled}
          >
            <SelectTrigger 
              id={fieldId}
              className={cn(
                hasError && 'border-red-500 focus:ring-red-500'
              )}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={fieldId}
              checked={value || false}
              onCheckedChange={handleCheckboxChange}
              disabled={disabled}
            />
            <Label htmlFor={fieldId} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {label}
            </Label>
          </div>
        )

      case 'currency':
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
              Rp
            </span>
            <Input
              id={fieldId}
              name={name}
              type="number"
              value={value || ''}
              onChange={handleInputChange}
              onBlur={onBlur}
              placeholder={placeholder}
              disabled={disabled}
              min={min}
              max={max}
              step={step}
              className={cn(
                'pl-10',
                hasError && 'border-red-500 focus-visible:ring-red-500'
              )}
            />
          </div>
        )

      default:
        return (
          <Input
            id={fieldId}
            name={name}
            type={type}
            value={value || ''}
            onChange={handleInputChange}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            min={min}
            max={max}
            step={step}
            className={cn(
              hasError && 'border-red-500 focus-visible:ring-red-500'
            )}
          />
        )
    }
  }

  if (type === 'checkbox') {
    return (
      <div className={cn('space-y-2', className)}>
        {renderInput()}
        {hasError && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={fieldId} className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {renderInput()}
      {children}
      {hasError && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

interface FormErrorProps {
  errors: Record<string, string>
}

export function FormError({ errors }: FormErrorProps) {
  const errorEntries = Object.entries(errors).filter(([_, error]) => error)
  
  if (errorEntries.length === 0) return null

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2 text-red-700 font-medium">
        <AlertCircle className="w-5 h-5" />
        <span>Terdapat kesalahan pada form:</span>
      </div>
      <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
        {errorEntries.map(([field, error]) => (
          <li key={field}>{error}</li>
        ))}
      </ul>
    </div>
  )
}

interface FormActionsProps {
  isSubmitting: boolean
  isValid: boolean
  isDirty: boolean
  onSubmit: () => void
  onReset?: () => void
  submitText?: string
  resetText?: string
  className?: string
}

export function FormActions({
  isSubmitting,
  isValid,
  isDirty,
  onSubmit,
  onReset,
  submitText = 'Simpan',
  resetText = 'Reset',
  className
}: FormActionsProps) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <Button
        type="submit"
        onClick={onSubmit}
        disabled={isSubmitting || !isValid || !isDirty}
        className="min-w-24"
      >
        {isSubmitting ? 'Menyimpan...' : submitText}
      </Button>
      {onReset && (
        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          disabled={isSubmitting || !isDirty}
        >
          {resetText}
        </Button>
      )}
    </div>
  )
}