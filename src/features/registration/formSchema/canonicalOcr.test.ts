import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  assignPassportGenericSlots,
  builtinField,
  completePresetSchema,
  formReviewMissingLabels,
  formScreenFlowFlags,
  newCustomField,
  parseRegistrationFormSchema,
  parseRegistrationFormSchemaStrict,
  registrationCapacityReport,
  registrationMissingLabels,
  simplePresetSchema,
  staticPassportScreenComponentCount,
  validateFormReviewFields,
} from './index'

function productionParaguayPassportSchemaRaw() {
  return {
    version: 2,
    source: 'custom',
    fields: [
      builtinField('first_name', { required: false, enabled: false, order: 0 }),
      builtinField('last_name', { required: false, enabled: false, order: 1 }),
      builtinField('document_number', { required: true, enabled: true, order: 2 }),
      builtinField('nationality', { required: true, enabled: true, order: 3 }),
      {
        ...builtinField('city', { required: true, enabled: true, order: 4 }),
        screen: 'passport' as const,
        valueSource: 'ocr' as const,
        ocrProperty: 'issuing_country' as const,
      },
      builtinField('birth_date', { required: false, enabled: true, order: 5 }),
      builtinField('gender', { required: false, enabled: false, order: 6 }),
      {
        id: 'nouvelle_question',
        key: 'nouvelle_question',
        kind: 'custom' as const,
        type: 'select' as const,
        label: 'Nouvelle question',
        enabled: true,
        required: false,
        scope: 'per_traveler' as const,
        screen: 'passport' as const,
        valueSource: 'ocr' as const,
        ocrProperty: 'gender' as const,
        order: 7,
      },
      builtinField('place_of_birth', { required: false, enabled: true, order: 8 }),
      {
        ...builtinField('issuing_country', { required: true, enabled: false, order: 9 }),
      },
      builtinField('passport_photo', { required: true, enabled: true, order: 10 }),
    ],
  }
}

