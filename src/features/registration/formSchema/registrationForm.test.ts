import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  completePresetSchema,
  evaluateRegistrationCompleteness,
  mergeCustomAnswers,
  missingFieldsForMember,
  missingStayFields,
  needsWebCheckin,
  newCustomField,
  parseRegistrationFormSchema,
  requiredEnabledFields,
  resolveEffectiveRegistrationForm,
  simplePresetSchema,
} from './index'

const janeComplete = {
  first_name: 'Jane',
  last_name: 'Smith',
  birth_date: '1990-01-01',
  nationality: 'US',
  document_number: 'PP1',
  document_front_download: 'https://x/p.jpg',
  profession: 'Engineer',
  coming_from: 'Paris',
  going_to: 'Marrakech',
  phone: '33619252954',
}

const aminePartial = {
  first_name: 'Amine',
  last_name: 'Benali',
  nationality: 'Morocco',
  document_number: 'AB1234567',
}

describe('old simple configuration', () => {
  it('requires passport core and treats issued/birth place as optional', () => {
    const schema = simplePresetSchema()
    const required = requiredEnabledFields(schema).map((f) => f.id)
    assert.deepEqual(
      required.sort(),
      ['birth_date', 'document_number', 'first_name', 'last_name', 'nationality', 'passport_photo'].sort(),
    )
    assert.ok(!required.includes('place_of_birth'))
    assert.ok(!required.includes('profession'))
    assert.equal(needsWebCheckin(schema), false)
  })

  it('marks incomplete without birth_date and photo', () => {
    const missing = missingFieldsForMember(aminePartial, simplePresetSchema())
    assert.ok(missing.includes('birth_date'))
    assert.ok(missing.includes('passport_photo'))
    assert.ok(!missing.includes('first_name'))
  })

  it('is complete when simple required fields including photo are present', () => {
    const member = {
      ...aminePartial,
      birth_date: '1990-07-15',
      document_front_download: 'https://cdn.example/verified.jpg',
    }
    assert.deepEqual(missingFieldsForMember(member, simplePresetSchema()), [])
  })
})

describe('old complete configuration', () => {
  it('requires police extras on top of passport', () => {
    const required = requiredEnabledFields(completePresetSchema()).map((f) => f.id)
    for (const key of ['profession', 'coming_from', 'going_to', 'phone', 'passport_photo']) {
      assert.ok(required.includes(key), key)
    }
    assert.equal(needsWebCheckin(completePresetSchema()), false)
  })

  it('marks Jane+police complete without issued place', () => {
    assert.deepEqual(missingFieldsForMember(janeComplete, completePresetSchema()), [])
  })
})

describe('owner inheritance and listing override', () => {
  it('inherits owner custom schema when listing has no override', () => {
    const ownerSchema = {
      version: 1 as const,
      source: 'custom' as const,
      fields: [
        ...simplePresetSchema().fields,
        newCustomField({
          id: 'trip_origin',
          key: 'trip_origin',
          label: 'Origin of your trip',
          required: true,
          enabled: true,
          scope: 'per_stay',
          order: 20,
        }),
      ],
    }
    const effective = resolveEffectiveRegistrationForm({
      listingGestion: { registrationLevel: 'simple' },
      ownerGestion: { registrationFormSchema: ownerSchema },
    })
    assert.equal(effective.origin, 'owner')
    assert.equal(effective.override, false)
    assert.ok(effective.schema.fields.some((f) => f.id === 'trip_origin'))
  })

  it('uses listing override instead of owner', () => {
    const listingSchema = completePresetSchema()
    const ownerSchema = simplePresetSchema()
    const effective = resolveEffectiveRegistrationForm({
      listingGestion: {
        registrationFormOverride: true,
        registrationFormSchema: listingSchema,
      },
      ownerGestion: { registrationFormSchema: ownerSchema },
    })
    assert.equal(effective.origin, 'listing')
    assert.equal(effective.override, true)
    assert.equal(effective.registrationLevel, 'complete')
  })

  it('falls back to listing legacy complete when no schema exists', () => {
    const effective = resolveEffectiveRegistrationForm({
      listingGestion: { registrationLevel: 'complete' },
      ownerGestion: { registrationLevel: 'simple' },
    })
    assert.equal(effective.registrationLevel, 'complete')
    assert.ok(requiredEnabledFields(effective.schema).some((f) => f.id === 'profession'))
  })
})

describe('required and optional custom fields', () => {
  it('blocks completion until a required custom stay field is answered', () => {
    const schema = {
      version: 1 as const,
      source: 'custom' as const,
      fields: [
        ...simplePresetSchema().fields,
        newCustomField({
          id: 'reason_stay',
          key: 'reason_stay',
          label: 'Reason for the stay',
          required: true,
          enabled: true,
          scope: 'per_stay',
        }),
      ],
    }
    const member = {
      ...aminePartial,
      birth_date: '1990-07-15',
      document_front_download: 'https://cdn.example/p.jpg',
    }
    const before = evaluateRegistrationCompleteness(schema, {
      members: [member],
      travelerCount: 1,
    })
    assert.equal(before.complete, false)
    assert.deepEqual(before.stayMissing, ['reason_stay'])
    const after = evaluateRegistrationCompleteness(schema, {
      members: [member],
      travelerCount: 1,
      customAnswers: { stay: { reason_stay: 'Tourism' }, travelers: {} },
    })
    assert.equal(after.complete, true)
  })

  it('ignores optional custom fields for completion', () => {
    const schema = {
      version: 1 as const,
      source: 'custom' as const,
      fields: [
        ...simplePresetSchema().fields,
        newCustomField({
          id: 'eta',
          key: 'eta',
          label: 'Estimated arrival time',
          required: false,
          enabled: true,
          type: 'time',
          scope: 'per_stay',
        }),
      ],
    }
    const member = {
      ...aminePartial,
      birth_date: '1990-07-15',
      document_front_download: 'https://cdn.example/p.jpg',
    }
    const result = evaluateRegistrationCompleteness(schema, {
      members: [member],
      travelerCount: 1,
    })
    assert.equal(result.complete, true)
    assert.deepEqual(missingStayFields(schema), [])
  })
})

