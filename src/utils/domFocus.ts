/** Évite l’avertissement aria-hidden quand une modale MUI masque #root alors qu’un bouton garde le focus. */
export function blurActiveElement(): void {
  const el = document.activeElement;
  if (el instanceof HTMLElement) {
    el.blur();
  }
}
