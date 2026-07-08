/* Local pixel-art icons.
   Emoji render differently (or not at all) on older Android/iOS, so the game's
   icons are bundled SVGs (assets/icons/game/, authored via tools/gen-icons.mjs)
   surfaced through the .gi / .gi-<key> CSS classes in css/style.css.

   - Static markup: write <span class="gi gi-leaf"></span> directly.
   - innerHTML templates: use iconHTML(key) / currencyIcon(currency). */

// Economy currency ('coin' | 'leaf' | 'feather') -> icon key.
export const CURRENCY_ICON = { coin: 'bark', leaf: 'leaf', feather: 'feather' };

export function iconHTML(key) {
  return `<span class="gi gi-${key}" aria-hidden="true"></span>`;
}

export function currencyIcon(currency) {
  return iconHTML(CURRENCY_ICON[currency] || 'bark');
}
