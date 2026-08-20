import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  COMPLETION_SLOT_BANK,
  META_FLOW_MAX_COMPONENTS_PER_SCREEN,
  PASSPORT_DEDICATED_PROPERTIES,
  PASSPORT_GENERIC_SLOT_BANK,
  assignCompletionSlots,
  assignPassportGenericSlots,
  canAddDynamicRegistrationField,
  canRenderInWhatsAppFlow,
  coerceAndValidateFlowAnswer,
  completionFieldsForTraveler,
  completePresetSchema,
  countFlowScreenComponents,
  defaultValueSourceForField,
  effectiveOcrProperty,
  fieldScreen,
  formatCapacityCounter,
  mergeMrzIntoOcr,
  mrzCheckDigitValid,
  newCustomField,
  nextScreenAfterFormSave,
  parseMrz,
  parseRegistrationFormSchema,
  parseRegistrationFormSchemaStrict,
  registrationCapacityReport,
  screenshotHotelRegistrationSchema,
  simplePresetSchema,
  staticCompletionScreenComponentCount,
  staticPassportScreenComponentCount,
  validateFormReviewFields,
} from './index'

describe('two information screens', () => {
  it('defaults recognized passport fields to the passport screen and extras to completion', () => {
    const parsed = parseRegistrationFormSchema({
      version: 1,
      fields: [
        { id: 'first_name', kind: 'builtin', binding: 'first_name', enabled: true, required: true },
        { id: 'profession', kind: 'builtin', binding: 'profession', enabled: true, required: true },
        { id: 'reason_stay', kind: 'custom', key: 'reason_stay', label: 'Motif', enabled: true, required: true, scope: 'per_stay' },
      ],
    })
    assert.equal(parsed.ok, true)
    const byId = Object.fromEntries(parsed.schema!.fields.map((f) => [f.id, f]))
    assert.equal(fieldScreen(byId.first_name!), 'passport')
    assert.equal(byId.first_name!.valueSource, 'ocr')
    assert.equal(fieldScreen(byId.profession!), 'completion')
    assert.equal(byId.profession!.valueSource, 'manual')
    assert.equal(fieldScreen(byId.reason_stay!), 'completion')
    assert.equal(byId.reason_stay!.scope, 'per_stay')
  })

  it('does not mutate a stored v1 schema merely by reading a copy', () => {
    const stored = {
      version: 1 as const,
      source: 'custom' as const,
      fields: [
        { id: 'first_name', kind: 'builtin', binding: 'first_name', enabled: true, required: true },
      ],
    }
    const before = JSON.stringify(stored)
    parseRegistrationFormSchema(stored)
    assert.equal(JSON.stringify(stored), before)
  })

  it('skips the completion screen when no field is assigned to it', () => {
    assert.equal(nextScreenAfterFormSave(simplePresetSchema(), 0, 1), 'LIST_REFRESH')
    assert.equal(completionFieldsForTraveler(simplePresetSchema(), 0, 1).length, 0)
  })

  it('asks per-stay fields only on the last traveler completion screen', () => {
    const schema = parseRegistrationFormSchema({
      version: 2,
      source: 'custom',
      fields: [
        ...simplePresetSchema().fields,
        newCustomField({
          id: 'reason_stay',
          key: 'reason_stay',
          label: 'Motif',
          required: true,
          scope: 'per_stay',
          order: 30,
        }),
        newCustomField({
          id: 'job',
          key: 'job',
          label: 'Job',
          required: true,
          scope: 'per_traveler',
          order: 31,
        }),
      ],
    }).schema!
    assert.deepEqual(
      completionFieldsForTraveler(schema, 0, 2).map((f) => f.id),
      ['job'],
    )
    assert.deepEqual(
      completionFieldsForTraveler(schema, 1, 2).map((f) => f.id),
      ['reason_stay', 'job'],
    )
    assert.equal(nextScreenAfterFormSave(schema, 0, 2), 'COMPLETE')
  })

  it('keeps a custom passport-screen field manual unless an OCR property is set', () => {
    const parsed = parseRegistrationFormSchema({
      version: 2,
      source: 'custom',
      fields: [
        ...simplePresetSchema().fields,
        newCustomField({
          id: 'eye_color',
          key: 'eye_color',
          label: 'Couleur des yeux',
          screen: 'passport',
        }),
      ],
    })
    assert.equal(parsed.ok, true)
    const field = parsed.schema!.fields.find((f) => f.id === 'eye_color')!
    assert.equal(field.screen, 'passport')
    assert.equal(defaultValueSourceForField(field), 'manual')
    assert.equal(effectiveOcrProperty(field), undefined)
    assert.equal(assignPassportGenericSlots(parsed.schema!).assignments[0]?.field.id, 'eye_color')
  })

  it('fills a supported OCR binding onto the canonical built-in field', () => {
    const schema = parseRegistrationFormSchema({
      version: 2,
      source: 'custom',
      fields: [
        ...simplePresetSchema().fields.map((f) =>
          f.id === 'first_name' ? { ...f, enabled: false } : f,
        ),
        newCustomField({
          id: 'given_name',
          key: 'given_name',
          label: 'Given name',
          screen: 'passport',
          valueSource: 'ocr',
          ocrProperty: 'first_name',
        }),
      ],
    }).schema!
    const builtin = schema.fields.find((f) => f.id === 'first_name')!
    const given = schema.fields.find((f) => f.id === 'given_name')!
    assert.equal(builtin.enabled, true)
    assert.equal(effectiveOcrProperty(builtin), 'first_name')
    assert.equal(given.enabled, false)
    assert.equal(assignPassportGenericSlots(schema).assignments.some((a) => a.field.id === 'given_name'), false)
  })

  it('rejects two fields bound to the same passport OCR property', () => {
    const result = parseRegistrationFormSchemaStrict({
      version: 2,
      source: 'custom',
      fields: [
        ...simplePresetSchema().fields,
        newCustomField({
          id: 'prenom2',
          key: 'prenom2',
          label: 'Prénom 2',
          screen: 'passport',
          valueSource: 'ocr',
          ocrProperty: 'first_name',
        }),
      ],
    })
    assert.equal(result.ok, false)
    assert.ok(result.errors.some((e) => /first_name|même propriété/i.test(e)))
  })

  it('rejects an arbitrary OCR property on a custom question', () => {
    const result = parseRegistrationFormSchema({
      version: 2,
      source: 'custom',
      fields: [
        ...simplePresetSchema().fields,
        {
          id: 'favorite_color',
          key: 'favorite_color',
          kind: 'custom',
          type: 'short_text',
          label: 'Couleur',
          enabled: true,
          required: false,
          scope: 'per_traveler',
          screen: 'passport',
          valueSource: 'ocr',
          ocrProperty: 'favorite_color',
        },
      ],
    })
    assert.equal(result.ok, false)
    assert.ok(result.errors.some((e) => /ocrProperty|supported passport/i.test(e)))
  })

  it('maps submitted values by stable field id, not label', () => {
    const schema = parseRegistrationFormSchema({
      version: 2,
      source: 'custom',
      fields: [
        ...simplePresetSchema().fields,
        newCustomField({ id: 'q_origin', key: 'q_origin', label: 'From', type: 'short_text' }),
      ],
    }).schema!
    const mapped = assignCompletionSlots(schema, { travelerIndex: 0, travelerCount: 1 })
    assert.equal(mapped.ok, true)
    assert.equal(mapped.assignments[0]?.field.id, 'q_origin')
    assert.equal(mapped.assignments[0]?.field.label, 'From')
  })

  it('keeps disabled passport and supplementary fields out of both screens', () => {
    const schema = screenshotHotelRegistrationSchema()
    assert.equal(schema.fields.find((f) => f.id === 'first_name')?.enabled, false)
    assert.ok(!schema.fields.find((f) => f.id === 'first_name' && f.enabled !== false))
    const completion = completionFieldsForTraveler(schema, 0, 1).map((f) => f.id)
    assert.ok(!completion.includes('first_name'))
    assert.ok(!completion.includes('document_issued_at'))
  })

  it('enforces required vs optional independently of the * label', () => {
    const schema = screenshotHotelRegistrationSchema()
    const required = schema.fields.find((f) => f.id === 'profession')!
    const optional = schema.fields.find((f) => f.id === 'domicile')!
    assert.equal(coerceAndValidateFlowAnswer(required, '').ok, false)
    assert.equal(coerceAndValidateFlowAnswer(optional, '').ok, true)
    const form = validateFormReviewFields(schema, {
      document_number: 'AB1',
      nationality: 'MA',
      hasVerifiedPhoto: true,
    })
    assert.equal(form.ok, true)
  })
})

