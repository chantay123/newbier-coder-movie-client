// src/components/Admin/Common/CinemaDropdown.tsx
'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { FaChevronDown, FaCheck, FaSearch } from 'react-icons/fa';
import styles from '@/styles/CinemaDropdown.module.css';

export interface CinemaDropdownOption {
  value: string | number;
  label: string;
  desc?: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface CinemaDropdownProps {
  options: CinemaDropdownOption[];
  value: string | number | undefined;
  onChange: (val: any) => void;
  placeholder?: string;
  prefixIcon?: React.ReactNode;
  size?: 'filter' | 'form' | 'compact';
  fullWidth?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  menuAlign?: 'left' | 'right';
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
  id?: string;
  ariaLabel?: string;
}

export default function CinemaDropdown({
  options,
  value,
  onChange,
  placeholder = 'Chọn một mục...',
  prefixIcon,
  size = 'filter',
  fullWidth = false,
  searchable,
  searchPlaceholder = 'Tìm trong danh sách...',
  menuAlign = 'left',
  disabled = false,
  hasError = false,
  className = '',
  id,
  ariaLabel
}: CinemaDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Selected Option
  const selectedOption = useMemo(() => {
    return options.find(opt => String(opt.value) === String(value));
  }, [options, value]);

  // Determine if search is automatically shown
  const shouldShowSearch = useMemo(() => {
    if (typeof searchable === 'boolean') return searchable;
    return options.length > 8;
  }, [searchable, options.length]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const lower = searchQuery.toLowerCase();
    return options.filter(opt =>
      opt.label.toLowerCase().includes(lower) ||
      (opt.desc && opt.desc.toLowerCase().includes(lower))
    );
  }, [options, searchQuery]);

  // Close on Outside Click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      if (shouldShowSearch) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    } else {
      setSearchQuery('');
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, shouldShowSearch]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (!isOpen) {
        e.preventDefault();
        setIsOpen(true);
      }
    } else if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    }
  }, [disabled, isOpen]);

  const handleSelect = (val: string | number) => {
    onChange(val);
    setIsOpen(false);
  };

  const getSizeClass = () => {
    switch (size) {
      case 'form': return styles.sizeForm;
      case 'compact': return styles.sizeCompact;
      case 'filter':
      default:
        return styles.sizeFilter;
    }
  };

  return (
    <div
      ref={containerRef}
      id={id}
      className={`${styles.dropdownContainer} ${fullWidth || size === 'form' ? styles.fullWidth : ''} ${className}`}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className={`${styles.triggerBtn} ${getSizeClass()} ${isOpen ? styles.isOpen : ''} ${hasError ? styles.hasError : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || placeholder}
      >
        <div className={styles.triggerLeft}>
          {prefixIcon && <span className={styles.prefixIcon}>{prefixIcon}</span>}
          {selectedOption?.icon && <span className={styles.prefixIcon}>{selectedOption.icon}</span>}
          {selectedOption ? (
            <span className={styles.labelActive}>{selectedOption.label}</span>
          ) : (
            <span className={styles.labelPlaceholder}>{placeholder}</span>
          )}
        </div>

        <FaChevronDown className={`${styles.chevronIcon} ${isOpen ? styles.chevronRotated : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`${styles.floatingMenu} ${menuAlign === 'right' ? styles.menuAlignRight : ''}`}
          role="listbox"
        >
          {shouldShowSearch && (
            <div className={styles.searchBoxWrapper}>
              <FaSearch className={styles.searchIcon} />
              <input
                ref={searchInputRef}
                type="text"
                className={styles.searchInput}
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          )}

          <div className={styles.optionsList}>
            {filteredOptions.length === 0 ? (
              <div className={styles.emptyOptions}>Không có lựa chọn phù hợp</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`${styles.optionItem} ${isSelected ? styles.optionItemSelected : ''}`}
                    onClick={() => handleSelect(opt.value)}
                  >
                    <div className={styles.optionLeft}>
                      {opt.icon && <span className={styles.optionIcon}>{opt.icon}</span>}
                      <div className={styles.optionTextGroup}>
                        <span className={styles.optionMainText}>{opt.label}</span>
                        {opt.desc && <span className={styles.optionDesc}>{opt.desc}</span>}
                      </div>
                    </div>

                    <div className={styles.optionRight}>
                      {opt.badge !== undefined && (
                        <span className={styles.optionBadge}>{opt.badge}</span>
                      )}
                      {isSelected && <FaCheck className={styles.checkIcon} />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
