import type { TeProfile } from './types';
import { ENDPOINT, fetchTeProfile, safeJsonParse, type ApiError } from './api';
import { getApiKey, setApiKey } from './auth';

const PROFILE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type ProfileButtonState = 'no-key' | 'error' | 'not-found' | 'inactive' | 'active';

export function isProfilePage(): boolean {
  return /profiles\.php/.test(location.pathname) && /XID=\d+/.test(location.search);
}

export function getProfileXid(): string | null {
  const match = location.search.match(/XID=(\d+)/);
  return match ? match[1] : null;
}

interface CachedProfileEntry {
  state: ProfileButtonState;
  data: TeProfile | null;
  timestamp: number;
}

function getCachedProfile(xid: string): { state: ProfileButtonState; data: TeProfile | null } | null {
  const raw = GM_getValue<string | null>('te_profile_cache_' + xid, null);
  if (!raw) {
    return null;
  }

  const parsed = safeJsonParse<CachedProfileEntry>(raw);
  if (!parsed || Date.now() - parsed.timestamp > PROFILE_CACHE_TTL_MS) {
    return null;
  }

  return { state: parsed.state, data: parsed.data };
}

function setCachedProfile(xid: string, state: ProfileButtonState, data: TeProfile | null): void {
  const entry: CachedProfileEntry = { state, data, timestamp: Date.now() };
  GM_setValue('te_profile_cache_' + xid, JSON.stringify(entry));
}

interface ProfileActionsPanel {
  title: HTMLElement;
  cont: HTMLElement;
}

function getProfileActionsPanel(): ProfileActionsPanel | null {
  const outer = document.querySelector('.profile-buttons.profile-action');
  if (!outer) {
    return null;
  }
  const wrapper = outer.querySelector(':scope > div');
  if (!wrapper) {
    return null;
  }
  const title = wrapper.querySelector(':scope > .title-black.top-round') as HTMLElement | null;
  const cont = wrapper.querySelector(':scope > .cont.bottom-round') as HTMLElement | null;
  if (!title || !cont) {
    return null;
  }
  return { title, cont };
}

let originalPanelTitle: string | undefined;

// Swaps in TE panel content without destroying Torn's own buttons/listeners:
// the original content is hidden (not replaced) and restored on cancel.
function showTraderPanel(titleText: string, contentHtml: string): HTMLElement | null {
  const panel = getProfileActionsPanel();
  if (!panel) {
    return null;
  }

  if (originalPanelTitle === undefined) {
    originalPanelTitle = panel.title.textContent ?? '';
  }

  const originalContent = panel.cont.querySelector(':scope > .profile-container') as HTMLElement | null;
  if (originalContent) {
    originalContent.style.display = 'none';
  }

  let tePanel = panel.cont.querySelector('.te_profile_panel') as HTMLElement | null;
  if (!tePanel) {
    tePanel = document.createElement('div');
    tePanel.className = 'te_profile_panel';
    panel.cont.appendChild(tePanel);
  }
  tePanel.innerHTML = contentHtml;

  panel.title.textContent = titleText;

  tePanel.querySelector('.te_cancel_btn')?.addEventListener('click', hideTraderPanel);

  return tePanel;
}

function hideTraderPanel(): void {
  const panel = getProfileActionsPanel();
  if (!panel) {
    return;
  }

  panel.cont.querySelector('.te_profile_panel')?.remove();

  const originalContent = panel.cont.querySelector(':scope > .profile-container') as HTMLElement | null;
  if (originalContent) {
    originalContent.style.display = '';
  }

  if (originalPanelTitle !== undefined) {
    panel.title.textContent = originalPanelTitle;
  }
}

function showTraderInfoPanel(data: TeProfile): void {
  const priceListUrl = ENDPOINT + '/prices/' + encodeURIComponent(data.name);
  const reviewsUrl = data.reviews ? 'https://www.torn.com/' + data.reviews : null;

  const reviewsButton = reviewsUrl
    ? `<a href="${reviewsUrl}" target="_blank" rel="noopener noreferrer" class="torn-btn">Reviews</a>`
    : `<span class="torn-btn disable">No reviews</span>`;

  const html = `
        <div class="te_trader_info">
            <div class="te_trader_info_stats"><b>${data.votes}</b> vote${data.votes === 1 ? '' : 's'}</div>
            <div class="te_trader_info_actions">
                ${reviewsButton}
                <a href="${priceListUrl}" target="_blank" rel="noopener noreferrer" class="torn-btn">Price List</a>
            </div>
            <button type="button" class="cancel-btn t-blue c-pointer h bold te_cancel_btn">Cancel</button>
        </div>
    `;

  showTraderPanel('Active Torn Exchange trader', html);
}

