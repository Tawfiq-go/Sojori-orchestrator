/** Clé API srv-fulltask (`global` = ownerId null en Mongo). */
export function toFulltaskOwnerKey(ownerId?: string | null): string {
  const id = String(ownerId ?? '').trim();
  if (!id || id === 'null' || id === 'undefined') return 'global';
  return id;
}
