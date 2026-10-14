/**
 * @file AdminNotifications.tsx
 * @description Listens to WebSocket and surfaces admin movie/user events as toasts.
 */
import React, { useEffect, useState } from 'react';
import { useWebSocket, WebSocketMessage } from '@/contexts/WebSocketContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

type MovieAction = 'created' | 'updated' | 'deleted' | 'statusChanged';
type UserAction = 'created' | 'updated';
type AnyAction = MovieAction | UserAction | string;

interface WebSocketPayload {
  type: string;
  action: AnyAction;
  data?: {
    name?: string;
    username?: string;
    status?: 'active' | 'inactive' | string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const AdminNotifications: React.FC = () => {
  const { lastMessage, isConnected } = useWebSocket();
  const [connectionStatus, setConnectionStatus] = useState<string>('Đang kết nối...');

  useEffect(() => {
    if (!lastMessage) return;
    const msg = lastMessage as unknown as WebSocketPayload;
    let notificationContent: string = '';

    if (msg.type === 'movie') {
      const name = msg.data?.name ?? 'phim';
      switch (msg.action) {
        case 'created':
          notificationContent = `Phim "${name}" đã được thêm mới`;
          toast.success(notificationContent);
          break;
        case 'updated':
          notificationContent = `Phim "${name}" đã được cập nhật`;
          toast.info(notificationContent);
          break;
        case 'deleted':
          notificationContent = `Phim "${name}" đã bị xóa`;
          toast.warning(notificationContent);
          break;
        case 'statusChanged': {
          const status = msg.data?.status === 'active' ? 'kích hoạt' : 'ẩn';
          notificationContent = `Phim "${name}" đã được ${status}`;
          toast.info(notificationContent);
          break;
        }
        default:
          notificationContent = `Có thay đổi dữ liệu: ${JSON.stringify(msg)}`;
          toast.info(notificationContent);
      }
    } else if (msg.type === 'user') {
      const username = msg.data?.username ?? 'người dùng';
      switch (msg.action) {
        case 'created':
          notificationContent = `Người dùng mới "${username}" đã được tạo`;
          toast.success(notificationContent);
          break;
        case 'updated':
          notificationContent = `Người dùng "${username}" đã được cập nhật`;
          toast.info(notificationContent);
          break;
        default:
          notificationContent = `Có thay đổi dữ liệu người dùng: ${JSON.stringify(msg)}`;
          toast.info(notificationContent);
      }
    }
  }, [lastMessage]);

  useEffect(() => {
    setConnectionStatus(isConnected ? 'Đã kết nối' : 'Mất kết nối');
  }, [isConnected]);

  return (
    <>
      <div
        className="socket-status"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '5px 10px',
          borderRadius: '5px',
          fontSize: '12px',
          color: 'white',
          background: isConnected ? '#28a745' : '#dc3545',
          zIndex: 1000
        }}
      >
        <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
        <span className="status-text">WebSocket: {connectionStatus}</span>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      <style jsx>{`
        .status-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 5px;
        }
        .connected {
          background-color: #28a745;
          box-shadow: 0 0 5px #28a745;
        }
        .disconnected {
          background-color: #dc3545;
          box-shadow: 0 0 5px #dc3545;
        }
      `}</style>
    </>
  );
};

export default AdminNotifications;
