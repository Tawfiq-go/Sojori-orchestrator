import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  applyMaxPassportExtraction,
  assignCompletionSlots,
  assignPassportGenericSlots,
  buildRegistrationFormSnapshot,
  completePresetSchema,
  fieldScreen,
  fieldValueForTraveler,
  flowSessionIsStale,
  formScreenFlowFlags,
  newCustomField,
  parseRegistrationFormSchema,
  shouldKeepRegistrationSnapshot,
  simplePresetSchema,
} from './index'

describe('dashboard schema vs Flow payload', () => {
  it('places a manual time field on the completion screen', () => {
    const schema = parseRegistrationFormSchema({
      version: 2,
      fields: [
        ...simplePresetSchema().fields,
        newCustomField({
          id: 'arrival_eta',
          key: 'arrival_eta',
          label: 'Heure',
          type: 'time',
          screen: 'completion',
          valueSource: 'manual',
        }),
      ],
    }).schema!
    const field = schema.fields.find((f) => f.id === 'arrival_eta')!
    assert.equal(fieldScreen(field), 'completion')
    const assigned = assignCompletionSlots(schema, { travelerIndex: 0, travelerCount: 1 })
    assert.equal(assigned.assignments.find((a) => a.field.id === 'arrival_eta')?.type, 'time')
    assert.equal(assignPassportGenericSlots(schema).assignments.some((a) => a.field.id === 'arrival_eta'), false)
  })

  it('places an OCR gender field on the passport screen, never as a time slot', () => {
    const schema = parseRegistrationFormSchema({
      version: 2,
      fields: [
        ...simplePresetSchema().fields.map((f) => (f.id === 'gender' ? { ...f, enabled: false } : f)),
        {
          id: 'nouvelle_question',
          key: 'nouvelle_question',
          kind: 'custom',
          type: 'time',
          label: 'Nouvelle question',
          enabled: true,
          required: false,
          scope: 'per_traveler',
          screen: 'completion',
          valueSource: 'ocr',
          ocrProperty: 'gender',
        },
      ],
    }).schema!
    const field = schema.fields.find((f) => f.id === 'nouvelle_question')!
    assert.equal(field.screen, 'passport')
    assert.equal(field.type, 'select')
    assert.equal(formScreenFlowFlags(schema).gender_visible, false)
    const generic = assignPassportGenericSlots(schema)
    const slot = generic.assignments.find((a) => a.field.id === 'nouvelle_question')
    assert.equal(slot?.type, 'select')
    assert.equal(fieldValueForTraveler(field, {}, { nouvelle_question: '12:34' }), '')
    assert.equal(
      assignCompletionSlots(schema, { travelerIndex: 0, travelerCount: 1 }).assignments.some(
        (a) => a.field.id === 'nouvelle_question',
      ),
      false,
    )
  })

  it('maps the maximum-passport preset onto dedicated FORM flags plus generic optional OCR slots', () => {
    const schema = applyMaxPassportExtraction(simplePresetSchema())
    const flags = formScreenFlowFlags(schema)
    assert.equal(flags.first_name_visible, true)
    assert.equal(flags.gender_visible, true)
    assert.equal(flags.document_expiry_date_visible, true)
    const generic = assignPassportGenericSlots(schema)
    assert.ok(generic.assignments.some((a) => a.field.ocrProperty === 'residence_country'))
    assert.ok(generic.assignments.some((a) => a.field.ocrProperty === 'personal_number'))
  })

  it('resetting uses a newer listing schema while an active attempt keeps its snapshot', () => {
    const original = buildRegistrationFormSnapshot(
      {
        schema: parseRegistrationFormSchema({
          version: 2,
          fields: [
            ...simplePresetSchema().fields,
            newCustomField({ id: 'old_time', key: 'old_time', type: 'time', required: true }),
          ],
        }).schema!,
        origin: 'listing',
        override: true,
        registrationLevel: 'simple',
      },
      'reg_active',
    )
    const newer = applyMaxPassportExtraction(simplePresetSchema())
    assert.equal(
      shouldKeepRegistrationSnapshot({
        cached: original,
        members: [{ first_name: 'Ada' }],
      }),
      true,
    )
    assert.equal(original.schema.fields.some((f) => f.id === 'old_time'), true)
    assert.equal(newer.fields.some((f) => f.id === 'old_time'), false)
    const resetSession = {
      registrationInstanceId: 'reg_active',
      registrationFormDrafts: { '0': { old_time: '12:34' } },
    }
    const fresh = buildRegistrationFormSnapshot(
      { schema: newer, origin: 'listing', override: true, registrationLevel: 'simple' },
      'reg_fresh',
    )
    assert.equal(
      flowSessionIsStale(resetSession, {
        registrationInstanceId: fresh.registrationInstanceId,
        schemaFingerprint: fresh.schemaFingerprint,
      }),
      true,
    )
  })

  it('keeps disabled fields out of Flow and optional fields unrequired', () => {
    const schema = parseRegistrationFormSchema({
      version: 2,
      fields: simplePresetSchema().fields.map((f) =>
        f.id === 'first_name'
          ? { ...f, enabled: false }
          : f.id === 'gender'
            ? { ...f, required: false, enabled: true }
            : f,
      ),
    }).schema!
    const flags = formScreenFlowFlags(schema)
    assert.equal(flags.first_name_visible, false)
    assert.equal(flags.gender_visible, true)
    assert.equal(flags.gender_required, false)
  })

  it('assigns per-traveler completion fields for multiple travelers without mixing stay answers', () => {
    const schema = parseRegistrationFormSchema({
      version: 2,
      fields: [
        ...simplePresetSchema().fields,
        newCustomField({
          id: 'job',
          key: 'job',
          label: 'Métier',
          scope: 'per_traveler',
        }),
        newCustomField({
          id: 'reason',
          key: 'reason',
          label: 'Motif',
          scope: 'per_stay',
        }),
      ],
    }).schema!
    const first = assignCompletionSlots(schema, { travelerIndex: 0, travelerCount: 2 })
    const last = assignCompletionSlots(schema, { travelerIndex: 1, travelerCount: 2 })
    assert.deepEqual(
      first.assignments.map((a) => a.field.id),
      ['job'],
    )
    assert.deepEqual(
      last.assignments.map((a) => a.field.id).sort(),
      ['job', 'reason'],
    )
  })
})
