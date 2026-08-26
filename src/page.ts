import { getApiKey, showApiKeyPrompt } from './auth';
import { fetchReceiptByTradeId } from './api';
import { getTradeItems, tradeItemsMatch, getUsernameFromTradePage } from './dom-scrape';
import { setup, showLookupButton, renderReceipt, showLoader, showLookupError, getWrapper, setSettingsHandler } from './ui';
import { recordTradeAction, getTradeAction, formatTimeAgo } from './trade-status';

export function isTradePage(): boolean {
  const hash = location.hash;
  return /step=(view|accept|accept2)/.test(hash);
}

export function getTradeId(): string | null {
  const match = location.hash.match(/ID=(\d+)/);
  return match ? match[1] : null;
}

export function observeElement(selector: string, callback: (element: Element) => void = () => {}): void {
  const existing = document.querySelector(selector);
  if (existing) {
    callback(existing);
    return;
  }

  const observer = new MutationObserver((_mutations, obs) => {
    const element = document.querySelector(selector);
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

      const liveTradeItems = getTradeItems();
      if (liveTradeItems && !tradeItemsMatch(liveTradeItems, { items: data.items, quantities: data.quantities })) {
        showLookupButton(
          'The trade items have changed since this receipt was generated. Look up prices again to create an up-to-date receipt.',
        );
        return;
      }

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

const TRADE_STATUS_BADGE_CLASS = 'te_trade_status_badge';

// After accepting/declining, Torn navigates to a `step=accept2`/`step=decline`
// hash and shows a one-line confirmation alert. Watch for it and persist the
// outcome locally so the trades list (which Torn doesn't annotate) can show it.
export function observeTradeConfirmation(): void {
  function check(): void {
    if (!/step=(accept2|decline)/.test(location.hash)) {
      return;
    }
    const tradeId = getTradeId();
    if (!tradeId) {
      return;
    }

    observeElement('.msg.right-round', function (el) {
      const text = el.textContent ?? '';
      if (/accepted/i.test(text)) {
        recordTradeAction(tradeId, 'accepted');
      } else if (/declined/i.test(text)) {
        recordTradeAction(tradeId, 'declined');
      }
    });
  }

  check();
  window.addEventListener('hashchange', check);
}

function getTradeIdFromListItem(li: Element): string | null {
  const href = li.querySelector('.view a[href]')?.getAttribute('href') ?? '';
  const match = href.match(/ID=(\d+)/);
  return match ? match[1] : null;
}

function annotateTradeListItem(li: Element): void {
  const tradeId = getTradeIdFromListItem(li);
  const descP = li.querySelector('.desc p');
  if (!tradeId || !descP) {
    return;
  }

  const existingBadge = descP.querySelector(`.${TRADE_STATUS_BADGE_CLASS}`);
  const record = getTradeAction(tradeId);

  if (!record || record.status !== 'accepted') {
    existingBadge?.remove();
    return;
  }

  const badge = existingBadge ?? document.createElement('span');
  badge.className = TRADE_STATUS_BADGE_CLASS;
  badge.textContent = `Accepted ${formatTimeAgo(record.timestamp)}`;
  if (!existingBadge) {
    descP.appendChild(badge);
  }
}

function annotateTradesList(): void {
  document.querySelectorAll('ul.trades-cont.current > li').forEach(annotateTradeListItem);
}

// Torn doesn't mark accepted trades on the list page itself, so we track
// acceptance locally (via observeTradeConfirmation) and inject a badge here.
export function observeTradesList(): void {
  observeElement('ul.trades-cont.current', function (list) {
    annotateTradesList();
    const observer = new MutationObserver(() => annotateTradesList());
    observer.observe(list, { childList: true });
  });

  window.addEventListener('hashchange', annotateTradesList);
  setInterval(annotateTradesList, 30000);
}

const TE_URL_PATTERN = /https:\/\/tornexchange\.com\/\S+/g;

function linkifyTornExchangeUrls(node: Node): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';
    if (!TE_URL_PATTERN.test(text)) {
      return;
    }
    TE_URL_PATTERN.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = TE_URL_PATTERN.exec(text))) {
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      const link = document.createElement('a');
      link.href = match[0];
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = match[0];
      fragment.appendChild(link);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    node.parentNode?.replaceChild(fragment, node);
    return;
  }

  if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName !== 'A') {
    Array.from(node.childNodes).forEach(linkifyTornExchangeUrls);
  }
}

export function observeTradeLog(): void {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'LI') {
          linkifyTornExchangeUrls(node);
        }
      });
    }
  });

  observeElement('ul.log', function (log) {
    Array.from(log.children).forEach((li) => linkifyTornExchangeUrls(li));
    observer.observe(log, { childList: true });
  });
}
