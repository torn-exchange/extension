import type { PriceData, Receipt, TradeItems } from './types';
import { formatPrice, formatTemplateNumbers, formatValue, stripValue, writeToClipboard } from './format';
import { fetchPrices, submitReceipt } from './api';
import { getTradeItems, tradeItemsMatch, getSellerNameFromTradePage, getUsernameFromTradePage } from './dom-scrape';
import { getTradeId } from './page';
import { getSettings } from './settings';

interface TeState {
  container: HTMLElement;
  contents: HTMLElement;
  header: HTMLElement;
  wrapper: HTMLElement;
}

let state: TeState | null = null;
let onSettingsClick: (() => void) | null = null;

export function getWrapper(): HTMLElement {
  if (!state) {
    throw new Error('te-helper UI not set up yet');
  }
  return state.wrapper;
}

export function setSettingsHandler(handler: () => void): void {
  onSettingsClick = handler;
}

export function setup(): HTMLElement | null {
  const existing = document.querySelector('.te_container') as HTMLElement | null;
  if (existing) {
    return existing;
  }

  const container = document.createElement('div');
  container.className = 'te_container';

  const wrapper = document.createElement('div');
  wrapper.className = 'te_wrapper';

  const contents = document.createElement('div');
  contents.className = 'te_contents';

  const header = document.createElement('div');
  header.className = 'te_header';
  header.style.position = 'relative';

  const teImg = document.createElement('img');
  teImg.className = 'te_header_image';
  teImg.src = 'https://tornexchange.com/static/main/images/mainlogo.png';
  teImg.alt = 'Header Image';

  const settingsButton = document.createElement('button');
  settingsButton.className = 'te_settings_button';
  settingsButton.title = 'Update API key';
  settingsButton.setAttribute('aria-label', 'Settings');
  settingsButton.textContent = '⚙';
  settingsButton.addEventListener('click', function () {
    onSettingsClick?.();
  });

  header.appendChild(teImg);
  header.appendChild(settingsButton);
  contents.appendChild(header);
  contents.appendChild(wrapper);
  container.appendChild(contents);

  const anchor = document.querySelector('.info-msg-cont:not(.red)');
  if (!anchor) {
    return null;
  }

  anchor.insertAdjacentElement('afterend', container);

  state = { container, contents, header, wrapper };

  return container;
}

let receiptWatcher: MutationObserver | null = null;
let receiptWatcherTimeout: ReturnType<typeof setTimeout> | null = null;

function stopReceiptWatcher(): void {
  if (receiptWatcherTimeout) {
    clearTimeout(receiptWatcherTimeout);
    receiptWatcherTimeout = null;
  }
  if (receiptWatcher) {
    receiptWatcher.disconnect();
    receiptWatcher = null;
  }
}

function startReceiptWatcher(receipt: Receipt): void {
  stopReceiptWatcher();

  const tradeContainer = document.getElementById('trade-container');
  if (!tradeContainer) {
    return;
  }

  receiptWatcher = new MutationObserver(() => {
    if (receiptWatcherTimeout) {
      clearTimeout(receiptWatcherTimeout);
    }
    receiptWatcherTimeout = setTimeout(() => {
      const liveTradeItems = getTradeItems();
      if (liveTradeItems && !tradeItemsMatch(liveTradeItems, receipt.baselineItems)) {
        console.warn('[te-helper] trade items changed since receipt', {
          liveTradeItems,
          baselineItems: receipt.baselineItems,
        });
        stopReceiptWatcher();
        showChangedBanner();
      }
    }, 300);
  });

  receiptWatcher.observe(tradeContainer, { childList: true, subtree: true, characterData: true });
}

export function showLoader(message = 'Loading'): void {
  stopReceiptWatcher();
  getWrapper().innerHTML = `${message}`;
}

export function showLookupError(message: string): void {
  stopReceiptWatcher();
  getWrapper().innerHTML = `
        <div>
            <span class="te_invalid_feedback" role="alert">
                <strong>${message}</strong>
            </span>
        </div>
        `;
}

interface RowContext {
  item: string;
  quantity: number;
  getPrice: () => number;
  updateProfit: () => { price: number; profit: number };
}