function showApiKeyPanel(xid: string, link: HTMLAnchorElement): void {
  const html = `
        <div class="te_trader_info">
            <div class="te_trader_info_row">
                <input type="text" id="te_profile_api_key_input" class="te_input" placeholder="Torn API key">
            </div>
            <div class="te_trader_info_row">
                <button type="button" class="te_button te_api_key_save_btn">Save</button>
                <button type="button" class="cancel-btn t-blue c-pointer h bold te_cancel_btn">Cancel</button>
            </div>
        </div>
    `;

  const tePanel = showTraderPanel('Set Torn Exchange API Key', html);
  if (!tePanel) {
    return;
  }

  tePanel.querySelector('.te_api_key_save_btn')!.addEventListener('click', function () {
    const input = document.getElementById('te_profile_api_key_input') as HTMLInputElement;
    const key = input.value.trim();
    if (!key) {
      return;
    }
    setApiKey(key);
    hideTraderPanel();
    loadProfileButtonData(link, xid);
  });
}

function setProfileButtonState(
  link: HTMLAnchorElement,
  state: ProfileButtonState,
  data: TeProfile | null,
  xid: string,
): void {
  link.className = 'profile-button te_profile_button';
  link.onclick = null;
  link.removeAttribute('target');
  link.removeAttribute('rel');

  if (state === 'no-key') {
    link.classList.add('te_profile_button_disabled');
    link.title = 'Set your Torn Exchange API key to see trader info';
    link.href = '#';
    link.onclick = function (e) {
      e.preventDefault();
      showApiKeyPanel(xid, link);
    };
    return;
  }

  if (state === 'error') {
    link.classList.add('te_profile_button_disabled');
    link.title = 'Unable to reach Torn Exchange';
    link.href = ENDPOINT;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return;
  }

  if (state === 'not-found') {
    link.classList.add('te_profile_button_disabled');
    link.title = 'This user has never used Torn Exchange';
    link.href = ENDPOINT;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return;
  }

  if (state === 'inactive') {
    link.classList.add('te_profile_button_disabled');
    link.title = 'Not an active Torn Exchange trader';
    link.href = ENDPOINT;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return;
  }

  link.title = 'Active Torn Exchange trader';
  link.href = '#';
  link.onclick = function (e) {
    e.preventDefault();
    if (data) {
      showTraderInfoPanel(data);
    }
  };
}

function loadProfileButtonData(link: HTMLAnchorElement, xid: string): void {
  const cached = getCachedProfile(xid);
  if (cached) {
    setProfileButtonState(link, cached.state, cached.data, xid);
    return;
  }

  link.classList.add('te_profile_button_loading');
  link.title = 'Loading Torn Exchange data...';

  if (!getApiKey()) {
    link.classList.remove('te_profile_button_loading');
    setProfileButtonState(link, 'no-key', null, xid);
    return;
  }

  fetchTeProfile(xid, function (error: ApiError | null, data) {
    link.classList.remove('te_profile_button_loading');

    let state: ProfileButtonState;
    if (error) {
      if (error.apiMessage === 'Invalid request parameters') {
        state = 'not-found';
      } else {
        console.error('Error fetching TE profile:', error);
        state = 'error';
      }
    } else {
      state = data && data.active_trader ? 'active' : 'inactive';
    }

    // Don't cache transient/network errors so a re-render retries the fetch.
    if (state !== 'error') {
      setCachedProfile(xid, state, error ? null : data);
    }

    setProfileButtonState(link, state, error ? null : data, xid);
  });
}

function setupProfileButton(): void {
  if (document.querySelector('.te_profile_button')) {
    return;
  }

  const buttonsList = document.querySelector('.profile-buttons.profile-action .buttons-list');
  if (!buttonsList) {
    return;
  }

  const xid = getProfileXid();
  if (!xid) {
    return;
  }

  const link = document.createElement('a');
  link.className = 'profile-button te_profile_button te_profile_button_loading';
  link.href = '#';
  link.title = 'Loading Torn Exchange data...';
  link.setAttribute('aria-label', 'Torn Exchange');

  const icon = document.createElement('img');
  icon.className = 'te_profile_button_icon';
  icon.src = 'https://tornexchange.com/static/main/images/favicon.1b624a7fb707.png';
  icon.alt = 'Torn Exchange';

  link.appendChild(icon);
  buttonsList.appendChild(link);

  loadProfileButtonData(link, xid);
}

let profileObserverStarted = false;

export function handleProfilePage(): void {
  if (!isProfilePage()) {
    return;
  }

  setupProfileButton();

  if (profileObserverStarted) {
    return;
  }
  profileObserverStarted = true;

  // Torn's own action buttons (Send Money, Chat, etc.) re-render `.buttons-list`
  // from scratch when their mini-panel is opened/cancelled, wiping out anything
  // we injected. Keep watching and re-inject (setupProfileButton is a no-op if
  // the button is already present).
  const observer = new MutationObserver(function () {
    setupProfileButton();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
