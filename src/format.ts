export function stripValue(value: string | number): number {
  return parseInt(String(value).replace(/\D/g, ''), 10) || 0;
}

export function formatValue(value: string | number): string {
  return stripValue(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatPrice(price: number): string {
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

export function htmlDecode(str: string): string {
  const doc = new DOMParser().parseFromString(str, 'text/html');
  return doc.documentElement.textContent ?? '';
}

export function formatTemplateNumbers(inputString: string): string {
  inputString = htmlDecode(inputString);

  const pattern = /\$\d+(,\d{3})*(?:\.\d+)?/g;

  return inputString.replace(pattern, function (match) {
    const number = match.replace(/\$|,/g, '');
    return '$' + parseFloat(number).toLocaleString();
  });
}

export function writeToClipboard(
  textToCopy: string,
  callback?: (error: unknown, message: string) => void,
): void {
  // Prefer the userscript-manager clipboard API: it runs in the extension
  // context, so it is not affected by page-level clipboard hijacking or by
  // content-blocker scriptlets (e.g. uBlock Origin's "prevent-clipboard-write"
  // ClickFix mitigation, which proxies page-context navigator.clipboard and
  // has misfired on our copy buttons in the past).
  if (typeof GM_setClipboard === 'function') {
    try {
      GM_setClipboard(textToCopy, 'text');
      callback?.(null, 'Text copied to clipboard successfully.');
      return;
    } catch (err) {
      callback?.(err, 'Failed to copy text to clipboard.');
      return;
    }
  }

  navigator.clipboard
    .writeText(textToCopy)
    .then(() => {
      callback?.(null, 'Text copied to clipboard successfully.');
    })
    .catch((err) => {
      callback?.(err, 'Failed to copy text to clipboard.');
    });
}
