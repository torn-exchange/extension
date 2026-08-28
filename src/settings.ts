export interface TeSettings {
  // Collapse the item list into a fixed-height scroll box on long trades,
  // but only when every price is known (so the trader has nothing to fix).
  collapseItems: boolean;
}

const STORAGE_KEY = 'te_settings';

const DEFAULTS: TeSettings = {
  collapseItems: true,
};

export function getSettings(): TeSettings {
  const stored = GM_getValue<Partial<TeSettings> | null>(STORAGE_KEY, null);
  return { ...DEFAULTS, ...(stored ?? {}) };
}

export function setSettings(next: Partial<TeSettings>): void {
  GM_setValue(STORAGE_KEY, { ...getSettings(), ...next });
}
