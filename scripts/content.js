
const ENDPOINT = "https://www.tornexchange.com";


chrome.runtime.sendMessage({
    from: 'content',
    subject: 'showPageAction',
  });




function getUsernameFromTradePage(){
    let username =  document.querySelector("div.user.left > div > div").innerText;

    if (username == null){
        document.querySelector("#sidebar > div:nth-child(1) > div > div > div > div > div > p > a").innerText;
    }
    return username;
}

function getSellerNameFromTradePage(){
    let sellername = document.querySelector("div.user.right > div ").innerText;
    sellername = sellername.replace('Hide item values', '');
    sellername = sellername.trim();
    return sellername;
}

function sanitizeItemName(itemName){
    const TTregex = /\$.*/;
    let sanitized = itemName.replace(TTregex,'').trim().replaceAll('\n','');
    return sanitized;

}

chrome.runtime.onMessage.addListener((msg, sender, response) => {
    // First, validate the message's structure.
    if ((msg.from === 'popup') && (msg.subject === 'DOMInfo')) {
    // Collect the necessary data. 
    // (For your specific requirements `document.querySelectorAll(...)`
    //  should be equivalent to jquery's `$(...)`.)
    let trade = document.getElementById('trade-container')
    if (trade){
        let userName = getUsernameFromTradePage();
        let sellerName = getSellerNameFromTradePage();
        let items = []
        let quantities = []
        
        const regex_splitter = /\sx(?=\d{1,10})/
        let trade_elements = document.querySelectorAll("#trade-container > div.trade-cont.m-top10 > div.user.right > ul > li > ul > li > div.name.left")
        // console.log(trade_elements);
        for (let i=0; i<trade_elements.length; i++){

            // if string is not  '' or ' '
            if ((trade_elements[i].textContent) && (trade_elements[i].textContent.trim() !== ''))  {
               
                let textContent = trade_elements[i].textContent.split(regex_splitter);
                
                if (textContent.length == 2){
                    items.push(sanitizeItemName(textContent[0]));
                    quantities.push(parseInt(sanitizeItemName(textContent[1])));
                }
                else if (textContent.length == 1){
                    const sanitized = sanitizeItemName(textContent[0]);
                    if (sanitized == "No items in trade") {
                        alert("No items in trade or trade already finished.");
                        throw new Error("No items in trade or trade already finished.");
                    }

                    items.push(sanitized);
                    quantities.push(1);
                }
            }
        }

        responseData = getPricesFromPlayerApi(items, quantities, sellerName, userName);
        // console.log(responseData);
        var domInfo = {
            buyer_name: responseData.buyer_name,
            image_url: responseData.image_url,
            items:  responseData.items,
            market_prices: responseData.market_prices,
            prices: responseData.prices,
            profit_per_item: responseData.profit_per_item,
            quantities: responseData.quantities,
            seller_name: responseData.seller_name,
        };

    }

    // Directly respond to the sender (popup), 
    // through the specified callback.
    response(domInfo);
    }
});


function getPricesFromPlayerApi(items, quantities, sellerName, userName) {
    // var data = {
    //     "items": items,
    //     "quantities": quantities,
    //     "user_id": traderID,
    //     "seller_name": sellerName
    // }
    var data = {
        "items": items,
        "quantities": quantities,
        "user_name": userName,
        "seller_name": sellerName
    }
    data = JSON.stringify(data);
    let url = ENDPOINT + '/new_extension_get_prices'
    let request = new XMLHttpRequest();
    

    request.open('POST', url, false);
    request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    request.send(data);
    var responseData = JSON.parse(request.response);
    
    return responseData
}