describe('deleted/disabled and reordered fields', () => {
  it('does not require disabled fields', () => {
    const schema = simplePresetSchema()
    const photo = schema.fields.find((f) => f.id === 'passport_photo')
    if (photo) {
      photo.enabled = false
      photo.required = true
    }
    const missing = missingFieldsForMember(aminePartial, schema)
    assert.ok(!missing.includes('passport_photo'))
  })

  it('keeps unknown custom answers after the field is removed', () => {
    const merged = mergeCustomAnswers(
      { stay: { old_question: 'Casablanca' }, travelers: { '0': { hobby: 'surf' } } },
      { stay: { reason_stay: 'Work' }, travelers: { '0': { seat: 'window' } } },
    )
    assert.equal(merged.stay.old_question, 'Casablanca')
    assert.equal(merged.stay.reason_stay, 'Work')
    assert.equal(merged.travelers['0'].hobby, 'surf')
    assert.equal(merged.travelers['0'].seat, 'window')
  })

  it('respects display order independently of required flags', () => {
    const parsed = parseRegistrationFormSchema({
      version: 1,
      source: 'custom',
      fields: [
        newCustomField({ id: 'b_field', key: 'b_field', label: 'B', order: 2, required: true }),
        newCustomField({ id: 'a_field', key: 'a_field', label: 'A', order: 0, required: false }),
        newCustomField({ id: 'c_field', key: 'c_field', label: 'C', order: 1, required: true }),
      ],
    })
    assert.equal(parsed.ok, true)
    assert.deepEqual(parsed.schema?.fields.map((f) => f.id), ['a_field', 'c_field', 'b_field'])
  })
})

describe('per-stay versus per-traveler answers', () => {
  it('requires stay answers once and traveler answers per guest', () => {
    const schema = {
      version: 1 as const,
      source: 'custom' as const,
      fields: [
        ...simplePresetSchema().fields,
        newCustomField({
          id: 'trip_origin',
          key: 'trip_origin',
          label: 'Origin of your trip',
          required: true,
          enabled: true,
          scope: 'per_stay',
        }),
        newCustomField({
          id: 'coming_city',
          key: 'coming_city',
          label: 'Where are you coming from',
          required: true,
          enabled: true,
          scope: 'per_traveler',
        }),
      ],
    }
    const guest = {
      ...aminePartial,
      birth_date: '1990-07-15',
      document_front_download: 'https://cdn.example/p.jpg',
    }
    const incomplete = evaluateRegistrationCompleteness(schema, {
      members: [guest, { ...guest, first_name: 'Sara' }],
      travelerCount: 2,
      customAnswers: {
        stay: { trip_origin: 'Madrid' },
        travelers: { '0': { coming_city: 'Lyon' } },
      },
    })
    assert.equal(incomplete.complete, false)
    assert.deepEqual(incomplete.stayMissing, [])
    assert.deepEqual(incomplete.travelersMissing[0], [])
    assert.deepEqual(incomplete.travelersMissing[1], ['coming_city'])

    const complete = evaluateRegistrationCompleteness(schema, {
      members: [guest, { ...guest, first_name: 'Sara' }],
      travelerCount: 2,
      customAnswers: {
        stay: { trip_origin: 'Madrid' },
        travelers: {
          '0': { coming_city: 'Lyon' },
          '1': { coming_city: 'Nice' },
        },
      },
    })
    assert.equal(complete.complete, true)
    assert.equal(complete.registeredCount, 2)
  })
})

describe('schema validation', () => {
  it('rejects unknown builtin bindings and duplicate ids', () => {
    const result = parseRegistrationFormSchema({
      version: 1,
      fields: [
        { id: 'first_name', kind: 'builtin', binding: 'first_name', type: 'short_text' },
        { id: 'first_name', kind: 'custom', key: 'dup', type: 'short_text' },
        { id: 'nope', kind: 'builtin', binding: 'not_a_field', type: 'short_text' },
      ],
    })
    assert.equal(result.ok, false)
    assert.ok(result.errors.some((e) => /duplicate/i.test(e)))
    assert.ok(result.errors.some((e) => /binding/i.test(e)))
  })

  it('marks custom schemas as needing a web check-in', () => {
    const schema = {
      version: 1 as const,
      source: 'custom' as const,
      fields: [
        ...simplePresetSchema().fields,
        newCustomField({ id: 'q1', key: 'q1', label: 'Q1', required: true }),
      ],
    }
    assert.equal(needsWebCheckin(schema), true)
  })

  it('keeps simple/complete presets on the published WhatsApp Flow', () => {
    assert.equal(needsWebCheckin(simplePresetSchema()), false)
    assert.equal(needsWebCheckin(completePresetSchema()), false)
    const classified = parseRegistrationFormSchema({
      version: 1,
      fields: simplePresetSchema().fields,
    })
    assert.equal(classified.ok, true)
    assert.equal(classified.schema?.source, 'preset:simple')
    assert.equal(needsWebCheckin(classified.schema!), false)
  })
})
