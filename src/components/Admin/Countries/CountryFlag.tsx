// src/components/Admin/Countries/CountryFlag.tsx
'use client';

import React, { useState, useMemo } from 'react';
import styles from '@/styles/AdminTaxonomies.module.css';

interface CountryFlagProps {
  name: string;
  code?: string;
  flag?: string;
  className?: string;
}

/**
 * Extracts 2-letter ISO country code from emoji flag (e.g. '🇻🇳' -> 'vn')
 */
function getCodeFromEmoji(flag?: string): string | null {
  if (!flag) return null;
  const chars = Array.from(flag.trim());
  if (chars.length >= 2) {
    const code1 = chars[0].codePointAt(0);
    const code2 = chars[1].codePointAt(0);
    if (
      code1 && code2 &&
      code1 >= 0x1F1E6 && code1 <= 0x1F1FF &&
      code2 >= 0x1F1E6 && code2 <= 0x1F1FF
    ) {
      return (
        String.fromCharCode(code1 - 0x1F1E6 + 65) +
        String.fromCharCode(code2 - 0x1F1E6 + 65)
      ).toLowerCase();
    }
  }
  return null;
}

/**
 * Generates fallback initials from country name or code
 * e.g. "Việt Nam" -> "VN", "Hàn Quốc" -> "HQ" (hoặc "KR" nếu có code)
 */
export function getCountryInitials(name: string, code?: string): string {
  if (code && /^[a-zA-Z]{2,3}$/.test(code.trim())) {
    return code.trim().toUpperCase();
  }
  const cleanName = (name || '').trim();
  if (!cleanName) return '??';

  const words = cleanName.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  return cleanName.slice(0, 2).toUpperCase();
}

/**
 * Component hiển thị hình ảnh cờ quốc gia (Flag Image).
 * Nếu không có ảnh hoặc tải ảnh thất bại, sẽ fallback hiển thị chữ viết tắt của quốc gia (VD: "VN").
 */
export default function CountryFlag({ name, code, flag, className }: CountryFlagProps) {
  const [imgError, setImgError] = useState(false);

  // Compute flag image URL
  const flagSrc = useMemo(() => {
    // 1. Direct image URL
    if (flag && (flag.startsWith('http://') || flag.startsWith('https://') || flag.startsWith('/') || flag.startsWith('data:'))) {
      return flag;
    }
    // 2. Alpha-2 code
    const cleanCode = (code || '').trim().toLowerCase();
    if (/^[a-z]{2}$/.test(cleanCode)) {
      return `https://flagcdn.com/w40/${cleanCode}.png`;
    }
    // 3. Emoji flag
    const emojiCode = getCodeFromEmoji(flag);
    if (emojiCode) {
      return `https://flagcdn.com/w40/${emojiCode}.png`;
    }
    return null;
  }, [code, flag]);

  const initials = useMemo(() => getCountryInitials(name, code), [name, code]);

  if (flagSrc && !imgError) {
    return (
      <span className={`${styles.flagImgWrapper} ${className || ''}`} title={`${name} (${initials})`}>
        <img
          src={flagSrc}
          alt={name}
          className={styles.flagImg}
          onError={() => setImgError(true)}
          loading="lazy"
        />
      </span>
    );
  }

  return (
    <span
      className={`${styles.flagFallbackBadge} ${className || ''}`}
      title={name}
    >
      {initials}
    </span>
  );
}
