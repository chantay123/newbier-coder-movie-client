/**
 * @file TaxonomyTableSkeleton.tsx
 * @description Cinema Dark pulsing table skeleton for taxonomy lists while API queries are in flight.
 * Prevents layout shift (CLS = 0) and maintains seamless visual continuity.
 */
import React from 'react';
import styles from '@/styles/AdminLoading.module.css';
import { TaxonomyType } from '@/features/admin/types/taxonomy';
import { ADMIN_TAXONOMY_SKELETON_ROWS } from '@/config/taxonomyAdminConfig';

/**
 * The props of the `TaxonomyTableSkeleton` component.
 */
interface TaxonomyTableSkeletonProps {
  /** The taxonomy the skeleton stands for, used to shape the columns. */
  type: TaxonomyType;
  /** The number of skeleton rows to render. */
  rowCount?: number;
}

/**
 * Renders the placeholder rows shown while a taxonomy list is loading.
 *
 * @param props - The props of the component.
 * @returns The skeleton rows of the table.
 */
export default function TaxonomyTableSkeleton({
  type,
  rowCount = ADMIN_TAXONOMY_SKELETON_ROWS
}: TaxonomyTableSkeletonProps) {
  const isYearType = type === 'years';
  const isCountryType = type === 'countries';
  const rows = Array.from({ length: rowCount }, (_, i) => i);

  return (
    <>
      {rows.map((rowIdx) => (
        <tr key={`skeleton-row-${rowIdx}`} className={styles.skeletonRow}>
          {/* Primary Name Column */}
          <td className={styles.skeletonCell}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {isCountryType ? (
                <div className={`${styles.skeletonBlock} ${styles.skeletonAvatar}`} />
              ) : (
                <div
                  className={`${styles.skeletonBlock}`}
                  style={{ width: '24px', height: '24px', borderRadius: '4px' }}
                />
              )}
              <div>
                <div
                  className={`${styles.skeletonBlock} ${styles.skeletonTextLg}`}
                  style={{ width: `${100 + (rowIdx % 3) * 35}px` }}
                />
                <div
                  className={`${styles.skeletonBlock} ${styles.skeletonTextSm}`}
                  style={{ width: `${60 + (rowIdx % 2) * 20}px` }}
                />
              </div>
            </div>
          </td>

          {/* Description / Code Column */}
          {!isYearType && (
            <td className={styles.skeletonCell}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  className={`${styles.skeletonBlock}`}
                  style={{ width: '42px', height: '18px', borderRadius: '4px' }}
                />
                <div
                  className={`${styles.skeletonBlock}`}
                  style={{ height: '14px', width: `${120 + (rowIdx % 4) * 30}px`, borderRadius: '4px' }}
                />
              </div>
            </td>
          )}

          {/* Movie Count Badge Column */}
          <td className={styles.skeletonCell}>
            <div className={`${styles.skeletonBlock} ${styles.skeletonBadge}`} />
          </td>

          {/* Status Switch Column */}
          <td className={styles.skeletonCell}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className={`${styles.skeletonBlock} ${styles.skeletonSwitch}`} />
              <div
                className={`${styles.skeletonBlock}`}
                style={{ height: '12px', width: '50px', borderRadius: '4px' }}
              />
            </div>
          </td>

          {/* Action Buttons Column */}
          <td className={styles.skeletonCell} style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              <div className={`${styles.skeletonBlock} ${styles.skeletonButton}`} />
              <div className={`${styles.skeletonBlock} ${styles.skeletonButton}`} />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}
