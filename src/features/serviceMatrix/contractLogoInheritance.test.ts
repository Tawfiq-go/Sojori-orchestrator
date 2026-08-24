import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  contractLogoOriginLabel,
  resolveEffectiveContractLogoPreview,
} from './contractLogoInheritance'

test('listing override wins over owner logo', () => {
  const r = resolveEffectiveContractLogoPreview({
    listingOverrideUrl: 'https://storage.googleapis.com/b/MS/listing.png',
    ownerUrl: 'https://storage.googleapis.com/b/MS/owner.png',
    listingName: 'Riad A',
    establishmentName: 'Sojori',
  })
  assert.equal(r.origin, 'listing')
  assert.equal(r.effectiveUrl, 'https://storage.googleapis.com/b/MS/listing.png')
  assert.equal(contractLogoOriginLabel(r.origin), 'Override annonce')
})

test('owner inheritance when no listing override', () => {
  const r = resolveEffectiveContractLogoPreview({
    listingOverrideUrl: '',
    ownerUrl: 'https://storage.googleapis.com/b/MS/owner.png',
    listingName: 'Riad A',
  })
  assert.equal(r.origin, 'owner')
  assert.equal(r.effectiveUrl, 'https://storage.googleapis.com/b/MS/owner.png')
  assert.equal(contractLogoOriginLabel(r.origin), 'Hérité du propriétaire')
})

test('returning to inheritance clears override without copying owner', () => {
  const afterClear = resolveEffectiveContractLogoPreview({
    listingOverrideUrl: '',
    ownerUrl: 'https://storage.googleapis.com/b/MS/owner.png',
    listingName: 'Riad A',
  })
  assert.equal(afterClear.listingOverrideUrl, '')
  assert.equal(afterClear.origin, 'owner')
  assert.equal(afterClear.ownerUrl, 'https://storage.googleapis.com/b/MS/owner.png')
})

test('missing logo falls back to listing name text', () => {
  const r = resolveEffectiveContractLogoPreview({
    listingOverrideUrl: '',
    ownerUrl: '',
    listingName: 'Riad Atlas',
    establishmentName: 'Sojori SARL',
  })
  assert.equal(r.origin, 'fallback')
  assert.equal(r.effectiveUrl, '')
  assert.equal(r.textFallback, 'Riad Atlas')
  assert.equal(contractLogoOriginLabel(r.origin), 'Texte (sans logo)')
})

test('missing listing name falls back to establishment then Établissement', () => {
  assert.equal(
    resolveEffectiveContractLogoPreview({
      listingName: '',
      establishmentName: 'Maison Publique',
    }).textFallback,
    'Maison Publique',
  )
  assert.equal(
    resolveEffectiveContractLogoPreview({
      listingName: '',
      establishmentName: '',
    }).textFallback,
    'Établissement',
  )
})
