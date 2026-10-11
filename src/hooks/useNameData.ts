'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { loadNameData, type NameData, type NameLanguage } from '@/lib/pokemon-names';

/** Localized names for the chosen language: null for English or until the data has loaded. */
export function useNameData(lang: NameLanguage): NameData | null {
  const [data, setData] = useState<NameData | null>(null);

  useEffect(() => {
    if (lang === 'en') return;
    let cancelled = false;
    loadNameData().then(
      (d) => !cancelled && setData(d),
      () => {}, // offline: English names keep working
    );
    return () => {
      cancelled = true;
    };
  }, [lang]);

  return lang === 'en' ? null : data;
}

export interface NameLanguageValue {
  lang: NameLanguage;
  /** Null for English, or while the names are still downloading. */
  data: NameData | null;
}

/** The device's name language, provided by Game so screens can localize names without props. */
export const NameLanguageContext = createContext<NameLanguageValue>({ lang: 'en', data: null });

export function useNameLanguage(): NameLanguageValue {
  return useContext(NameLanguageContext);
}