describe('component budget', () => {
  it('keeps static reserved screens at or below 50 components', () => {
    assert.ok(staticPassportScreenComponentCount() <= META_FLOW_MAX_COMPONENTS_PER_SCREEN)
    assert.ok(staticCompletionScreenComponentCount() <= META_FLOW_MAX_COMPONENTS_PER_SCREEN)
    assert.equal(staticPassportScreenComponentCount(), 48)
    assert.equal(staticCompletionScreenComponentCount(), 48)
    assert.equal(PASSPORT_DEDICATED_PROPERTIES.length, 12)
    const generic = Object.values(PASSPORT_GENERIC_SLOT_BANK).reduce((a, n) => a + n, 0)
    const completion = Object.values(COMPLETION_SLOT_BANK).reduce((a, n) => a + n, 0)
    assert.equal(generic, 10)
    assert.equal(completion, 22)
  })

  it('reports live counters and names the overflowing field', () => {
    const report = registrationCapacityReport(completePresetSchema())
    assert.equal(report.ok, true)
    assert.match(formatCapacityCounter(report.passport), /Écran passeport: \d+\/50 composants/)
    assert.match(formatCapacityCounter(report.completion), /Compléter l’enregistrement: \d+\/50 composants/)
    const extras = Array.from({ length: 13 }, (_, i) =>
      newCustomField({
        id: `extra_${String(i + 1).padStart(2, '0')}`,
        key: `extra_${String(i + 1).padStart(2, '0')}`,
        label: `Overflow ${i + 1}`,
        enabled: true,
        order: 50 + i,
      }),
    )
    const overflow = parseRegistrationFormSchema({
      version: 2,
      source: 'custom',
      fields: [...simplePresetSchema().fields, ...extras],
    })
    assert.equal(overflow.ok, false)
    assert.ok(
      overflow.errors.some((e) => /Overflow 13/i.test(e)),
      overflow.errors.join(' | '),
    )
    assert.equal(canAddDynamicRegistrationField(simplePresetSchema()), true)
    assert.equal(canRenderInWhatsAppFlow(completePresetSchema()), true)
  })

  it('counts If wrappers and children in a generated layout', () => {
    const layout = {
      type: 'SingleColumnLayout',
      children: [
        { type: 'TextHeading', text: 't' },
        { type: 'TextCaption', text: 'c' },
        {
          type: 'Form',
          children: [
            { type: 'If', then: [{ type: 'TextInput', name: 'a' }] },
            { type: 'Footer', label: 'ok' },
          ],
        },
      ],
    }
    assert.equal(countFlowScreenComponents(layout), 6)
  })
})

describe('MRZ parsing', () => {
  it('parses the ICAO TD3 example and validates check digits', () => {
    const parsed = parseMrz(
      'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10',
    )
    assert.equal(parsed.format, 'TD3')
    assert.equal(parsed.checkDigitsOk, true)
    assert.equal(parsed.document_type, 'passport')
    assert.equal(parsed.last_name, 'Eriksson')
    assert.equal(parsed.first_name, 'Anna Maria')
    assert.equal(parsed.document_number, 'L898902C3')
    assert.equal(parsed.nationality, 'Utopia')
    assert.equal(parsed.birth_date, '1974-08-12')
    assert.equal(parsed.gender, 'Female')
    assert.equal(parsed.document_expiry_date, '2012-04-15')
    assert.equal(mrzCheckDigitValid('L898902C3', '6'), true)
  })

  it('prefers validated MRZ values and never copies nationality into residence', () => {
    const merged = mergeMrzIntoOcr(
      {
        first_name: '',
        last_name: '',
        nationality: '',
        residence_country: '',
      },
      parseMrz(
        'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10',
      ),
    )
    assert.equal(merged.first_name, 'Anna Maria')
    assert.equal(merged.nationality, 'Utopia')
    assert.equal(merged.residence_country, '')
  })
})
