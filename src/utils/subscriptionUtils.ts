/**
 * @file subscriptionUtils.ts
 * @description Các hàm tiện ích kiểm tra trạng thái subscription và payment.
 */

/** Kiểm tra user có pending payment request không */
export const checkPaymentSent = async (userId: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/subscription/check-pending-for-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    const data = await response.json() as { hasPending?: boolean };
    return data.hasPending ?? false;
  } catch (error) {

    return false;
  }
};

/** Kiểm tra response có phải subscription thành công không */
export const isSuccessfulSubscription = (response: Record<string, unknown> | null): boolean => {
  if (!response) return false;

  const hasSuccess = !!response.success;
  const hasSubscription = !!response.subscription;
  const hasPackage = !!response.package;
  const hasPayment = !!response.payment;

  return hasSuccess || hasSubscription || hasPackage || hasPayment;
};

/** Lấy ID có thể so sánh từ nhiều dạng identifier */
const getComparableId = (value: unknown): string | null => {
  if (value === null || typeof value === 'undefined') return null;

  if (typeof value === 'string') return value;

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (obj._id !== undefined && obj._id !== null) return String(obj._id);
    if (obj.id !== undefined && obj.id !== null) return String(obj.id);
    return String(value);
  }

  return String(value);
};

interface PackageItem {
  _id?: string | null;
  name?: string;
}

interface SubscriptionItem {
  hasActiveSubscription?: boolean;
  subscription?: {
    packageId?: unknown;
    name?: string;
  };
  hasPendingSubscription?: boolean;
  pendingSubscription?: {
    packageId?: unknown;
    name?: string;
  };
}

/** Kiểm tra package có phải subscription đang active không */
export const isCurrentSubscribedPackage = (pkg: PackageItem, subscription: SubscriptionItem): boolean => {
  if (!pkg || pkg._id === undefined || pkg._id === null) {

    return false;
  }
  if (!subscription || !subscription.hasActiveSubscription || !subscription.subscription) {
    return false;
  }

  const packageIdFromSubscription = subscription.subscription.packageId;
  if (packageIdFromSubscription === null || packageIdFromSubscription === undefined) {
    return false;
  }

  const subscriptionPackageId = getComparableId(packageIdFromSubscription);
  const packageId = getComparableId(pkg._id);

  const nameMatch =
    pkg.name &&
    typeof packageIdFromSubscription === 'object' &&
    packageIdFromSubscription !== null &&
    (packageIdFromSubscription as Record<string, unknown>).name === pkg.name;

  return subscriptionPackageId === packageId || !!nameMatch;
};

/** Kiểm tra package có đang chờ duyệt không */
export const isPendingSubscribedPackage = (pkg: PackageItem, pendingSubscription: SubscriptionItem): boolean => {
  if (!pkg || pkg._id === undefined || pkg._id === null) {

    return false;
  }
  if (!pendingSubscription || !pendingSubscription.hasPendingSubscription || !pendingSubscription.pendingSubscription) {
    return false;
  }

  const packageIdFromPendingSub = pendingSubscription.pendingSubscription.packageId;
  if (packageIdFromPendingSub === null || packageIdFromPendingSub === undefined) {
    return false;
  }

  const pendingSubscriptionPackageId = getComparableId(packageIdFromPendingSub);
  const packageId = getComparableId(pkg._id);

  const nameMatch =
    pkg.name &&
    typeof packageIdFromPendingSub === 'object' &&
    packageIdFromPendingSub !== null &&
    (packageIdFromPendingSub as Record<string, unknown>).name === pkg.name;

  return pendingSubscriptionPackageId === packageId || !!nameMatch;
};

export default {
  checkPaymentSent,
  isSuccessfulSubscription,
  isCurrentSubscribedPackage,
  isPendingSubscribedPackage
};
