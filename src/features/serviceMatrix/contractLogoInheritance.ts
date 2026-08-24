export type ContractLogoUiOrigin = 'listing' | 'owner' | 'fallback';

export type EffectiveContractLogoPreview = {
  /** Canonical GCS URL used for preview, or empty when text fallback. */
  effectiveUrl: string
  /** Explicit listing override URL (empty when inheriting). */
  listingOverrideUrl: string
  /** Owner default logo URL (empty when owner has none). */
  ownerUrl: string
  origin: ContractLogoUiOrigin
  /** Primary text shown when no effective logo image. */
  textFallback: string
}

/**
 * Resolve dashboard preview branding without mutating listing/owner config.
 * Priority: valid listing override → owner logo → text fallback.
 */
export function resolveEffectiveContractLogoPreview(input: {
  listingOverrideUrl?: string | null
  ownerUrl?: string | null
  listingName?: string | null
  establishmentName?: string | null
}): EffectiveContractLogoPreview {
  const listingOverrideUrl = String(input.listingOverrideUrl || '').trim()
  const ownerUrl = String(input.ownerUrl || '').trim()
  const listingName = String(input.listingName || '').trim()
  const establishmentName = String(input.establishmentName || '').trim()
  const textFallback = listingName || establishmentName || 'Établissement'

  if (listingOverrideUrl) {
    return {
      effectiveUrl: listingOverrideUrl,
      listingOverrideUrl,
      ownerUrl,
      origin: 'listing',
      textFallback,
    }
  }
  if (ownerUrl) {
    return {
      effectiveUrl: ownerUrl,
      listingOverrideUrl: '',
      ownerUrl,
      origin: 'owner',
      textFallback,
    }
  }
  return {
    effectiveUrl: '',
    listingOverrideUrl: '',
    ownerUrl: '',
    origin: 'fallback',
    textFallback,
  }
}

export function contractLogoOriginLabel(origin: ContractLogoUiOrigin): string {
  if (origin === 'listing') return 'Override annonce'
  if (origin === 'owner') return 'Hérité du propriétaire'
  return 'Texte (sans logo)'
}
