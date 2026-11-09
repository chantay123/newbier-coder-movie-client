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
 * Generates fallback initials from the country name or code.
 * For example "Vietnam" becomes "VN" and "Korea" becomes "KR".
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
 * Renders the flag image of a country.
 *
 * The image is loaded from the FIRST URL that works. Two CDNs are tried,
 * because one of them can be blocked by the network of the user. When no
 * image loads, the component falls back to the short text code of the
 * country, such as "VN".
 */
export default function CountryFlag({ name, code, flag, className }: CountryFlagProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  /**
   * The candidate URLs of the flag image, in priority order.
   *
   * 1. The direct image URL, when the admin pasted one.
   * 2. The alpha-2 code, on the two flag CDNs.
   * 3. The flag emoji, whose two letters are the alpha-2 code.
   */
  const flagSources = useMemo(() => {
    const sources: string[] = [];

    if (flag && (flag.startsWith('http://') || flag.startsWith('https://') || flag.startsWith('/') || flag.startsWith('data:'))) {
      sources.push(flag);
    }

    const cleanCode = (code || '').trim().toLowerCase();
    const emojiCode = getCodeFromEmoji(flag);
    const alpha2 = /^[a-z]{2}$/.test(cleanCode)
      ? cleanCode
      : emojiCode;

    if (alpha2) {
      sources.push(`https://flagcdn.com/w40/${alpha2}.png`);
      sources.push(`https://flags.restcountries.com/v5/w320/${alpha2}.png`);
    }

    return sources;
  }, [code, flag]);

  const initials = useMemo(() => getCountryInitials(name, code), [name, code]);

  // The first source that has not failed yet.
  const flagSrc = flagSources.find((src) => src !== failedSrc) ?? null;

  if (flagSrc) {
    return (
      <span className={`${styles.flagImgWrapper} ${className || ''}`} title={`${name} (${initials})`}>
        <img
          src={flagSrc}
          alt={name}
          className={styles.flagImg}
          onError={() => setFailedSrc(flagSrc)}
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
