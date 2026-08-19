import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  applyMaxPassportExtraction,
  buildRegistrationFormSnapshot,
  emptyRegistrationGuests,
  fieldScreen,
  fieldValueForTraveler,
  flowSessionIsStale,
  hasRegistrationProgress,
  newCustomField,
  parseRegistrationFormSchema,
  registrationSchemaFingerprint,
  shouldKeepRegistrationSnapshot,
  simplePresetSchema,
} from './index'

function schemaWith(change: {
  required?: boolean
  valueSource?: 'manual' | 'ocr'
  screen?: 'passport' | 'completion'
  type?: 'time' | 'select'
}) {
  return parseRegistrationFormSchema({
    version: 2,
    source: 'custom',
    fields: [
      ...simplePresetSchema().fields.map((f) =>
        f.id === 'gender' ? { ...f, enabled: false, required: false } : f,
      ),
      newCustomField({
        id: 'nouvelle_question',
        key: 'nouvelle_question',
        label: 'Nouvelle question',
        type: change.type ?? 'time',
        required: change.required ?? true,
        screen: change.screen ?? 'completion',
        valueSource: change.valueSource ?? 'manual',
        ocrProperty: change.valueSource === 'ocr' ? 'gender' : undefined,
      }),
    ],
  }).schema!
}

