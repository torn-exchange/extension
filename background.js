chrome.runtime.onMessage.addListener((msg, sender) => {
  // First, validate the message's structure.
  if ((msg.from === 'content') && (msg.subject === 'showPageAction') && chrome.pageAction) {
    // Enable the page-action for the requesting tab.
    chrome.pageAction.show(sender.tab.id);
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.from === 'content' && msg.subject === 'getPrices') {
      const url = "https://www.tornexchange.com/new_extension_get_prices";
      const data = JSON.stringify(msg.data); // Assuming msg.data contains the necessary data

      fetch(url, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json; charset=UTF-8'
          },
          body: data
      })
      .then(response => response.json())
      .then(responseData => {
          sendResponse(responseData); // Send the response back to the content script
      })
      .catch(error => {
          console.error('Error:', error);
          sendResponse({ error: 'Failed to fetch data' });
      });

      return true; // Keep the message channel open for sendResponse
  }
});