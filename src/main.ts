import { CSS } from './styles';
import { handlePage } from './page';

GM_addStyle(CSS);

declare global {
  interface Window {
    teHelperHasInitialized?: boolean;
  }
}

if (!window.teHelperHasInitialized) {
  window.teHelperHasInitialized = true;

  window.addEventListener('hashchange', handlePage);
  handlePage();
}
