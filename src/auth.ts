import { getSettings, setSettings } from './settings';

export function getApiKey(): string | null {
  return GM_getValue<string | null>('te_api_key', null);
}

export function setApiKey(key: string): void {
  GM_setValue('te_api_key', key);
}

export function clearApiKey(): void {
  GM_setValue('te_api_key', null);
}

export function showApiKeyPrompt(
  wrapper: HTMLElement,
  onSaved: () => void,
  currentKey: string | null = null,
  onCancel?: () => void,
): void {
  const settings = getSettings();

  wrapper.innerHTML = `
        <div class="te_settings">
            <div style="display: flex; align-items: center; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                <label for="te_api_key_input">Enter Torn API key that you login into Torn Exchange</label>
                <input type="text" id="te_api_key_input" class="te_input" style="max-width:250px;" placeholder="Torn API key" value="${currentKey ?? ''}">
            </div>
            <div class="te_settings_option">
                <label>
                    <input type="checkbox" id="te_setting_collapse" ${settings.collapseItems ? 'checked' : ''}>
                    Collapse long item lists (only when every price is known)
                </label>
            </div>
            <div class="te_settings_actions">
                <button id="te_api_key_save" class="te_button">Save</button>
                ${currentKey ? '<button id="te_api_key_clear" class="te_button_dark">Clear key</button>' : ''}
                ${onCancel ? '<button id="te_settings_cancel" class="te_button_dark">Cancel</button>' : ''}
            </div>
        </div>
    `;

  document.getElementById('te_api_key_save')!.addEventListener('click', function () {
    const input = document.getElementById('te_api_key_input') as HTMLInputElement;
    const collapseItems = (document.getElementById('te_setting_collapse') as HTMLInputElement).checked;
    setSettings({ collapseItems });

    const key = input.value.trim();
    if (!key) {
      return;
    }
    setApiKey(key);
    onSaved();
  });

  document.getElementById('te_api_key_clear')?.addEventListener('click', function () {
    clearApiKey();
    onSaved();
  });

  document.getElementById('te_settings_cancel')?.addEventListener('click', function () {
    onCancel?.();
  });
}
