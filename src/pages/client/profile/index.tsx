/**
 * @file pages/profile/index.tsx
 * @description Pass-through to the canonical Profile component (via @/features/user barrel).
 */
import ProfilePage from '@/features/user';

export default function Profile() {
  return <ProfilePage />;
}
