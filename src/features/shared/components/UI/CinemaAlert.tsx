import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import {
  FaExclamationTriangle,
  FaCheckCircle,
  FaInfoCircle,
  FaTimesCircle,
  FaHeart
} from 'react-icons/fa';

// The name of the custom event. It allows any part of the application to
// show an alert without a hook or props.
const CINEMA_ALERT_EVENT = 'cinema_alert_event';

export type CinemaAlertType = 'cinema' | 'warning' | 'success' | 'error' | 'info' | 'heart';

export interface CinemaAlertDetail {
  message: string;
  type: CinemaAlertType;
  duration: number;
  timestamp: number;
}

export interface CinemaAlertEvent extends CustomEvent {
  detail: CinemaAlertDetail;
}

/**
 * Shows an alert, and it is shared by the whole application.
 *
 * @param message - The text shown inside the alert.
 * @param type - The style of the alert.
 * @param duration - The time in milliseconds the alert stays visible.
 *
 * @example
 *   showCinemaAlert('You already liked this movie!', 'warning');
 *   showCinemaAlert('Added to your favorites!', 'cinema');
 */
export function showCinemaAlert(
  message: string,
  type: CinemaAlertType = 'cinema',
  duration: number = 2800
): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(CINEMA_ALERT_EVENT, {
        detail: { message, type, duration, timestamp: Date.now() }
      })
    );
  }
}

interface CinemaAlertContextValue {
  showAlert: typeof showCinemaAlert;
}

const CinemaAlertContext = createContext<CinemaAlertContextValue>({
  showAlert: showCinemaAlert
});

export const useCinemaAlert = (): CinemaAlertContextValue => useContext(CinemaAlertContext);

/**
 * The component that shows the floating alert, following the Dark Cinema
 * style.
 *
 * It listens to `showCinemaAlert()` on its own and closes itself when the
 * time is up.
 */
const CinemaAlert: React.FC = () => {
  const [alertData, setAlertData] = useState<CinemaAlertDetail | null>(null);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = (): void => {
    setIsClosing(true);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setAlertData(null);
      setIsClosing(false);
    }, 220);
  };

  useEffect(() => {
    const handleAlertEvent = (event: Event): void => {
      const detail = (event as CinemaAlertEvent).detail;
      if (!detail || !detail.message) return;

      // The old timer is cleared when it is still running.
      if (timerRef.current) clearTimeout(timerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);

      setIsClosing(false);
      setAlertData(detail);

      const displayDuration = detail.duration || 2800;
      timerRef.current = setTimeout(() => {
        dismiss();
      }, displayDuration);
    };

    window.addEventListener(CINEMA_ALERT_EVENT, handleAlertEvent);
    return () => {
      window.removeEventListener(CINEMA_ALERT_EVENT, handleAlertEvent);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  if (!alertData) return null;

  // The icon is chosen based on the type of the alert.
  const renderIcon = (): React.ReactNode => {
    switch (alertData.type) {
      case 'warning':
        return <FaExclamationTriangle className="alert-icon text-warning" />;
      case 'success':
        return <FaCheckCircle className="alert-icon text-success" />;
      case 'error':
        return <FaTimesCircle className="alert-icon text-danger" />;
      case 'info':
        return <FaInfoCircle className="alert-icon text-info" />;
      case 'heart':
        return <FaHeart className="alert-icon text-danger" />;
      case 'cinema':
      default:
        return <FaExclamationTriangle className="alert-icon text-cinema" />;
    }
  };

  return (
    <div
      className={`cinema-alert-container ${isClosing ? 'closing' : ''}`}
      onClick={dismiss}
      role="alert"
      aria-live="assertive"
      title="Bấm để đóng thông báo"
    >
      <div className="cinema-alert-pill">
        <div className="icon-wrapper">
          {renderIcon()}
        </div>
        <span className="alert-message">
          {alertData.message}
        </span>
      </div>

      <style jsx>{`
        .cinema-alert-container {
          position: fixed;
          bottom: 32px;
          right: 32px;
          z-index: 999999;
          pointer-events: auto;
          cursor: pointer;
          user-select: none;
          animation: alertEnter 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .cinema-alert-container.closing {
          animation: alertLeave 0.2s cubic-bezier(0.4, 0, 1, 1) forwards;
        }

        .cinema-alert-pill {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background: rgba(20, 20, 24, 0.94);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 10px 22px;
          color: #ffffff;
          box-shadow:
            0 12px 36px rgba(0, 0, 0, 0.75),
            0 0 0 1px rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          max-width: 90vw;
          transition: transform 0.15s ease, background-color 0.15s ease;
        }

        .cinema-alert-pill:hover {
          background: rgba(26, 26, 32, 0.96);
          border-color: rgba(255, 255, 255, 0.18);
          transform: translateY(-1px);
        }

        .icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.15rem;
          flex-shrink: 0;
        }

        :global(.alert-icon.text-cinema) {
          color: #e50914 !important;
        }

        :global(.alert-icon.text-warning) {
          color: #fbbf24 !important;
        }

        :global(.alert-icon.text-success) {
          color: #10b981 !important;
        }

        :global(.alert-icon.text-danger) {
          color: #ef4444 !important;
        }

        :global(.alert-icon.text-info) {
          color: #38bdf8 !important;
        }

        .alert-message {
          font-size: 0.92rem;
          font-weight: 600;
          letter-spacing: -0.01em;
          color: #ffffff;
          line-height: 1.4;
          white-space: pre-wrap;
          word-break: break-word;
        }

        @keyframes alertEnter {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes alertLeave {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(10px) scale(0.96);
          }
        }

        @media (max-width: 576px) {
          .cinema-alert-container {
            bottom: 20px;
            right: 16px;
            left: 16px;
            width: auto;
          }

          .cinema-alert-pill {
            width: 100%;
            justify-content: center;
            padding: 9px 16px;
            font-size: 0.88rem;
          }

          .alert-message {
            font-size: 0.86rem;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
};

export default CinemaAlert;
