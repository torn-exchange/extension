export function getApiKey(): string | null {
  return GM_getValue<string | null>('te_api_key', null);
}

export function setApiKey(key: string): void {
  GM_setValue('te_api_key', key);
}

export function showApiKeyPrompt(wrapper: HTMLElement, onSaved: () => void): void {
  wrapper.innerHTML = `
        <div>
            <div style="display: flex; align-items: center; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                <label for="te_api_key_input">Enter Torn API key that you login into Torn Exchange</label>
                <input type="text" id="te_api_key_input" class="te_input" style="max-width:250px;" placeholder="Torn API key">
                <button id="te_api_key_save" class="te_button">Save</button>
            </div>
        </div>
    `;

  document.getElementById('te_api_key_save')!.addEventListener('click', function () {
    const input = document.getElementById('te_api_key_input') as HTMLInputElement;
    const key = input.value.trim();
    if (!key) {
      return;
    }
    setApiKey(key);
    onSaved();
  });
}