describe('canonical OCR passport mapping', () => {
  it('migrates city + OCR issuing_country to manual city and enabled Pays émetteur', () => {
    const parsed = parseRegistrationFormSchema(productionParaguayPassportSchemaRaw())
    assert.equal(parsed.ok, true, parsed.errors.join(' | '))
    const schema = parsed.schema!
    const city = schema.fields.find((f) => f.id === 'city')!
    const issuing = schema.fields.find((f) => f.id === 'issuing_country')!
    assert.equal(city.valueSource, 'manual')
    assert.equal(city.ocrProperty, undefined)
    assert.equal(city.screen, 'completion')
    assert.equal(issuing.enabled, true)
    assert.equal(issuing.required, true)
    assert.equal(issuing.ocrProperty, 'issuing_country')
  })

  it('shows required issuing_country as Pays émetteur and prefills Paraguay', () => {
    const schema = parseRegistrationFormSchema(productionParaguayPassportSchemaRaw()).schema!
    const flags = formScreenFlowFlags(schema)
    assert.equal(flags.issuing_country_visible, true)
    assert.equal(flags.issuing_country_required, true)
    assert.match(String(flags.issuing_country_label), /Pays émetteur/)
    assert.equal(
      assignPassportGenericSlots(schema).assignments.some((a) => a.field.id === 'city'),
      false,
    )
    assert.equal(
      assignPassportGenericSlots(schema).assignments.some((a) => a.field.id === 'nouvelle_question'),
      false,
    )
  })

  it('validates issuing_country submission and uses localized missing labels', () => {
    const schema = parseRegistrationFormSchema(productionParaguayPassportSchemaRaw()).schema!
    const missing = validateFormReviewFields(schema, {
      document_number: '3122656',
      nationality: 'Paraguay',
      issuing_country: '',
      birth_date: '1980-03-21',
      gender: 'Male',
      place_of_birth: 'Porto Alegre',
      hasVerifiedPhoto: true,
    })
    assert.equal(missing.ok, false)
    if (!missing.ok) {
      assert.ok(missing.missing.includes('issuing_country'))
      assert.deepEqual(formReviewMissingLabels(schema, missing.missing, 'fr'), ['Pays émetteur'])
    }
    const ok = validateFormReviewFields(schema, {
      document_number: '3122656',
      nationality: 'Paraguay',
      issuing_country: 'Paraguay',
      birth_date: '1980-03-21',
      gender: 'Male',
      place_of_birth: 'Porto Alegre',
      hasVerifiedPhoto: true,
    })
    assert.equal(ok.ok, true)
  })

  it('disabled issuing_country is neither visible nor required', () => {
    const schema = parseRegistrationFormSchema({
      version: 2,
      fields: simplePresetSchema().fields.map((f) =>
        f.id === 'issuing_country' ? { ...f, enabled: false, required: true } : f,
      ),
    }).schema!
    const flags = formScreenFlowFlags(schema)
    assert.equal(flags.issuing_country_visible, false)
    assert.equal(flags.issuing_country_required, false)
  })

  it('rejects city bound to issuing_country in strict mode', () => {
    const strict = parseRegistrationFormSchemaStrict({
      version: 2,
      fields: [
        ...completePresetSchema().fields,
        {
          ...builtinField('city', { required: true, enabled: true, order: 99 }),
          screen: 'passport' as const,
          valueSource: 'ocr' as const,
          ocrProperty: 'issuing_country' as const,
        },
      ],
    })
    assert.equal(strict.ok, false)
    assert.ok(strict.errors.some((e) => /Ville|issuing_country|émetteur/i.test(e)))
  })

  it('renders built-in gender exactly once and disables duplicate custom OCR gender', () => {
    const schema = parseRegistrationFormSchema(productionParaguayPassportSchemaRaw()).schema!
    const gender = schema.fields.find((f) => f.id === 'gender')!
    const custom = schema.fields.find((f) => f.id === 'nouvelle_question')!
    assert.equal(gender.enabled, true)
    assert.equal(custom.enabled, false)
    assert.equal(formScreenFlowFlags(schema).gender_visible, true)
    assert.equal(assignPassportGenericSlots(schema).assignments.filter((a) => a.field.id === 'gender').length, 0)
    assert.equal(
      assignPassportGenericSlots(schema).assignments.filter((a) => a.field.id === 'nouvelle_question').length,
      0,
    )
  })

  it('rejects two enabled owners for the same OCR property in strict mode', () => {
    const strict = parseRegistrationFormSchemaStrict({
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
    assert.equal(strict.ok, false)
  })

  it('keeps nationality, issuing country and residence independent', () => {
    const schema = parseRegistrationFormSchema({
      version: 2,
      fields: [
        ...simplePresetSchema().fields,
        {
          ...builtinField('country', { required: false, enabled: true, order: 20 }),
          ocrProperty: 'residence_country',
          valueSource: 'ocr',
        },
      ],
    }).schema!
    const flags = formScreenFlowFlags(schema)
    assert.equal(flags.nationality_visible, true)
    assert.equal(
      flags.issuing_country_visible,
      Boolean(schema.fields.find((f) => f.id === 'issuing_country')?.enabled !== false),
    )
    assert.equal(flags.residence_country_visible, false)
    const generic = assignPassportGenericSlots(schema)
    assert.ok(generic.assignments.some((a) => a.field.ocrProperty === 'residence_country'))
    assert.equal(generic.assignments.some((a) => a.field.id === 'nationality'), false)
  })

  it('production visible labels appear once in canonical order', () => {
    const schema = parseRegistrationFormSchema(productionParaguayPassportSchemaRaw()).schema!
    const flags = formScreenFlowFlags(schema)
    const visibleDedicated = [
      'document_number',
      'nationality',
      'issuing_country',
      'birth_date',
      'gender',
      'place_of_birth',
    ] as const
    const labels: string[] = []
    for (const binding of visibleDedicated) {
      if (flags[`${binding}_visible`] !== true) continue
      labels.push(String(flags[`${binding}_label`]))
    }
    assert.deepEqual(labels, [
      'N° CIN / Passeport *',
      'Nationalité *',
      'Pays émetteur *',
      'Date de naissance',
      'Genre',
      'Lieu de naissance',
    ])
    const counts = new Map<string, number>()
    for (const label of labels) {
      counts.set(label, (counts.get(label) ?? 0) + 1)
    }
    for (const [, n] of counts) assert.equal(n, 1)
  })

  it('passport screen stays within 50 components for maximum passport preset', () => {
    assert.equal(staticPassportScreenComponentCount(), 48)
    const schema = parseRegistrationFormSchema(simplePresetSchema()).schema!
    const report = registrationCapacityReport(schema)
    assert.ok(report.passport.components <= 50)
  })

  it('uses field labels for missing-field messages', () => {
    const schema = parseRegistrationFormSchema(productionParaguayPassportSchemaRaw()).schema!
    assert.deepEqual(registrationMissingLabels(schema, ['issuing_country'], 'fr'), ['Pays émetteur'])
  })
})
