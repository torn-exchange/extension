import type { TradeItems } from './types';

export function getUsernameFromTradePage(): string {
  let username = (document.querySelector('div.user.left > div > div') as HTMLElement | null)
    ?.innerText;

  if (username == null) {
    username = (
      document.querySelector(
        '#sidebar > div:nth-child(1) > div > div > div > div > div > p > a',
      ) as HTMLElement | null
    )?.innerText;
  }
  return username ?? '';
}

export function getSellerNameFromTradePage(): string {
  let sellername = (document.querySelector('div.user.right > div ') as HTMLElement).innerText;
  sellername = sellername.replace('Hide item values', '');
  sellername = sellername.trim();
  return sellername;
}

export function sanitizeItemName(itemName: string): string {
  const TTregex = /\$.*/;
  return itemName.replace(TTregex, '').trim().replaceAll('\n', '');
}

export function tradeItemsMatch(a: TradeItems, b: TradeItems): boolean {
  if (a.items.length !== b.items.length) {
    return false;
  }

  const toMap = (t: TradeItems) => {
    const map = new Map<string, number>();
    for (let i = 0; i < t.items.length; i++) {
      map.set(t.items[i], (map.get(t.items[i]) ?? 0) + t.quantities[i]);
    }
    return map;
  };

  const mapA = toMap(a);
  const mapB = toMap(b);

  if (mapA.size !== mapB.size) {
    return false;
  }

  for (const [item, quantity] of mapA) {
    if (mapB.get(item) !== quantity) {
      return false;
    }
  }

  return true;
}

export function getTradeItems(): TradeItems | null {
  const items: string[] = [];
  const quantities: number[] = [];

  const regex_splitter = /\sx(?=\d{1,10})/;
  const trade_elements = document.querySelectorAll(
    '#trade-container > div.trade-cont.m-top10 > div.user.right > ul > li > ul > li > div.name.left',
  );

  for (let i = 0; i < trade_elements.length; i++) {
    const el = trade_elements[i] as HTMLElement;
    if (el.textContent && el.textContent.trim() !== '') {
      const textContent = el.textContent.split(regex_splitter);

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

  return { items, quantities };
}
