import { getApiKey, showApiKeyPrompt } from './auth';
import { fetchReceiptByTradeId } from './api';
import { getUsernameFromTradePage } from './dom-scrape';
import { setup, showLookupButton, renderReceipt, showLoader, showLookupError, getWrapper, setSettingsHandler } from './ui';

export function isTradePage(): boolean {
  const hash = location.hash;
  return /step=(view|accept|accept2)/.test(hash);
}

export function getTradeId(): string | null {
  const match = location.hash.match(/ID=(\d+)/);
  return match ? match[1] : null;
}

export function observeElement(selector: string, callback: (element: Element) => void = () => {}): void {
  const observer = new MutationObserver((_mutations, obs) => {
    let element: Element | null = null;
    if (selector.startsWith('#')) {
      element = document.getElementById(selector.slice(1));
    } else if (selector.startsWith('.')) {
      element = document.querySelector(selector);
    }

    if (element) {
      callback(element);
      obs.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function showSettings(): void {
  showApiKeyPrompt(getWrapper(), handleTradePage, getApiKey());
}

export function handleTradePage(): void {
  setSettingsHandler(showSettings);

  if (!getApiKey()) {
    showApiKeyPrompt(getWrapper(), handleTradePage);
    return;
  }

  const tradeId = getTradeId();
  if (!tradeId) {
    showLookupButton();
    return;
  }

  showLoader('Checking for an existing receipt...');

  fetchReceiptByTradeId(tradeId, function (error, existingReceipt) {
    if (error) {
      console.error('Error checking for existing receipt:', error);
      showLookupError('Could not check for an existing receipt. Click the cog icon to update your API key, or reload to try again.');
      return;
    }

    if (existingReceipt) {
      const meta = existingReceipt.meta;
      const data = existingReceipt.data;

      const priceData = {
        items: data.items,
        quantities: data.quantities,
        market_prices: data.market_prices,
        prices: data.prices,
        image_url: data.image_url,
        buyer_name: getUsernameFromTradePage(),
        seller_name: meta.seller,
        buyer_id: undefined,
      };

      renderReceipt({
        receipt_id: meta.receipt_id,
        total: meta.total,
        trade_message: meta.trade_message,
        priceData,
        buyerName: getUsernameFromTradePage(),
        sellerName: meta.seller,
      });
      return;
    }

    showLookupButton();
  });
}

export function handlePage(): void {
  if (!isTradePage()) {
    return;
  }

  observeElement('.info-msg-cont:not(.red)', function () {
    const container = setup();
    if (container) {
      handleTradePage();
    }
  });
}