function createTradeRow(priceInfo: {
  item: string;
  quantity: number;
  market_price: number;
  price: number;
  image_url: string;
}): HTMLTableRowElement {
  const row = document.createElement('tr') as HTMLTableRowElement & { _te?: RowContext };

  const imageCell = document.createElement('td');
  imageCell.className = 'te_image';
  const img = document.createElement('img');
  img.src = priceInfo.image_url;
  imageCell.appendChild(img);
  row.appendChild(imageCell);

  const itemCell = document.createElement('td');
  itemCell.className = 'te_item';
  itemCell.innerText = priceInfo.item;
  row.appendChild(itemCell);

  const quantityCell = document.createElement('td');
  quantityCell.className = 'te_quantity';
  quantityCell.innerText = String(priceInfo.quantity);
  row.appendChild(quantityCell);

  const marketPriceCell = document.createElement('td');
  marketPriceCell.className = 'te_market_price';
  marketPriceCell.innerText = formatPrice(priceInfo.market_price);
  row.appendChild(marketPriceCell);

  const priceCell = document.createElement('td');
  const priceInput = document.createElement('input');
  priceInput.className = 'te_input te_price_input';
  priceInput.type = 'text';
  priceInput.value = formatValue(priceInfo.price);
  priceCell.appendChild(priceInput);
  row.appendChild(priceCell);

  const profitCell = document.createElement('td');
  profitCell.className = 'te_profit';
  row.appendChild(profitCell);

  function updateProfit() {
    const price = stripValue(priceInput.value);
    const profit = (priceInfo.market_price - price) * priceInfo.quantity;
    profitCell.innerText = formatPrice(profit);
    return { price, profit };
  }

  updateProfit();

  priceInput.addEventListener('input', function () {
    priceInput.value = formatValue(priceInput.value);
    updateProfit();
    updateTotals();
  });

  row._te = {
    item: priceInfo.item,
    quantity: priceInfo.quantity,
    getPrice: () => stripValue(priceInput.value),
    updateProfit,
  };

  return row;
}

function updateTotals(): void {
  const table = document.querySelector('.te_table');
  if (!table) return;

  let totalPrice = 0;
  let totalProfit = 0;

  table.querySelectorAll('tbody tr').forEach((row) => {
    const { price, profit } = (row as HTMLTableRowElement & { _te: RowContext })._te.updateProfit();
    totalPrice += price * (row as HTMLTableRowElement & { _te: RowContext })._te.quantity;
    totalProfit += profit;
  });

  const totalDiv = document.getElementById('te_total_info');
  if (totalDiv) {
    totalDiv.innerHTML = `
            <span class="te_total_info">Total Price: <span class="te_profit_display">${formatPrice(totalPrice)}</span></span>
            <span class="te_total_info">Total Profit: <span class="te_profit_display">${formatPrice(totalProfit)}</span></span>
        `;
  }
}

export function renderPriceTable(
  priceData: PriceData,
  buyerName: string,
  sellerName: string,
  baselineItems: TradeItems,
): void {
  stopReceiptWatcher();

  const table = document.createElement('table');
  table.className = 'te_table';

  const thead = document.createElement('thead');
  thead.innerHTML = `
        <tr>
            <th>Image</th>
            <th>Item</th>
            <th>Quantity</th>
            <th>Market Price</th>
            <th>Price</th>
            <th>Profit</th>
        </tr>
    `;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (let i = 0; i < priceData.items.length; i++) {
    const row = createTradeRow({
      item: priceData.items[i],
      quantity: priceData.quantities[i],
      market_price: priceData.market_prices[i],
      price: priceData.prices[i],
      image_url: priceData.image_url[i],
    });
    tbody.appendChild(row);
  }
  table.appendChild(tbody);

  const totalDiv = document.createElement('div');
  totalDiv.id = 'te_total_info';

  const submitButton = document.createElement('button');
  submitButton.className = 'te_button_dark';
  submitButton.innerText = 'Submit';
  submitButton.style.marginTop = '10px';
  submitButton.addEventListener('click', function () {
    const itemNames: string[] = [];
    const quantities: number[] = [];
    const prices: number[] = [];

    table.querySelectorAll('tbody tr').forEach((row) => {
      const ctx = (row as HTMLTableRowElement & { _te: RowContext })._te;
      itemNames.push(ctx.item);
      quantities.push(ctx.quantity);
      prices.push(ctx.getPrice());
    });

    const tradeId = getTradeId();

    submitButton.disabled = true;
    submitReceipt(
      buyerName,
      priceData.buyer_id,
      sellerName,
      itemNames,
      quantities,
      prices,
      tradeId,
      function (error, response) {
        if (error || !response) {
          showLookupError('Something went wrong submitting the receipt.');
          return;
        }

        renderReceipt({
          receipt_id: response.receipt_id,
          total: response.total,
          trade_message: response.trade_message,
          priceData,
          buyerName,
          sellerName,
          baselineItems,
        });
      },
    );
  });

  // On long trades the item table causes a lot of scrolling. When the setting is
  // enabled and every price is already known (nothing for the trader to fix),
  // drop the table into a fixed-height scroll box instead of expanding it fully.
  const allPricesKnown = priceData.prices.length > 0 && priceData.prices.every((p) => p > 0);
  const tableHost = document.createElement('div');
  if (getSettings().collapseItems && allPricesKnown) {
    tableHost.className = 'te_scroll';
  }
  tableHost.appendChild(table);

  const wrapper = getWrapper();
  wrapper.innerHTML = '';
  wrapper.appendChild(totalDiv);
  wrapper.appendChild(tableHost);
  wrapper.appendChild(submitButton);

  updateTotals();
}

