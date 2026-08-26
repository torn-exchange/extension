# Changelog

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
