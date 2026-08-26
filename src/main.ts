import { CSS } from './styles';
import { handlePage, observeTradeLog, observeTradeConfirmation, observeTradesList } from './page';
import { handleProfilePage } from './profile';

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
  observeTradeLog();
  observeTradeConfirmation();
  observeTradesList();
  handleProfilePage();
}
