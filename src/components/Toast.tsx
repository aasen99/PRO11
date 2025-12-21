'use client'

import React, { useEffect } from 'react'
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  message: string
  type: ToastType
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />
      case 'info':
        return <Info className="w-5 h-5 text-blue-400" />
    }
  }

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-900/90 border-green-600'
      case 'error':
        return 'bg-red-900/90 border-red-600'
      case 'warning':
        return 'bg-yellow-900/90 border-yellow-600'
      case 'info':
        return 'bg-blue-900/90 border-blue-600'
    }
  }

  return (
    <div
      className={`flex items-center space-x-3 px-4 py-3 rounded-lg border shadow-lg ${getBgColor()} transition-all duration-300 ease-out`}
      role="alert"
      style={{
        animation: 'slideIn 0.3s ease-out'
      }}
    >
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      {getIcon()}
      <p className="text-white text-sm font-medium flex-1">{message}</p>
      <button
        onClick={onClose}
        className="text-slate-300 hover:text-white transition-colors"
        aria-label="Lukk"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type: ToastType }>
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{ top: `${index * 80 + 16}px` }}
          className="absolute right-0"
        >
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => onRemove(toast.id)}
          />
        </div>
      ))}
    </div>
  )
}

