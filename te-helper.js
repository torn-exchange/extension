// ==UserScript==
// @name         Torn Exchange Helper
// @namespace    te.helper
// @version      1.0.0
// @author       Ata [2507441]
// @description  TornExchange Helper Script for traders - finish trades and create trade receipts on the fly
// @license      MIT
// @match        https://www.torn.com/trade.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=torn.com
// @run-at       document-end
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

const ENDPOINT = 'https://tornexchange.com';

GM_addStyle(`
    div.te_container {
        color: white !important;
        width: 100%;
        text-align: center;
        margin-top: 10px;
        margin-bottom: 10px;
        background-color: #3e3e3e;
        border-radius: 4px;
        box-shadow: 0px 2px 4px 2px #7f7f7f;
    }

    table.te_table {
        margin-top:10px;
        text-align: left;
        width: 100%;
        max-width:100%;
    }

    table.te_table tr {
        border-bottom: 1px solid #555555;
    }

    table.te_table th {
        padding: 5px;
        padding-top:8px;
        padding-bottom:8px;
        background-color: #373737;
    }

    table.te_table td {
        color:white;
        padding:5px !important;
    }

    table.te_table td input {
        padding-left: 5px;
    }

    input.te_input {
        border: 1px solid #4e4e4e;
        background-color: #3e3e3e;
        border-radius: 5px;
        height: 20px !important;
        color: white;
        width:100%;
    }

    div.te_header {
        padding-bottom: 2px;
        padding-top: 4px;
        border-bottom: 1px solid #535353;
        border-top-left-radius: 5px;
        border-top-right-radius: 5px;
        background-color: #373737;
    }

    div.te_wrapper {
        padding:10px;
    }

    .te_button {
        background-color: #f7b84b26;
        border-radius: 5px;
        padding: 6px;
        color: #f7b84b;
        font-weight: bold;
        cursor: pointer;
        padding-left: 12px;
        padding-right: 12px;
        border: none;
    }

    .te_button_dark {
        background-color: #000000c2;
        border-radius: 5px;
        padding: 6px;
        color: #f7b84b;
        font-weight: bold;
        cursor: pointer;
        padding-left: 12px;
        padding-right: 12px;
        border: none;
    }

    .te_button:hover {
        background-color: #f7b84b;
        color:white;
    }

    .te_invalid_feedback {
        width: 100%;
        margin-top: .25rem;
        font-size: .875em;
        color: #fba189 !important;
    }

    .te_d_none {
        display:none;
    }

    .te_header_image {
        max-width: 100%;
        height: 40px;
    }

    td.te_item {
        text-align: left;
        font-weight: bold;
    }

    td.te_image {
        text-align: center;
        border: 0px;
    }

    td.te_image img {
        max-width: 40px;
    }

    td.te_profit {
        color: #7CFC00;
    }

    .te_profit_display {
        color: #7CFC00;
    }

    .te_total_info {
        font-size: 12px;
        font-weight: bold;
        text-align: left;
        display: inline-block;
        margin: 4px 2px;
    }

    .te_copy_text a:link,
    .te_copy_text a:visited,
    .te_copy_text a:hover,
    .te_copy_text a:active {
        text-decoration: none;
        color: #89e1fb;
        cursor: pointer;
    }
`);

