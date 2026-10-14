import React, { useState, useRef, useMemo, useEffect } from 'react';
import { groupServersByTrack, type ServerEntry } from '@/features/client/components/detail/utils/serverTrackHelper';
import styles from './ServerVersionSelector.module.css';

/**
 * @file ServerVersionSelector.tsx
 * @description Sleek audio version selector (Vietsub, Thuyết Minh, Lồng Tiếng).
 */

export interface ServerVersionSelectorProps {
  servers?: ServerEntry[];
  currentServerIndex?: number;
  onSelectServer?: (index: number) => void;
  label?: string;
}

const ServerVersionSelector: React.FC<ServerVersionSelectorProps> = ({
  servers = [],
  currentServerIndex = 0,
  onSelectServer,
  label
}) => {
  const [openDropdownKey, setOpenDropdownKey] = useState<string | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  // Group raw servers by audio type
  const groups = useMemo(() => groupServersByTrack(servers), [servers]);

  // If there is only 1 server total, don't show selector
  if (!servers || servers.length <= 1) {
    return null;
  }

  const handleMouseEnter = (key: string, hasMultiple: boolean): void => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    if (hasMultiple) {
      setOpenDropdownKey(key);
    }
  };

  const handleMouseLeave = (): void => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = setTimeout(() => {
      setOpenDropdownKey(null);
    }, 280);
  };

  const handleButtonClick = (group: typeof groups[number]): void => {
    const hasMultiple = group.sources.length > 1;
    const isCurrentlyActiveGroup = group.sources.some(
      (s) => s.originalIndex === currentServerIndex
    );

    if (!hasMultiple) {
      if (onSelectServer) onSelectServer(group.sources[0].originalIndex);
      setOpenDropdownKey(null);
    } else {
      if (isCurrentlyActiveGroup) {
        setOpenDropdownKey((prev) => (prev === group.key ? null : group.key));
      } else {
        if (onSelectServer) onSelectServer(group.sources[0].originalIndex);
        setOpenDropdownKey(group.key);
      }
    }
  };

  const handleSelectSource = (index: number): void => {
    if (onSelectServer) onSelectServer(index);
    setOpenDropdownKey(null);
  };

  return (
    <div className={styles.wrapper} aria-label="Chọn phiên bản và nguồn phát">
      {label && (
        <span className={styles.selectorLabel}>
          <i className={`fas fa-closed-captioning ${styles.labelIcon}`} />
          {label}
        </span>
      )}

      <div className={styles.btnGroup}>
        {groups.map((group) => {
          const hasMultiple = group.sources.length > 1;
          const isActive = group.sources.some(
            (s) => s.originalIndex === currentServerIndex
          );
          const isOpen = openDropdownKey === group.key;

          return (
            <div
              key={group.key}
              className={styles.versionPillWrapper}
              onMouseEnter={() => handleMouseEnter(group.key, hasMultiple)}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                className={`${styles.versionBtn} ${isActive ? styles.versionBtnActive : ''}`}
                onClick={() => handleButtonClick(group)}
                aria-expanded={isOpen}
                title={
                  hasMultiple
                    ? `${group.label} (${group.sources.length} nguồn - Rê chuột để chọn)`
                    : `Bản ${group.label}`
                }
              >
                <i className={`${group.icon} ${styles.trackIcon}`} />
                <span>{group.label}</span>
                {hasMultiple && (
                  <i
                    className={`fas fa-chevron-down ${styles.chevronIcon} ${isOpen ? styles.chevronOpen : ''}`}
                  />
                )}
              </button>

              {/* Hover Dropdown for multiple sources */}
              {hasMultiple && isOpen && (
                <div
                  className={styles.dropdownPopover}
                  role="menu"
                  onMouseEnter={() => {
                    if (leaveTimerRef.current) {
                      clearTimeout(leaveTimerRef.current);
                      leaveTimerRef.current = null;
                    }
                  }}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className={styles.dropdownTitle}>Nguồn {group.label}:</div>
                  {group.sources.map((source) => {
                    const isSourceActive = source.originalIndex === currentServerIndex;
                    return (
                      <button
                        key={source.originalIndex}
                        type="button"
                        role="menuitem"
                        className={`${styles.sourceOptionBtn} ${isSourceActive ? styles.sourceOptionBtnActive : ''}`}
                        onClick={() => handleSelectSource(source.originalIndex)}
                      >
                        <span>{source.sourceLabel}</span>
                        {isSourceActive && (
                          <i className={`fas fa-check ${styles.sourceCheckIcon}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ServerVersionSelector;
