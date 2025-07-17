"use client"

import * as React from "react"

// Simple fallback toaster component to avoid compatibility issues
export function Toaster() {
  return (
    <div 
      id="toast-container" 
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
      aria-live="polite"
      aria-label="Notifications"
    >
      {/* Toast notifications will be rendered here if needed */}
    </div>
  )
}