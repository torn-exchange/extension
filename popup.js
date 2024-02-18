const ENDPOINT = "https://www.tornexchange.com";

// Update the relevant fields with the new data.
const setDOMInfo = info => {
    info.items;
    info.quantities;
    info.seller_name;
    info.traderID;
    info.market_prices;
    info.prices;
    info.profit_per_item;
    info.image_url;
    info.buyer_name;
    console.log(info)
    table = createTable(info);
    addSubmitButtonToTable(table);
    activateSubmitButton(info);
};

const zip = (a, b) => a.map((k, i) => [k, b[i]]);


function addSubmitButtonToTable(table) {
    let content = document.getElementById('torn-exchange-content');
    let submit_div = document.createElement('div');
    submit_div.setAttribute('id', 'submit_div');

    let submit_button = document.createElement('button');
    submit_div.appendChild(submit_button);
    submit_button.innerText = 'Submit';
    submit_button.className = 'submit-button';
    submit_button.addEventListener('click', function (evnt) {
        submitTrade();
    });

    submit_text = document.createElement('div');
    submit_text.setAttribute('id', 'submit-text');
    submit_text.innerHTML = getSubmitText(table);

    submit_div.appendChild(submit_text);

    // fix: on mobile when having lots of items in a trade the div would get sticky 
    // and hide submit button, so we move it above the items table
    content.prepend(submit_div);
}

function getSubmitText(table) {
    // Sum over the prices div and the profits div in the table element to calculate a total 
    // price and total profit
    let total_price = 0;
    let total_profit = 0;
    let prices = table.getElementsByClassName('price');
    let market_prices = table.getElementsByClassName('market_price');
    let quantities = table.getElementsByClassName('quantity');

    for (let i = 0; i < prices.length; i++) {
        total_price += parseFloat(prices[i].innerText);
        total_profit += (parseFloat(market_prices[i].innerText) - parseFloat(prices[i].innerText)) * parseInt(quantities[i].innerText);
    }
    
    // display total price and total profit in nice html format
    return `<p class='total-price-info'>Total Price: <span class='profit-display'>` + formatPrice(total_price) + `</span></p><p class= 'total-profit-info'> Total Profit:  <span class='profit-display'>` + formatPrice(total_profit) + `</span></p>`;
}

function updateSubmitText(table) {
    let submit_text = document.getElementById('submit-text');
    submit_text.innerHTML = getSubmitText(table);
}

function createRow(rowData, classNames = []) {
    let row = document.createElement('tr');
    rowData.forEach((cellData, i) => {
        // if cellData is a text and includes an image url
        if (typeof cellData === 'string' && cellData.includes('https://')) {
            let cell = document.createElement('td');
            let img = document.createElement('img');
            img.src = cellData;
            cell.appendChild(img);
            row.appendChild(cell);
            cell.classList.add(classNames[i]);

        }
        else {

            let cell = document.createElement('td');
            if (classNames[i] === 'profit') {
                cell.innerText = formatPrice(cellData);
            }
            else {
                cell.innerText = cellData;
            }

            row.appendChild(cell);
            cell.classList.add(classNames[i]);
        }
    });
    return row;
}

function createTable(data) {
    let content = document.getElementById('torn-exchange-content');

    let table = document.createElement('table');
    table.className = 'tableFixHead';
    table.className = 'te_table'
    let tableHeaders = ['Image', 'Item', 'Quantity', 'Market Price', 'Price', 'Profit'];

    // add table header to table element for each header in tableHeaders
    tableHeaders.forEach(header => {
        let th = document.createElement('th');
        th.appendChild(document.createTextNode(header));
        table.appendChild(th);
    });
    for (let i = 0; i < data['items'].length; i++) {
        let row = createRow([data['image_url'][i], data['items'][i], data['quantities'][i], data['market_prices'][i], data['prices'][i], data['profit_per_item'][i]], ['image', 'item', 'quantity', 'market_price', 'price', 'profit']);
        table.appendChild(row);
    }
    content.appendChild(table);
    allowInputInPrice();
    return table
}

// Once the DOM is ready...
window.addEventListener('DOMContentLoaded', () => {
    // ...query for the active tab...
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, tabs => {
        // ...and send a request for the DOM info...
        chrome.tabs.sendMessage(
            tabs[0].id,
            { from: 'popup', subject: 'DOMInfo' },
            // ...also specifying a callback to be called 
            //    from the receiving end (content script).
            setDOMInfo);
    });
});

