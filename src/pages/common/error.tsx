/**
 * @file pages/common/error.tsx
 * @description Generic error page (500)
 */
import React from 'react';
import Head from 'next/head';

interface ErrorPageProps {
  statusCode?: number;
  title?: string;
  message?: string;
}

export default function ErrorPage({ 
  statusCode = 500, 
  title = 'Lỗi Server', 
  message = 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.' 
}: ErrorPageProps) {
  return (
    <>
      <Head>
        <title>{statusCode} | MovieStreaming</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="error-container">
        <div className="error-glow" aria-hidden="true" />
        <div className="error-content">
          <span className="error-code">{statusCode}</span>
          <h1 className="error-title">{title}</h1>
          <p className="error-message">{message}</p>
          <a href="/" className="error-home-link">Quay về trang chủ</a>
        </div>
      </div>

      <style jsx global>{`
        .error-container {
          position: relative;
          min-height: calc(100vh - 64px);
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #080b10;
          background-image: radial-gradient(
            circle at 50% 50%,
            rgba(229, 9, 20, 0.09) 0%,
            rgba(13, 17, 23, 0.65) 45%,
            #080b10 80%
          );
          color: #ffffff;
          overflow: hidden;
          user-select: none;
          padding: 64px 20px 40px;
        }
        .error-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 500px;
          height: 340px;
          background: radial-gradient(ellipse at center, rgba(229, 9, 20, 0.12) 0%, transparent 70%);
          filter: blur(60px);
          pointer-events: none;
        }
        .error-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          text-align: center;
        }
        .error-code {
          font-size: clamp(6.5rem, 18vw, 13rem);
          font-weight: 900;
          line-height: 1;
          letter-spacing: -4px;
          background: linear-gradient(180deg, #ffffff 30%, #cbd5e1 70%, #64748b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 8px 32px rgba(0, 0, 0, 0.75));
        }
        .error-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #e50914;
          margin: 0;
        }
        .error-message {
          color: #8b949e;
          font-size: 1rem;
          margin: 0;
          max-width: 400px;
        }
        .error-home-link {
          margin-top: 8px;
          padding: 10px 24px;
          background: #e50914;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        .error-home-link:hover {
          background: #f40612;
          transform: translateY(-2px);
        }
        @media (max-width: 768px) {
          .error-code { letter-spacing: -2px; }
        }
      `}</style>
    </>
  );
}
