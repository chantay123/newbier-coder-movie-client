/**
 * @file types/user.ts
 * @description Minimal User type shared by feedback + any other legacy code
 * that was previously typed against an old model.
 */
export interface User {
  _id?: string;
  username?: string;
  email?: string;
  fullname?: string;
  avatar?: string;
  role?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}