function observeElement(selector, callback = function () {
}) {
    let observer = new MutationObserver((mutations, obs) => {
        let element;
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
    observer.observe(document.body, {childList: true, subtree: true});
}

function isTradePage() {
    const hash = location.hash;
    return /step=(view|accept|accept2)/.test(hash);
}

function getTradeId() {
    const match = location.hash.match(/ID=(\d+)/);
    return match ? match[1] : null;
}

// ---- API key setup ----

function getApiKey() {
    return GM_getValue('te_api_key', null);
}

function setApiKey(key) {
    GM_setValue('te_api_key', key);
}

function showApiKeyPrompt(onSaved) {
    window.te_wrapper.innerHTML = `
        <div>
            <div style="display: flex; align-items: center; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                <label for="te_api_key_input">Enter Torn API key that you login into Torn Exchange</label>
                <input type="text" id="te_api_key_input" class="te_input" style="max-width:250px;" placeholder="Torn API key">
                <button id="te_api_key_save" class="te_button">Save</button>
            </div>
        </div>
    `;

    document.getElementById('te_api_key_save').addEventListener('click', function () {
        const input = document.getElementById('te_api_key_input');
        const key = input.value.trim();
        if (!key) {
            return;
        }
        setApiKey(key);
        onSaved();
    });
}

function setup() {
    let container = document.querySelector('.te_container');
    if (container) {
        return container;
    }

    window.te_container = document.createElement('div');
    window.te_container.className = 'te_container';

    window.te_wrapper = document.createElement('div');
    window.te_wrapper.className = 'te_wrapper';

    window.te_contents = document.createElement('div');
    window.te_contents.className = 'te_contents';

    window.te_header = document.createElement('div');
    window.te_header.className = 'te_header';

    const te_img = document.createElement('img');
    te_img.className = 'te_header_image';
    te_img.src = 'https://tornexchange.com/static/main/images/mainlogo.png';
    te_img.alt = 'Header Image';

    window.te_header.appendChild(te_img);
    window.te_contents.appendChild(window.te_header);
    window.te_contents.appendChild(window.te_wrapper);
    window.te_container.appendChild(window.te_contents);

    let anchor = document.querySelector('.info-msg-cont:not(.red)');
    if (!anchor) {
        return;
    }

    anchor.insertAdjacentElement('afterend', window.te_container);

    return window.te_container;
}

function showLoader(message = 'Loading') {
    window.te_wrapper.innerHTML = `${message}`;
}

function showLookupError(message) {
    window.te_wrapper.innerHTML = `
        <div>
            <span class="te_invalid_feedback" role="alert">
                <strong>${message}</strong>
            </span>
        </div>
        `;
}

// ---- DOM scraping (ported from scripts/content.js) ----

function getUsernameFromTradePage() {
    let username = document.querySelector('div.user.left > div > div').innerText;

    if (username == null) {
        username = document.querySelector('#sidebar > div:nth-child(1) > div > div > div > div > div > p > a').innerText;
    }
    return username;
}

function getSellerNameFromTradePage() {
    let sellername = document.querySelector('div.user.right > div ').innerText;
    sellername = sellername.replace('Hide item values', '');
    sellername = sellername.trim();
    return sellername;
}

function sanitizeItemName(itemName) {
    const TTregex = /\$.*/;
    return itemName.replace(TTregex, '').trim().replaceAll('\n', '');
}

function getTradeItems() {
    let items = [];
    let quantities = [];

    const regex_splitter = /\sx(?=\d{1,10})/;
    let trade_elements = document.querySelectorAll('#trade-container > div.trade-cont.m-top10 > div.user.right > ul > li > ul > li > div.name.left');

    for (let i = 0; i < trade_elements.length; i++) {
        if (trade_elements[i].textContent && trade_elements[i].textContent.trim() !== '') {
            let textContent = trade_elements[i].textContent.split(regex_splitter);

            if (textContent.length === 2) {
                items.push(sanitizeItemName(textContent[0]));
                quantities.push(parseInt(sanitizeItemName(textContent[1])));
            } else if (textContent.length === 1) {
                const sanitized = sanitizeItemName(textContent[0]);
                if (sanitized === 'No items in trade') {
                    return null;
                }

                items.push(sanitized);
                quantities.push(1);
            }
        }
    }

    if (quantities.length === 0) {
        return null;
    }

    return {items, quantities};
}

// ---- Formatting helpers ----

function stripValue(value) {
    return parseInt(String(value).replace(/\D/g, ''), 10) || 0;
}

function formatValue(value) {
    return stripValue(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Formats the price to be in 'k' 'm' and 'b' for large numbers (from popup.js)
function formatPrice(price) {
    if (price > 1000000000) {
        return '$' + (price / 1000000000).toFixed(3) + 'b';
    } else if (price > 1000000) {
        return '$' + (price / 1000000).toFixed(3) + 'm';
    } else if (price > 1000) {
        return '$' + (price / 1000).toFixed(3) + 'k';
    } else {
        return '$' + price;
    }
}

function htmlDecode(str) {
    const doc = new DOMParser().parseFromString(str, 'text/html');
    return doc.documentElement.textContent;
}

function formatTemplateNumbers(inputString) {
    inputString = htmlDecode(inputString);

    var pattern = /\$\d+(,\d{3})*(?:\.\d+)?/g;

    return inputString.replace(pattern, function (match) {
        var number = match.replace(/\$|,/g, '');
        return '$' + parseFloat(number).toLocaleString();
    });
}

function writeToClipboard(textToCopy, callback) {
    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            if (callback) {
                callback(null, 'Text copied to clipboard successfully.');
            }
        })
        .catch((err) => {
            if (callback) {
                callback(err, 'Failed to copy text to clipboard.');
            }
        });
}

// ---- Legacy API calls ----

function fetchPrices(items, quantities, sellerName, userName, callback) {
    const data = JSON.stringify({
        items: items,
        quantities: quantities,
        user_name: userName,
        seller_name: sellerName
    });

    GM_xmlhttpRequest({
        method: 'POST',
        url: ENDPOINT + '/new_extension_get_prices',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8',
        },
        data: data,
        onload: function (response) {
            callback(null, JSON.parse(response.responseText));
        },
        onerror: function (error) {
            callback(error, null);
        }
    });
}

function fetchReceiptByTradeId(tradeId, callback) {
    GM_xmlhttpRequest({
        method: 'GET',
        url: ENDPOINT + '/api/receipt_by_trade_id/' + tradeId + '?key=' + encodeURIComponent(getApiKey()),
        onload: function (response) {
            if (response.status === 404) {
                callback(null, null);
                return;
            }
            callback(null, JSON.parse(response.responseText));
        },
        onerror: function (error) {
            callback(error, null);
        }
    });
}

function submitReceipt(buyerName, buyerId, sellerName, itemNames, quantities, prices, tradeId, callback) {
    const data = JSON.stringify({
        owner_username: buyerName,
        owner_user_id: buyerId,
        seller_username: sellerName,
        prices: prices,
        item_quantities: quantities,
        item_names: itemNames,
        trade_id: tradeId
    });

    GM_xmlhttpRequest({
        method: 'POST',
        url: ENDPOINT + '/new_create_receipt',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8',
        },
        data: data,
        onload: function (response) {
            callback(null, JSON.parse(response.responseText));
        },
        onerror: function (error) {
            callback(error, null);
        }
    });
}

