/**
 * @file pages/auth/signup.tsx
 */
import { useState } from 'react';
import Head from 'next/head';
import AuthForm from '@/features/shared/components/Auth/AuthForm';
import { useRouter } from 'next/router';
import { useAuth } from '@/utils/auth';

interface SignupCredentials {
  fullname: string;
  email: string;
  password: string;
  retype_password: string;
  address?: string;
  phone?: string;
  date_of_birth?: string;
}

export default function Signup() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const router = useRouter();
  const { register } = useAuth();

  const handleSignup = async (credentials: SignupCredentials): Promise<void> => {
    try {
      setIsLoading(true);
      setError('');
      setMessage('');

      if (
        !credentials.fullname ||
        !credentials.email ||
        !credentials.password ||
        !credentials.retype_password
      ) {
        setError('Họ tên, email, và mật khẩu là bắt buộc.');
        setIsLoading(false);
        return;
      }
      if (credentials.password !== credentials.retype_password) {
        setError('Mật khẩu không khớp.');
        setIsLoading(false);
        return;
      }
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(credentials.email)) {
        setError('Email không hợp lệ.');
        setIsLoading(false);
        return;
      }
      if (credentials.password.length < 6) {
        setError('Mật khẩu phải có ít nhất 6 ký tự.');
        setIsLoading(false);
        return;
      }

      const userData = {
        fullname: credentials.fullname,
        email: credentials.email,
        password: credentials.password,
        retype_password: credentials.retype_password,
        address: credentials.address || '',
        phone: credentials.phone || '',
        date_of_birth: credentials.date_of_birth || ''
      };

      try {
        const result = await register(userData);

        if (result.success) {
          setMessage('Đăng ký thành công! Đang chuyển hướng đến trang đăng nhập...');
          setTimeout(() => {
            router.push('/auth/login?registered=true');
          }, 1500);
        } else {
          setError(result.error || 'Đăng ký thất bại. Vui lòng thử lại.');
        }
      } catch (apiError) {
        const err = apiError as Error;
        console.error('API call error:', apiError);
        if (err.message.includes('Failed to fetch')) {
          setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và cài đặt API.');
        } else if (err.message.includes('<!DOCTYPE') || err.message.includes('Unexpected token')) {
          setError('Lỗi kết nối máy chủ: Máy chủ trả về HTML thay vì JSON. Vui lòng kiểm tra URL API.');
        } else if (err.message.includes('API URL')) {
          setError('Lỗi kết nối máy chủ. Vui lòng kiểm tra lại cấu hình API.');
        } else if (err.message.includes('Email already exists') || err.message.includes('đã tồn tại')) {
          setError('Email đã được sử dụng. Vui lòng dùng email khác hoặc đăng nhập.');
        } else {
          setError(err.message || 'Đăng ký thất bại. Vui lòng thử lại.');
        }
      }
    } catch (err) {
      const _err = err as Error;
      console.error('Signup error:', err);
      setError('Lỗi đăng ký: ' + (_err.message || 'Đã xảy ra lỗi không xác định'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Đăng ký - Movie Streaming</title>
      </Head>
      <AuthForm
        onSubmit={handleSignup}
        isLoading={isLoading}
        error={error}
        message={message}
        isSignup={true}
      />
    </>
  );
}
