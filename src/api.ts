import type { ExistingReceipt, PriceData, ReceiptResponse } from './types';
import { getApiKey } from './auth';

export const ENDPOINT = 'https://tornexchange.com';

export function fetchPrices(
  items: string[],
  quantities: number[],
  sellerName: string,
  userName: string,
  callback: (error: unknown, data: PriceData | null) => void,
): void {
  const data = JSON.stringify({
    items,
    quantities,
    user_name: userName,
    seller_name: sellerName,
  });

  GM_xmlhttpRequest({
    method: 'POST',
    url: ENDPOINT + '/new_extension_get_prices',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
    },
    data,
    onload: function (response) {
      callback(null, JSON.parse(response.responseText));
    },
    onerror: function (error) {
      callback(error, null);
    },
  });
}

export function fetchReceiptByTradeId(
  tradeId: string,
  callback: (error: unknown, receipt: ExistingReceipt | null) => void,
): void {
  GM_xmlhttpRequest({
    method: 'GET',
    url: ENDPOINT + '/api/receipt_by_trade_id/' + tradeId + '?key=' + encodeURIComponent(getApiKey() ?? ''),
    onload: function (response) {
      if (response.status === 404) {
        callback(null, null);
        return;
      }
      callback(null, JSON.parse(response.responseText));
    },
    onerror: function (error) {
      callback(error, null);
    },
  });
}

export function submitReceipt(
  buyerName: string,
  buyerId: number | undefined,
  sellerName: string,
  itemNames: string[],
  quantities: number[],
  prices: number[],
  tradeId: string | null,
  callback: (error: unknown, response: ReceiptResponse | null) => void,
): void {
  const data = JSON.stringify({
    owner_username: buyerName,
    owner_user_id: buyerId,
    seller_username: sellerName,
    prices,
    item_quantities: quantities,
    item_names: itemNames,
    trade_id: tradeId,
  });

  GM_xmlhttpRequest({
    method: 'POST',
    url: ENDPOINT + '/new_create_receipt',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
    },
    data,
    onload: function (response) {
      callback(null, JSON.parse(response.responseText));
    },
    onerror: function (error) {
      callback(error, null);
    },
  });
}