export function renderReceipt(receipt: Receipt, itemsChanged = false): void {
  startReceiptWatcher(receipt);

  const wrapper = getWrapper();
  wrapper.innerHTML = `
        <div class="response">
            <h4>TE Receipt Created &#9989;</h4>
            <p><b>Total: </b><span class="te_profit_display">${formatPrice(receipt.total)}</span></p>
        </div>
    `;

  const receiptLink = document.createElement('a');
  receiptLink.href = `https://tornexchange.com/receipt/${receipt.receipt_id}`;
  receiptLink.target = '_blank';

  const receiptButton = document.createElement('button');
  receiptButton.className = 'te_button';
  receiptButton.innerText = 'Receipt';
  receiptButton.style.marginRight = '8px';
  receiptLink.appendChild(receiptButton);

  const copyTotalButton = document.createElement('button');
  copyTotalButton.className = 'te_button';
  copyTotalButton.innerText = 'Copy Total';
  copyTotalButton.style.marginRight = '8px';

  const resubmitButton = document.createElement('button');
  resubmitButton.className = 'te_button_dark';
  resubmitButton.innerText = 'Resubmit';
  resubmitButton.addEventListener('click', function () {
    renderPriceTable(receipt.priceData, receipt.buyerName, receipt.sellerName, receipt.baselineItems);
  });

  wrapper.appendChild(copyTotalButton);
  wrapper.appendChild(receiptLink);

  const receiptUrl = receiptLink.href;
  receiptButton.innerText = 'Copy receipt';
  receiptButton.addEventListener('click', function (event) {
    event.preventDefault();
    writeToClipboard(receiptUrl, (error) => {
      if (error) {
        window.prompt('Copy to clipboard: Ctrl+C, Enter', receiptUrl);
      } else {
        const backup = receiptButton.innerText;
        receiptButton.innerText = 'Copied!';
        setTimeout(() => {
          receiptButton.innerText = backup;
        }, 1500);
      }
    });
  });

  let copyMessageButton: HTMLButtonElement | null = null;
  let responseText = '';

  if (receipt.trade_message) {
    copyMessageButton = document.createElement('button');
    copyMessageButton.className = 'te_button';
    copyMessageButton.innerText = 'Copy Receipt Message';
    copyMessageButton.style.marginRight = '8px';
    wrapper.appendChild(copyMessageButton);

    responseText = formatTemplateNumbers(receipt.trade_message);
    copyMessageButton.addEventListener('click', function () {
      writeToClipboard(responseText, (error) => {
        if (error) {
          window.prompt('Copy to clipboard: Ctrl+C, Enter', responseText);
        } else {
          const backup = copyMessageButton!.innerText;
          copyMessageButton!.innerText = 'Copied!';
          setTimeout(() => {
            copyMessageButton!.innerText = backup;
          }, 1500);
        }
      });
    });

    const fillCommentButton = document.createElement('button');
    fillCommentButton.className = 'te_button';
    fillCommentButton.innerText = 'Fill Comment';
    fillCommentButton.style.marginRight = '8px';
    fillCommentButton.addEventListener('click', function () {
      const postTradeMessage = document.getElementById('postTradeMessage') as HTMLTextAreaElement | null;
      if (postTradeMessage) {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          'value',
        )?.set;
        nativeSetter?.call(postTradeMessage, responseText);
        postTradeMessage.dispatchEvent(new Event('input', { bubbles: true }));
        postTradeMessage.dispatchEvent(new Event('change', { bubbles: true }));

        const backup = fillCommentButton.innerText;
        fillCommentButton.innerText = 'Filled!';
        setTimeout(() => {
          fillCommentButton.innerText = backup;
        }, 1500);
      }
    });
    wrapper.appendChild(fillCommentButton);
  }

  wrapper.appendChild(resubmitButton);

  const receiptUrlLink = document.createElement('a');
  receiptUrlLink.href = receiptUrl;
  receiptUrlLink.target = '_blank';
  receiptUrlLink.className = 't-blue h';
  receiptUrlLink.innerText = receiptUrl;
  receiptUrlLink.style.display = 'block';
  receiptUrlLink.style.marginTop = '8px';
  wrapper.appendChild(receiptUrlLink);

  const totalText = receipt.total.toString();
  copyTotalButton.addEventListener('click', function () {
    writeToClipboard(totalText, (error) => {
      if (error) {
        window.prompt('Copy to clipboard: Ctrl+C, Enter', totalText);
      } else {
        const backup = copyTotalButton.innerText;
        copyTotalButton.innerText = 'Copied!';
        setTimeout(() => {
          copyTotalButton.innerText = backup;
        }, 1500);
      }
    });
  });

  if (itemsChanged) {
    showChangedBanner();
  }
}

