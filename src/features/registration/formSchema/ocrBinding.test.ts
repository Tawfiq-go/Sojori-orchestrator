import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  OCR_PROPERTY_FIELD_TYPE,
  OCR_SOURCE_PASSPORT_HINT,
  PASSPORT_OCR_PROPERTIES,
  applyMaxPassportExtraction,
  applyOcrBindingToField,
  completePresetSchema,
  builtinField,
  fieldScreen,
  fieldValueForTraveler,
  newCustomField,
  ocrPrefillForField,
  parseRegistrationFormSchema,
  parseRegistrationFormSchemaStrict,
  simplePresetSchema,
  type PassportOcrProperty,
  type RegistrationFieldType,
} from './index'

const INCOMPATIBLE: Record<PassportOcrProperty, RegistrationFieldType> = {
  document_type: 'time',
  gender: 'time',
  birth_date: 'time',
  document_issued_on: 'short_text',
  document_expiry_date: 'time',
  first_name: 'date',
  last_name: 'time',
  document_number: 'date',
  nationality: 'date',
  issuing_country: 'time',
  place_of_birth: 'date',
  document_issued_at: 'time',
  residence_country: 'date',
  personal_number: 'date',
}

describe('OCR type compatibility map', () => {
  for (const prop of PASSPORT_OCR_PROPERTIES) {
    it(`maps ${prop} → ${OCR_PROPERTY_FIELD_TYPE[prop]} and rejects ${INCOMPATIBLE[prop]} in strict mode`, () => {
      const expected = OCR_PROPERTY_FIELD_TYPE[prop]
      const applied = applyOcrBindingToField(
        newCustomField({
          id: `c_${prop}`,
          key: `c_${prop}`,
          label: prop,
          type: INCOMPATIBLE[prop],
          screen: 'completion',
          required: false,
        }),
        prop,
      )
      assert.equal(applied.field.type, expected)
      assert.equal(applied.field.screen, 'passport')
      assert.equal(applied.field.valueSource, 'ocr')
      assert.equal(applied.field.ocrProperty, prop)
      assert.equal(applied.typeAdjusted, true)
      assert.match(applied.notice || '', /Type ajusté|écran passeport/i)

      const migrated = parseRegistrationFormSchema({
        version: 2,
        source: 'custom',
        fields: [
          ...simplePresetSchema().fields.map((f) =>
            f.ocrProperty === prop || f.binding === prop ? { ...f, enabled: false } : f,
          ),
          {
            id: `c_${prop}`,
            key: `c_${prop}`,
            kind: 'custom',
            type: INCOMPATIBLE[prop],
            label: prop,
            enabled: true,
            required: false,
            scope: 'per_traveler',
            screen: 'completion',
            valueSource: 'ocr',
            ocrProperty: prop,
          },
        ],
      })
      assert.equal(migrated.ok, true, migrated.errors.join(' | '))
      const field = migrated.schema!.fields.find((f) => f.id === `c_${prop}`)!
      assert.equal(field.type, expected)
      assert.equal(field.screen, 'passport')

      const strict = parseRegistrationFormSchemaStrict({
        version: 2,
        source: 'custom',
        fields: [
          ...simplePresetSchema().fields.map((f) =>
            f.ocrProperty === prop || f.binding === prop ? { ...f, enabled: false } : f,
          ),
          {
            id: `c_${prop}`,
            key: `c_${prop}`,
            kind: 'custom',
            type: INCOMPATIBLE[prop],
            label: prop,
            enabled: true,
            required: false,
            scope: 'per_traveler',
            screen: 'completion',
            valueSource: 'ocr',
            ocrProperty: prop,
          },
        ],
      })
      assert.equal(strict.ok, false)
      assert.ok(strict.errors.some((e) => e.includes(prop) && e.includes(expected)))
    })
  }

  it('installs Male/Female options for OCR gender and Passport/National ID for document_type', () => {
    const gender = applyOcrBindingToField(newCustomField({ type: 'time', label: 'Genre' }), 'gender').field
    assert.deepEqual(
      (gender.options ?? []).map((o) => o.value),
      ['Male', 'Female'],
    )
    const doc = applyOcrBindingToField(newCustomField({ type: 'short_text' }), 'document_type').field
    assert.deepEqual(
      (doc.options ?? []).map((o) => o.value),
      ['passport', 'national_id'],
    )
  })

  it('migrates custom time + OCR gender off the completion screen and drops 12:34', () => {
    const parsed = parseRegistrationFormSchema({
      version: 2,
      source: 'custom',
      fields: [
        ...simplePresetSchema().fields.map((f) => (f.id === 'gender' ? { ...f, enabled: false } : f)),
        {
          id: 'nouvelle_question',
          key: 'nouvelle_question',
          kind: 'custom',
          type: 'time',
          label: 'Nouvelle question',
          enabled: true,
          required: true,
          scope: 'per_traveler',
          screen: 'completion',
          valueSource: 'ocr',
          ocrProperty: 'gender',
        },
      ],
    })
    assert.equal(parsed.ok, true, parsed.errors.join(' | '))
    const gender = parsed.schema!.fields.find((f) => f.id === 'gender')!
    const custom = parsed.schema!.fields.find((f) => f.id === 'nouvelle_question')!
    assert.equal(gender.enabled, true)
    assert.equal(gender.type, 'select')
    assert.equal(gender.screen, 'passport')
    assert.equal(custom.enabled, false)
    assert.equal(fieldValueForTraveler(gender, {}, { nouvelle_question: '12:34', gender: '12:34' }), '')
    assert.equal(ocrPrefillForField(gender, { gender: '12:34' }), undefined)
    assert.equal(ocrPrefillForField(gender, { gender: 'Female' }), 'Female')
  })

  it('rejects duplicate enabled OCR bindings', () => {
    const result = parseRegistrationFormSchemaStrict({
      version: 2,
      fields: [
        ...simplePresetSchema().fields,
        newCustomField({
          id: 'genre2',
          key: 'genre2',
          label: 'Genre 2',
          valueSource: 'ocr',
          ocrProperty: 'gender',
        }),
      ],
    })
    assert.equal(result.ok, false)
    assert.ok(result.errors.some((e) => /même propriété|gender/i.test(e)))
  })

  it('forces builtin fields to stay bound to their own OCR property', () => {
    const strict = parseRegistrationFormSchemaStrict({
      version: 2,
      fields: simplePresetSchema().fields.map((f) =>
        f.id === 'first_name' ? { ...f, valueSource: 'ocr', ocrProperty: 'gender' } : f,
      ),
    })
    assert.equal(strict.ok, false)
    assert.ok(strict.errors.some((e) => /first_name|Prénom|gender/i.test(e)))
  })
})