describe('registration instance lifecycle', () => {
  it('changing required → optional on a new attempt updates the fingerprint used by WhatsApp', () => {
    const oldForm = {
      schema: schemaWith({ required: true }),
      origin: 'listing' as const,
      override: true,
      registrationLevel: 'simple' as const,
    }
    const oldSnap = buildRegistrationFormSnapshot(oldForm, 'reg_old')
    const nextForm = {
      schema: schemaWith({ required: false }),
      origin: 'listing' as const,
      override: true,
      registrationLevel: 'simple' as const,
    }
    const nextSnap = buildRegistrationFormSnapshot(nextForm, 'reg_new')
    assert.notEqual(oldSnap.schemaFingerprint, nextSnap.schemaFingerprint)
    assert.equal(
      nextSnap.schema.fields.find((f) => f.id === 'nouvelle_question')!.required,
      false,
    )
    assert.equal(
      shouldKeepRegistrationSnapshot({
        cached: oldSnap,
        guests: [{ done: true }],
      }),
      true,
    )
    assert.equal(
      shouldKeepRegistrationSnapshot({
        cached: undefined,
        guests: emptyRegistrationGuests(1),
      }),
      false,
    )
  })

  it('changing manual → OCR on a new attempt moves the field to the passport screen', () => {
    const before = schemaWith({ valueSource: 'manual', screen: 'completion', type: 'time' })
    assert.equal(fieldScreen(before.fields.find((f) => f.id === 'nouvelle_question')!), 'completion')
    const after = schemaWith({ valueSource: 'ocr', type: 'time' })
    const field = after.fields.find((f) => f.id === 'nouvelle_question')!
    assert.equal(field.valueSource, 'ocr')
    assert.equal(field.screen, 'passport')
    assert.equal(field.type, 'select')
  })

  it('changing completion → passport on a new attempt updates WhatsApp screen placement', () => {
    const before = schemaWith({ screen: 'completion', valueSource: 'manual' })
    const after = schemaWith({ screen: 'passport', valueSource: 'manual' })
    assert.equal(fieldScreen(before.fields.find((f) => f.id === 'nouvelle_question')!), 'completion')
    assert.equal(fieldScreen(after.fields.find((f) => f.id === 'nouvelle_question')!), 'passport')
    assert.notEqual(registrationSchemaFingerprint(before), registrationSchemaFingerprint(after))
  })

  it('old 12:34 custom answers do not appear in a new attempt', () => {
    const field = schemaWith({ valueSource: 'ocr', type: 'time' }).fields.find(
      (f) => f.id === 'nouvelle_question',
    )!
    assert.equal(fieldValueForTraveler(field, {}, { nouvelle_question: '12:34' }), '')
  })

  it('reopening the same active attempt preserves valid draft progress', () => {
    const snap = buildRegistrationFormSnapshot(
      {
        schema: schemaWith({ required: true }),
        origin: 'listing',
        override: true,
        registrationLevel: 'simple',
      },
      'reg_same',
    )
    const session = {
      registrationInstanceId: 'reg_same',
      schemaFingerprint: snap.schemaFingerprint,
      registrationFormDrafts: { '0': { first_name: 'Ada' } },
    }
    assert.equal(
      flowSessionIsStale(session, {
        registrationInstanceId: snap.registrationInstanceId,
        schemaFingerprint: snap.schemaFingerprint,
      }),
      false,
    )
  })

  it('updating the dashboard during an active attempt does not mutate that attempt', () => {
    const original = buildRegistrationFormSnapshot(
      {
        schema: schemaWith({ required: true, screen: 'completion' }),
        origin: 'listing',
        override: true,
        registrationLevel: 'simple',
      },
      'reg_active',
    )
    const listingNow = schemaWith({ required: false, valueSource: 'ocr' })
    assert.equal(
      shouldKeepRegistrationSnapshot({
        cached: original,
        guests: [{ done: false }],
        members: [{ first_name: 'Ada' }],
      }),
      true,
    )
    assert.notEqual(registrationSchemaFingerprint(original.schema), registrationSchemaFingerprint(listingNow))
    assert.equal(original.schema.fields.find((f) => f.id === 'nouvelle_question')!.required, true)
    assert.equal(original.schema.fields.find((f) => f.id === 'nouvelle_question')!.screen, 'completion')
  })

  it('a new reservation uses the latest listing schema', () => {
    const latest = applyMaxPassportExtraction(simplePresetSchema())
    assert.equal(
      shouldKeepRegistrationSnapshot({
        cached: undefined,
        guests: emptyRegistrationGuests(2),
        members: [],
      }),
      false,
    )
    const snap = buildRegistrationFormSnapshot({
      schema: latest,
      origin: 'listing',
      override: true,
      registrationLevel: 'simple',
    })
    assert.equal(snap.schema.fields.find((f) => f.id === 'gender')!.enabled, true)
    assert.equal(snap.schema.fields.find((f) => f.id === 'personal_number')!.ocrProperty, 'personal_number')
  })

  it('resetting only part of the data cannot leave a stale schema or FlowSession', () => {
    const oldSnap = buildRegistrationFormSnapshot(
      {
        schema: schemaWith({ required: true, type: 'time', screen: 'completion' }),
        origin: 'listing',
        override: true,
        registrationLevel: 'simple',
      },
      'reg_stale',
    )
    const latest = schemaWith({ required: false, valueSource: 'ocr' })
    const newSnap = buildRegistrationFormSnapshot(
      {
        schema: latest,
        origin: 'listing',
        override: true,
        registrationLevel: 'simple',
      },
      'reg_fresh',
    )
    const leftoverSession = {
      registrationInstanceId: oldSnap.registrationInstanceId,
      schemaFingerprint: oldSnap.schemaFingerprint,
      registrationFormDrafts: { '0': { nouvelle_question: '12:34' } },
    }
    assert.equal(
      flowSessionIsStale(leftoverSession, {
        registrationInstanceId: newSnap.registrationInstanceId,
        schemaFingerprint: newSnap.schemaFingerprint,
      }),
      true,
    )
    assert.equal(hasRegistrationProgress({ guests: emptyRegistrationGuests(2), members: [{ first_name: '' }] }), false)
  })

  it('legacy cached schemas without an instance id are dropped when there is no progress', () => {
    const cached = {
      schema: schemaWith({ required: true }),
      origin: 'listing',
      override: true,
      registrationLevel: 'simple',
    }
    assert.equal(shouldKeepRegistrationSnapshot({ cached, guests: emptyRegistrationGuests(1), members: [] }), false)
    assert.equal(
      shouldKeepRegistrationSnapshot({
        cached,
        members: [{ first_name: 'Ada', last_name: 'Lovelace' }],
      }),
      true,
    )
  })
})
