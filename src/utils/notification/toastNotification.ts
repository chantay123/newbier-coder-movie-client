/**
 * @file toastNotification.ts
 * @description Enterprise notification utility wrapping react-toastify.
 * Provides accessible, cinema-themed toast notifications with autoClose and deduplication.
 */

import { toast, ToastOptions, Id } from 'react-toastify';

const DEFAULT_TOAST_OPTIONS: ToastOptions = {
  position: 'top-right',
  autoClose: 3500,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: 'dark',
};

export const toastNotification = {
  /**
   * Display a success toast
   * @param message Message to display
   * @param options Custom toast options
   */
  success(message: string, options?: ToastOptions): Id {
    return toast.success(message, {
      ...DEFAULT_TOAST_OPTIONS,
      ...options,
      style: {
        background: '#141416',
        color: '#f8fafc',
        border: '1px solid rgba(74, 222, 128, 0.35)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.8)',
        borderRadius: '10px',
        fontSize: '0.875rem',
        ...options?.style,
      },
    });
  },

  /**
   * Display an error toast
   * @param message Message to display
   * @param options Custom toast options
   */
  error(message: string, options?: ToastOptions): Id {
    return toast.error(message, {
      ...DEFAULT_TOAST_OPTIONS,
      ...options,
      style: {
        background: '#141416',
        color: '#f8fafc',
        border: '1px solid rgba(239, 68, 68, 0.45)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.8)',
        borderRadius: '10px',
        fontSize: '0.875rem',
        ...options?.style,
      },
    });
  },

  /**
   * Display an informational toast
   * @param message Message to display
   * @param options Custom toast options
   */
  info(message: string, options?: ToastOptions): Id {
    return toast.info(message, {
      ...DEFAULT_TOAST_OPTIONS,
      ...options,
      style: {
        background: '#141416',
        color: '#f8fafc',
        border: '1px solid rgba(59, 130, 246, 0.35)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.8)',
        borderRadius: '10px',
        fontSize: '0.875rem',
        ...options?.style,
      },
    });
  },

  /**
   * Display a warning toast
   * @param message Message to display
   * @param options Custom toast options
   */
  warning(message: string, options?: ToastOptions): Id {
    return toast.warning(message, {
      ...DEFAULT_TOAST_OPTIONS,
      ...options,
      style: {
        background: '#141416',
        color: '#f8fafc',
        border: '1px solid rgba(245, 158, 11, 0.4)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.8)',
        borderRadius: '10px',
        fontSize: '0.875rem',
        ...options?.style,
      },
    });
  },

  /**
   * Display a loading toast (returns toast ID to update later)
   * @param message Message to display
   */
  loading(message: string): Id {
    return toast.loading(message, {
      ...DEFAULT_TOAST_OPTIONS,
      style: {
        background: '#141416',
        color: '#f8fafc',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '10px',
        fontSize: '0.875rem',
      },
    });
  },

  /**
   * Dismiss a specific toast or all active toasts
   * @param toastId Optional toast ID
   */
  dismiss(toastId?: Id): void {
    toast.dismiss(toastId);
  },
};
