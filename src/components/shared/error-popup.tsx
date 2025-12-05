"use client";

import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Info, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface ErrorInfo {
  id: string;
  statusCode: number;
  message: string;
  details?: string;
  timestamp: number;
  type?: 'error' | 'warning' | 'info' | 'success';
}

interface ErrorPopupProps {
  errors: ErrorInfo[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
}

const getStatusCodeInfo = (statusCode: number) => {
  switch (statusCode) {
    case 200:
    case 201:
    case 204:
      return { type: 'success' as const, title: 'Success', color: 'text-green-600 dark:text-green-400' };
    case 400:
      return { type: 'error' as const, title: 'Bad Request', color: 'text-red-600 dark:text-red-400' };
    case 401:
      return { type: 'error' as const, title: 'Unauthorized', color: 'text-red-600 dark:text-red-400' };
    case 403:
      return { type: 'error' as const, title: 'Forbidden', color: 'text-red-600 dark:text-red-400' };
    case 404:
      return { type: 'error' as const, title: 'Not Found', color: 'text-orange-600 dark:text-orange-400' };
    case 500:
      return { type: 'error' as const, title: 'Server Error', color: 'text-red-600 dark:text-red-400' };
    case 502:
      return { type: 'error' as const, title: 'Bad Gateway', color: 'text-red-600 dark:text-red-400' };
    case 503:
      return { type: 'error' as const, title: 'Service Unavailable', color: 'text-red-600 dark:text-red-400' };
    default:
      if (statusCode >= 200 && statusCode < 300) {
        return { type: 'success' as const, title: 'Success', color: 'text-green-600 dark:text-green-400' };
      } else if (statusCode >= 400 && statusCode < 500) {
        return { type: 'warning' as const, title: 'Client Error', color: 'text-orange-600 dark:text-orange-400' };
      } else {
        return { type: 'error' as const, title: 'Server Error', color: 'text-red-600 dark:text-red-400' };
      }
  }
};

const getIcon = (type: 'error' | 'warning' | 'info' | 'success') => {
  switch (type) {
    case 'error':
      return <AlertTriangle className="h-4 w-4" />;
    case 'warning':
      return <AlertCircle className="h-4 w-4" />;
    case 'info':
      return <Info className="h-4 w-4" />;
    case 'success':
      return <CheckCircle className="h-4 w-4" />;
  }
};

const getBorderColor = (type: 'error' | 'warning' | 'info' | 'success') => {
  switch (type) {
    case 'error':
      return 'border-red-500 dark:border-red-400';
    case 'warning':
      return 'border-orange-500 dark:border-orange-400';
    case 'info':
      return 'border-blue-500 dark:border-blue-400';
    case 'success':
      return 'border-green-500 dark:border-green-400';
  }
};

const getBgColor = (type: 'error' | 'warning' | 'info' | 'success') => {
  switch (type) {
    case 'error':
      return 'bg-red-50 dark:bg-red-950/50';
    case 'warning':
      return 'bg-orange-50 dark:bg-orange-950/50';
    case 'info':
      return 'bg-blue-50 dark:bg-blue-950/50';
    case 'success':
      return 'bg-green-50 dark:bg-green-950/50';
  }
};

export function ErrorPopup({ errors, onDismiss, onDismissAll }: ErrorPopupProps) {
  if (errors.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-3 max-w-md w-full">
      {/* Dismiss all button for multiple errors */}
      {errors.length > 1 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onDismissAll}
            className="text-xs"
          >
            Dismiss All ({errors.length})
          </Button>
        </div>
      )}

      {/* Error notifications */}
      {errors.map((error) => {
        const { type, title, color } = getStatusCodeInfo(error.statusCode);
        const errorType = error.type || type;

        return (
          <div
            key={error.id}
            className={cn(
              "border rounded-lg p-4 shadow-lg backdrop-blur-sm transition-all duration-300 animate-in slide-in-from-right",
              getBorderColor(errorType),
              getBgColor(errorType)
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={cn("flex-shrink-0 mt-0.5", color)}>
                  {getIcon(errorType)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-sm font-medium", color)}>
                      {title}
                    </span>
                    <span className={cn("text-xs font-mono px-1.5 py-0.5 rounded", color, 
                      errorType === 'success' 
                        ? 'bg-green-100 dark:bg-green-900/50' 
                        : errorType === 'error'
                        ? 'bg-red-100 dark:bg-red-900/50'
                        : errorType === 'warning' 
                        ? 'bg-orange-100 dark:bg-orange-900/50'
                        : 'bg-blue-100 dark:bg-blue-900/50'
                    )}>
                      {error.statusCode}
                    </span>
                  </div>
                  
                  <p className="text-sm text-foreground/80 mb-1">
                    {error.message}
                  </p>
                  
                  {error.details && (
                    <p className="text-xs text-muted-foreground truncate">
                      {error.details}
                    </p>
                  )}
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDismiss(error.id)}
                className="h-6 w-6 p-0 hover:bg-background/20"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Hook for managing error notifications
export function useErrorNotifications() {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);

  const addError = (statusCode: number, message: string, details?: string, type?: ErrorInfo['type']) => {
    const error: ErrorInfo = {
      id: `error-${Date.now()}-${Math.random()}`,
      statusCode,
      message,
      details,
      timestamp: Date.now(),
      type,
    };
    
    setErrors(prev => [error, ...prev]);
    
    // Auto-dismiss success notifications after 3 seconds
    if (type === 'success' || (statusCode >= 200 && statusCode < 300)) {
      setTimeout(() => {
        setErrors(prev => prev.filter(e => e.id !== error.id));
      }, 3000);
    } else {
      // Auto-dismiss other errors after 8 seconds
      setTimeout(() => {
        setErrors(prev => prev.filter(e => e.id !== error.id));
      }, 8000);
    }
  };

  const dismissError = (id: string) => {
    setErrors(prev => prev.filter(e => e.id !== id));
  };

  const dismissAll = () => {
    setErrors([]);
  };

  return {
    errors,
    addError,
    dismissError,
    dismissAll,
  };
}