// ---- UI rendering ----

function createTradeRow(priceInfo) {
    const row = document.createElement('tr');

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
    quantityCell.innerText = priceInfo.quantity;
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
        return {price, profit};
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
        updateProfit
    };

    return row;
}

function updateTotals() {
    const table = document.querySelector('.te_table');
    if (!table) return;

    let totalPrice = 0;
    let totalProfit = 0;

    table.querySelectorAll('tbody tr').forEach(row => {
        const {price, profit} = row._te.updateProfit();
        totalPrice += price * row._te.quantity;
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

function renderPriceTable(priceData, buyerName, sellerName) {
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
            image_url: priceData.image_url[i]
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
        const itemNames = [];
        const quantities = [];
        const prices = [];

        table.querySelectorAll('tbody tr').forEach(row => {
            itemNames.push(row._te.item);
            quantities.push(row._te.quantity);
            prices.push(row._te.getPrice());
        });

        const tradeId = getTradeId();

        submitButton.disabled = true;
        submitReceipt(buyerName, priceData.buyer_id, sellerName, itemNames, quantities, prices, tradeId, function (error, response) {
            if (error) {
                showLookupError('Something went wrong submitting the receipt.');
                return;
            }

            renderReceipt({
                receipt_id: response.receipt_id,
                total: response.total,
                trade_message: response.trade_message,
                priceData: priceData,
                buyerName: buyerName,
                sellerName: sellerName
            });
        });
    });

    window.te_wrapper.innerHTML = '';
    window.te_wrapper.appendChild(totalDiv);
    window.te_wrapper.appendChild(table);
    window.te_wrapper.appendChild(submitButton);

    updateTotals();
}

// receipt: {receipt_id, total, trade_message, priceData, buyerName, sellerName}
function renderReceipt(receipt) {
    window.te_wrapper.innerHTML = `
        <div class="response">
            <h4>TE Receipt Created ✅</h4>
            <p><b>Total: </b><span class="te_profit_display">${formatPrice(receipt.total)}</span></p>
        </div>
    `;

    const receiptLink = document.createElement('a');
    receiptLink.href = `${ENDPOINT}/receipt/${receipt.receipt_id}`;
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

    window.te_wrapper.appendChild(copyTotalButton);
    window.te_wrapper.appendChild(receiptLink);

    if (receipt.trade_message) {
        const copyMessageButton = document.createElement('button');
        copyMessageButton.className = 'te_button';
        copyMessageButton.innerText = 'Copy Receipt Message';
        copyMessageButton.style.marginRight = '8px';
        window.te_wrapper.appendChild(copyMessageButton);

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

    window.te_wrapper.appendChild(resubmitButton);

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

function showLookupButton() {
    const lookupButton = document.createElement('button');
    lookupButton.className = 'te_button';
    lookupButton.innerText = 'Lookup Prices';

    window.te_wrapper.innerHTML = '';
    window.te_wrapper.appendChild(lookupButton);

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
            if (error) {
                console.error('Error fetching prices:', error);
                showLookupError('Unable to fetch prices.');
                return;
            }
            renderPriceTable(priceData, priceData.buyer_name, priceData.seller_name);
        });
    });
}

function handleTradePage() {
    if (!getApiKey()) {
        showApiKeyPrompt(handleTradePage);
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
                buyer_id: undefined
            };

            renderReceipt({
                receipt_id: meta.receipt_id,
                total: meta.total,
                trade_message: meta.trade_message,
                priceData: priceData,
                buyerName: getUsernameFromTradePage(),
                sellerName: meta.seller
            });
            return;
        }

        showLookupButton();
    });
}

function handlePage() {
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

(function () {
    'use strict';

    if (window.teHelperHasInitialized) return;
    window.teHelperHasInitialized = true;

    window.addEventListener('hashchange', handlePage);
    handlePage();
})();
