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
  navigator.clipboard
    .writeText(textToCopy)
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