describe('max passport extraction', () => {
  it('enables all dedicated OCR fields plus optional residence and personal number without forcing required', () => {
    const schema = applyMaxPassportExtraction(completePresetSchema())
    for (const prop of [
      'document_type',
      'first_name',
      'last_name',
      'document_number',
      'nationality',
      'issuing_country',
      'birth_date',
      'gender',
      'place_of_birth',
      'document_issued_on',
      'document_issued_at',
      'document_expiry_date',
    ] as const) {
      const field = schema.fields.find((f) => f.id === prop)!
      assert.equal(field.enabled, true)
      assert.equal(field.screen, 'passport')
      assert.equal(field.valueSource, 'ocr')
      assert.equal(field.ocrProperty, prop)
    }
    const country = schema.fields.find((f) => f.id === 'country')!
    assert.equal(country.enabled, true)
    assert.equal(country.screen, 'passport')
    assert.equal(country.ocrProperty, 'residence_country')
    assert.equal(country.required, true)
    const personal = schema.fields.find((f) => f.id === 'personal_number')!
    assert.equal(personal.enabled, true)
    assert.equal(personal.required, false)
    assert.equal(personal.ocrProperty, 'personal_number')
    const profession = schema.fields.find((f) => f.id === 'profession')!
    assert.equal(profession.screen, 'completion')
    assert.equal(profession.valueSource, 'manual')
    const parsed = parseRegistrationFormSchema(schema)
    assert.equal(parsed.ok, true, parsed.errors.join(' | '))
  })

  it('exposes the OCR passport-screen explanation', () => {
    assert.equal(
      OCR_SOURCE_PASSPORT_HINT,
      'Les champs OCR sont préremplis depuis le document et affichés sur l’écran passeport.',
    )
  })
})