function allowInputInPrice() {
    profit_divs = document.getElementsByClassName('profit');
    price_divs = document.getElementsByClassName('price');
    market_price_divs = document.getElementsByClassName('market_price');
    quantities_divs = document.getElementsByClassName('quantity');
    table = document.getElementsByClassName('tableFixHead')[0];

    // 
    for (let i = 0; i < price_divs.length; i++) {
        price_divs[i].setAttribute('contenteditable', 'true');
        price_divs[i].setAttribute('type', 'number');
        price_divs[i].addEventListener('input', function (evnt) {
            profit_divs[i].innerText = formatPrice((parseInt(market_price_divs[i].innerText) - parseInt(price_divs[i].innerText)) * parseInt(quantities_divs[i].innerText));
            updateSubmitText(table);
        }
        )
    }
}

function activateSubmitButton(info) {
    let submit_button = document.getElementsByClassName('submit-button')[0];
    submit_button.disabled = false;
    submit_button.addEventListener('click', function (evnt) {
        submitTrade(info);
    });
}

function submitTrade(info) {
    let prices = document.getElementsByClassName('price');
    let quantities = document.getElementsByClassName('quantity');
    let items = document.getElementsByClassName('item');
    prices = Array.from(prices).map(price => parseInt(price.innerText));
    quantities = Array.from(quantities).map(quantity => parseInt(quantity.innerText));
    items = Array.from(items).map(item => item.innerText);
    let data = JSON.stringify({
        'owner_username': info['buyer_name'],
        'owner_user_id': info['buyer_id'],
        'seller_username': info['seller_name'],
        'prices': prices,
        'item_quantities': quantities,
        'item_names': items
    })

    let request = new XMLHttpRequest();
    request.open('POST', ENDPOINT + '/new_create_receipt', false);
    request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');

    request.send(data);

    let response_data = JSON.parse(request.response);
    render_response(response_data);
}

function render_response(response_data) {
    let response_div = document.getElementById('torn-exchange-content');

    response_div.innerHTML = `
    <div class="response te_submitted">
    <hr>
        <h4>Trade Submitted \✅ </h4>
        <p id='copy-to-clipboard-total' class='copy-text'><a href="#" title='Click to copy to clipboard'><span>📝 </span></a><b>Total: </b>${formatPrice(response_data['total'])} 🔥 </p>

        <p><a href="https://tornexchange.com/receipt/${response_data['receipt_id']}" target="_blank"><b>Receipt</b></a></p>
        <p id='copy-to-clipboard' class='copy-text'><a href="#" title='Click to copy to clipboard'>Receipt Message 💭</a></p>
    </div>
    `;

    let response_text = htmlDecode(response_data['trade_message']);
    let copy_to_clipboard = document.getElementById('copy-to-clipboard');
    copy_to_clipboard.addEventListener('click', function () {
        writeToClipboard(response_text, (error) => {
            if (error) {
                window.prompt("Copy to clipboard: Ctrl+C, Enter", response_text);
            } else {
              const backup = copy_to_clipboard.innerHTML;
              copy_to_clipboard.innerHTML = "Copied!"
              setTimeout(() => {
                copy_to_clipboard.innerHTML = backup;
              }, 1500);
            }
          });
    })

    let copy_to_clipboard_total = document.getElementById('copy-to-clipboard-total');
    let total_text = response_data['total'].toString();
    copy_to_clipboard_total.addEventListener('click', function () {
        writeToClipboard(total_text, (error) => {
            if (error) {
              window.prompt("Copy to clipboard: Ctrl+C, Enter", response_text);
            } else {
              const backup = copy_to_clipboard_total.innerHTML;
              copy_to_clipboard_total.innerHTML = "Copied!"
              setTimeout(() => {
                copy_to_clipboard_total.innerHTML = backup;
              }, 1500);
            }
          });
    })
}

function htmlDecode(str) {
    const doc = new DOMParser().parseFromString(str, "text/html");
    return doc.documentElement.textContent;
}

// Formats the price to be in 'k' 'm' and 'b' for large numbers
function formatPrice(price) {
    if (price > 1000000000) {
        return "$" + (price / 1000000000).toFixed(3) + 'b';
    }
    else if (price > 1000000) {
        return "$" + (price / 1000000).toFixed(3) + 'm';
    }
    else if (price > 1000) {
        return "$" + (price / 1000).toFixed(3) + 'k';
    }
    else {
        return "$" + price;
    }
}

function writeToClipboard(textToCopy, callback) {
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        // Clipboard write succeeded
        if (callback) {
          callback(null, 'Text copied to clipboard successfully.');
        }
      })
      .catch((err) => {
        // Clipboard write failed
        if (callback) {
          callback(err, 'Failed to copy text to clipboard.');
        }
      });
  }
