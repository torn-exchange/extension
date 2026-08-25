import type { ExistingReceipt, PriceData, ReceiptResponse, TeProfile } from './types';
import { getApiKey } from './auth';

export const ENDPOINT = 'https://tornexchange.com';

const REQUEST_TIMEOUT_MS = 15000;

export function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

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
    timeout: REQUEST_TIMEOUT_MS,
    onload: function (response) {
      const parsed = safeJsonParse<PriceData>(response.responseText);
      if (!parsed) {
        callback(new Error('Invalid response from server.'), null);
        return;
      }
      callback(null, parsed);
    },
    onerror: function (error) {
      callback(error, null);
    },
    ontimeout: function () {
      callback(new Error('Request timed out.'), null);
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
    timeout: REQUEST_TIMEOUT_MS,
    onload: function (response) {
      if (response.status === 404) {
        callback(null, null);
        return;
      }
      if (response.status < 200 || response.status >= 300) {
        callback(new Error('Request failed with status ' + response.status), null);
        return;
      }
      const parsed = safeJsonParse<ExistingReceipt>(response.responseText);
      if (!parsed) {
        callback(new Error('Invalid response from server.'), null);
        return;
      }
      callback(null, parsed);
    },
    onerror: function (error) {
      callback(error, null);
    },
    ontimeout: function () {
      callback(new Error('Request timed out.'), null);
    },
  });
}

export interface ApiError extends Error {
  apiMessage?: string;
}

export function fetchTeProfile(
  userId: string,
  callback: (error: ApiError | null, data: TeProfile | null) => void,
): void {
  GM_xmlhttpRequest({
    method: 'GET',
    url: ENDPOINT + '/api/profile?user_id=' + encodeURIComponent(userId) + '&key=' + encodeURIComponent(getApiKey() ?? ''),
    timeout: REQUEST_TIMEOUT_MS,
    onload: function (response) {
      const parsed = safeJsonParse<{ status: string; message?: string; data?: TeProfile }>(
        response.responseText,
      );
      if (!parsed) {
        callback(new Error('Invalid response from server.'), null);
        return;
      }
      if (parsed.status !== 'success' || !parsed.data) {
        const err: ApiError = new Error(parsed.message || 'Unknown error');
        err.apiMessage = parsed.message;
        callback(err, null);
        return;
      }
      callback(null, parsed.data);
    },
    onerror: function (error) {
      callback(error as unknown as ApiError, null);
    },
    ontimeout: function () {
      callback(new Error('Request timed out.'), null);
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
    timeout: REQUEST_TIMEOUT_MS,
    onload: function (response) {
      const parsed = safeJsonParse<ReceiptResponse>(response.responseText);
      if (!parsed) {
        callback(new Error('Invalid response from server.'), null);
        return;
      }
      callback(null, parsed);
    },
    onerror: function (error) {
      callback(error, null);
    },
    ontimeout: function () {
      callback(new Error('Request timed out.'), null);
    },
  });
}
