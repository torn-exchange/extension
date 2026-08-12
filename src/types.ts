export interface TradeItems {
  items: string[];
  quantities: number[];
}

export interface PriceData {
  items: string[];
  quantities: number[];
  market_prices: number[];
  prices: number[];
  image_url: string[];
  buyer_name: string;
  seller_name: string;
  buyer_id?: number;
}

export interface ReceiptResponse {
  receipt_id: string;
  total: number;
  trade_message?: string;
}

export interface ExistingReceipt {
  meta: {
    receipt_id: string;
    total: number;
    trade_message?: string;
    seller: string;
  };
  data: {
    items: string[];
    quantities: number[];
    market_prices: number[];
    prices: number[];
    image_url: string[];
  };
}

export interface Receipt {
  receipt_id: string;
  total: number;
  trade_message?: string;
  priceData: PriceData;
  buyerName: string;
  sellerName: string;
}