// Non-blocking notice shown above a receipt when the live trade no longer matches
// the items the receipt was generated from. The receipt stays visible; the trader
// decides whether to re-look-up. A fresh Submit always overrides the old receipt.
export function showChangedBanner(): void {
  const wrapper = getWrapper();
  if (wrapper.querySelector('.te_changed_banner')) {
    return;
  }

  const banner = document.createElement('div');
  banner.className = 'te_changed_banner';

  const text = document.createElement('span');
  text.className = 'te_changed_banner_text';
  text.innerText = 'Trade items look different from this receipt — look up prices again to refresh it.';

  const lookupButton = document.createElement('button');
  lookupButton.className = 'te_button';
  lookupButton.innerText = 'Look Up Prices';
  lookupButton.addEventListener('click', runLookup);

  const dismiss = document.createElement('button');
  dismiss.className = 'te_changed_banner_dismiss';
  dismiss.setAttribute('aria-label', 'Dismiss');
  dismiss.innerText = '×';
  dismiss.addEventListener('click', function () {
    banner.remove();
  });

  banner.appendChild(text);
  banner.appendChild(lookupButton);
  banner.appendChild(dismiss);
  wrapper.insertBefore(banner, wrapper.firstChild);
}

export function runLookup(): void {
  const trade = document.getElementById('trade-container');
  if (!trade) {
    showLookupError('No trade found on this page.');
    return;
  }

  const tradeItems = getTradeItems();
  if (!tradeItems) {
    showLookupError('No items in trade or trade already finished.');
    return;
  }

  const userName = getUsernameFromTradePage();
  const sellerName = getSellerNameFromTradePage();

  showLoader('Looking up prices...');

  fetchPrices(tradeItems.items, tradeItems.quantities, sellerName, userName, function (error, priceData) {
    if (error || !priceData) {
      console.error('Error fetching prices:', error);
      showLookupError('Unable to fetch prices.');
      return;
    }
    renderPriceTable(priceData, priceData.buyer_name, priceData.seller_name, tradeItems);
  });
}

export function showLookupButton(warningMessage?: string): void {
  stopReceiptWatcher();

  const lookupButton = document.createElement('button');
  lookupButton.className = 'te_button';
  lookupButton.innerText = 'Lookup Prices';
  lookupButton.addEventListener('click', runLookup);

  const wrapper = getWrapper();
  wrapper.innerHTML = '';

  if (warningMessage) {
    const warning = document.createElement('p');
    warning.className = 'te_invalid_feedback';
    warning.style.display = 'block';
    warning.innerText = warningMessage;
    wrapper.appendChild(warning);
  }

  wrapper.appendChild(lookupButton);
}
