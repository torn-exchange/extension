# Changelog

## v1.1.3

- The trade panel no longer blocks the receipt when it thinks the trade items changed. Large trades (many weapons/armour added one by one) were consistently hitting a false "trade items have changed" and hiding the receipt. The existing receipt is now always shown; if the live trade looks different, a dismissible banner offers a fresh price lookup, and submitting always overrides the old receipt.
- Added a setting (cog icon) to collapse long item lists into a fixed-height scroll box instead of expanding the whole table, cutting down scrolling on big trades. Only applies when every price is already known; enabled by default.
- Added a Cancel button to the settings/API-key panel so you can return to the main view without saving.

## v1.1.2

- Added a small "Accepted" badge (TE gold) next to a trade's description on the current-trades list (`trade.php#`) when you accepted that trade, since Torn doesn't show this on the list itself. Detected from the confirmation message shown after accepting/declining a trade.

## v1.1.1

- Fixed the trade panel showing a stale receipt (wrong item quantities) when the trade's items changed after the receipt was generated or fetched, e.g. after a trade was declined but not yet cancelled and the seller added more items. The panel now detects the mismatch and prompts a fresh price lookup instead.

## v1.1.0

- Added a trader-status button to Torn profile pages (`profiles.php`) that shows a player's Torn Exchange status: whether they're an active trader, their votes/reviews, and a link to their price list.

## v1.0.4

- Receipt button is now "Copy Receipt"
- Receipt URL is now fully visible below the buttons
- Added new button "Fill Comment" that, on click, fills the comment box with the Receipt Message. You still have to click the actual Add button to submit the comment, as per Torn rules
- Observer on the page actively highlights all TE links in the comments
