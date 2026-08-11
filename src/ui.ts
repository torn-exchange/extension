import type { PriceData, Receipt } from './types';
import { formatPrice, formatTemplateNumbers, formatValue, stripValue, writeToClipboard } from './format';
import { fetchPrices, submitReceipt } from './api';
import { getTradeItems, getSellerNameFromTradePage, getUsernameFromTradePage } from './dom-scrape';
import { getTradeId } from './page';

interface TeState {
  container: HTMLElement;
  contents: HTMLElement;
  header: HTMLElement;
  wrapper: HTMLElement;
}

let state: TeState | null = null;

export function getWrapper(): HTMLElement {
  if (!state) {
    throw new Error('te-helper UI not set up yet');
  }
  return state.wrapper;
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

  const teImg = document.createElement('img');
  teImg.className = 'te_header_image';
  teImg.src = 'https://tornexchange.com/static/main/images/mainlogo.png';
  teImg.alt = 'Header Image';

  header.appendChild(teImg);
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

export function showLoader(message = 'Loading'): void {
  getWrapper().innerHTML = `${message}`;
}

export function showLookupError(message: string): void {
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

export function renderPriceTable(priceData: PriceData, buyerName: string, sellerName: string): void {
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
        });
      },
    );
  });

  const wrapper = getWrapper();
  wrapper.innerHTML = '';
  wrapper.appendChild(totalDiv);
  wrapper.appendChild(table);
  wrapper.appendChild(submitButton);

  updateTotals();
}

export function renderReceipt(receipt: Receipt): void {
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
    renderPriceTable(receipt.priceData, receipt.buyerName, receipt.sellerName);
  });

  wrapper.appendChild(copyTotalButton);
  wrapper.appendChild(receiptLink);

  if (receipt.trade_message) {
    const copyMessageButton = document.createElement('button');
    copyMessageButton.className = 'te_button';
    copyMessageButton.innerText = 'Copy Receipt Message';
    copyMessageButton.style.marginRight = '8px';
    wrapper.appendChild(copyMessageButton);

    const responseText = formatTemplateNumbers(receipt.trade_message);
    copyMessageButton.addEventListener('click', function () {
      writeToClipboard(responseText, (error) => {
        if (error) {
          window.prompt('Copy to clipboard: Ctrl+C, Enter', responseText);
        } else {
          const backup = copyMessageButton.innerText;
          copyMessageButton.innerText = 'Copied!';
          setTimeout(() => {
            copyMessageButton.innerText = backup;
          }, 1500);
        }
      });
    });
  }

  wrapper.appendChild(resubmitButton);

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
}

export function showLookupButton(): void {
  const lookupButton = document.createElement('button');
  lookupButton.className = 'te_button';
  lookupButton.innerText = 'Lookup Prices';

  const wrapper = getWrapper();
  wrapper.innerHTML = '';
  wrapper.appendChild(lookupButton);

  lookupButton.addEventListener('click', function () {
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
      renderPriceTable(priceData, priceData.buyer_name, priceData.seller_name);
    });
  });
}
