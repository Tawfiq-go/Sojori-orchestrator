import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  REGISTRATION_FLOW_DYNAMIC_FIELD_LIMIT,
  buildSlotFlowData,
  canAddDynamicRegistrationField,
  canRenderInWhatsAppFlow,
  coerceAndValidateFlowAnswer,
  completePresetSchema,
  customScreenIdFor,
  dynamicFlowFields,
  dynamicFlowFieldsForScope,
  dynamicFlowSlotCount,
  emptySlotFlowData,
  evaluateRegistrationCompleteness,
  fieldTypeToVariant,
  mapSlotAnswersFromFlowData,
  mergeCustomAnswers,
  missingFieldsForMember,
  missingStayFields,
  needsWebCheckin,
  newCustomField,
  nextCustomScreen,
  parseRegistrationFormSchema,
  reconstructSlotMapping,
  requiredEnabledFields,
  resolveEffectiveRegistrationForm,
  simplePresetSchema,
  slotBindingsForPage,
  splitSlotAnswersByKind,
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

  it('does not treat custom schemas as web-only', () => {
    const schema = {
      version: 1 as const,
      source: 'custom' as const,
      fields: [
        ...simplePresetSchema().fields,
        newCustomField({ id: 'q1', key: 'q1', label: 'Q1', required: true }),
      ],
    }
    assert.equal(needsWebCheckin(schema), false)
    assert.equal(canRenderInWhatsAppFlow(schema), true)
    assert.equal(schema.source, 'custom')
  })

  it('keeps simple/complete presets on the WhatsApp Flow', () => {
    assert.equal(needsWebCheckin(simplePresetSchema()), false)
    assert.equal(needsWebCheckin(completePresetSchema()), false)
    assert.equal(canRenderInWhatsAppFlow(simplePresetSchema()), true)
    assert.equal(canRenderInWhatsAppFlow(completePresetSchema()), true)
    const classified = parseRegistrationFormSchema({
      version: 1,
      fields: simplePresetSchema().fields,
    })
    assert.equal(classified.ok, true)
    assert.equal(classified.schema?.source, 'preset:simple')
    assert.equal(needsWebCheckin(classified.schema!), false)
  })

  it('rejects an eleventh enabled dynamic field', () => {
    const extras = Array.from({ length: REGISTRATION_FLOW_DYNAMIC_FIELD_LIMIT + 1 }, (_, i) =>
      newCustomField({
        id: `extra_${i + 1}`,
        key: `extra_${i + 1}`,
        label: `Extra ${i + 1}`,
        enabled: true,
        order: 20 + i,
      }),
    )
    const result = parseRegistrationFormSchema({
      version: 1,
      source: 'custom',
      fields: [...simplePresetSchema().fields, ...extras],
    })
    assert.equal(result.ok, false)
    assert.ok(result.errors.some((e) => /10|extra WhatsApp Flow/i.test(e)))
    assert.equal(
      canAddDynamicRegistrationField({
        version: 1,
        source: 'custom',
        fields: [
          ...simplePresetSchema().fields,
          ...Array.from({ length: REGISTRATION_FLOW_DYNAMIC_FIELD_LIMIT }, (_, i) =>
            newCustomField({ id: `e${i}`, key: `e${i}`, label: 'E', enabled: true }),
          ),
        ],
      }),
      false,
    )
  })
})

describe('WhatsApp Flow dynamic slots', () => {
  it('skips custom screens when there are zero dynamic fields', () => {
    assert.equal(dynamicFlowSlotCount(simplePresetSchema()), 0)
    assert.equal(dynamicFlowFieldsForScope(simplePresetSchema(), 'per_traveler').length, 0)
    assert.equal(nextCustomScreen('per_traveler', 'A', 0), null)
  })

  it('maps one field to a single visible variant and hides unused slots', () => {
    const schema = {
      version: 1 as const,
      source: 'custom' as const,
      fields: [
        ...simplePresetSchema().fields,
        newCustomField({ id: 'q1', key: 'q1', label: 'Allergie', type: 'short_text', enabled: true }),
      ],
    }
    const fields = dynamicFlowFields(schema)
    assert.equal(fields.length, 1)
    const pageA = slotBindingsForPage(fields, 'A')
    assert.equal(pageA.filter((s) => s.field).length, 1)
    const active = buildSlotFlowData({ slot: 1, field: fields[0] })
    assert.equal(active.slot_1_show_short_text, true)
    assert.equal(active.slot_1_show_long_text, false)
    const unused = emptySlotFlowData(2)
    assert.equal(unused.slot_2_show_short_text, false)
    assert.equal(unused.slot_2_show_date, false)
    assert.equal(unused.slot_2_show_boolean, false)
  })

  it('fits five fields on page A and ten across both pages', () => {
    const extras = Array.from({ length: 10 }, (_, i) =>
      newCustomField({
        id: `f${i + 1}`,
        key: `f${i + 1}`,
        label: `F${i + 1}`,
        enabled: true,
        order: 20 + i,
      }),
    )
    const fields = dynamicFlowFields({
      version: 1,
      source: 'custom',
      fields: [...simplePresetSchema().fields, ...extras],
    })
    assert.equal(slotBindingsForPage(fields, 'A').filter((s) => s.field).length, 5)
    assert.equal(slotBindingsForPage(fields, 'B').filter((s) => s.field).length, 5)
    assert.equal(customScreenIdFor('per_traveler', 'A'), 'CUSTOM_FIELDS_A')
    assert.equal(nextCustomScreen('per_traveler', 'A', 10), 'CUSTOM_FIELDS_B')
    assert.equal(nextCustomScreen('per_stay', 'A', 5), null)
    assert.equal(nextCustomScreen('per_stay', 'A', 6), 'STAY_FIELDS_B')
  })

  it('converts each supported field type to the matching Flow variant and value type', () => {
    const cases: Array<{
      type: 'short_text' | 'long_text' | 'date' | 'time' | 'select' | 'multi_select' | 'boolean'
      raw: unknown
      value: unknown
    }> = [
      { type: 'short_text', raw: 'Paris', value: 'Paris' },
      { type: 'long_text', raw: 'Hello', value: 'Hello' },
      { type: 'date', raw: '2026-08-17', value: '2026-08-17' },
      { type: 'time', raw: '14:30', value: '14:30' },
      { type: 'select', raw: 'a', value: 'a' },
      { type: 'multi_select', raw: ['a', 'b'], value: ['a', 'b'] },
      { type: 'boolean', raw: 'true', value: true },
    ]
    for (const c of cases) {
      assert.equal(fieldTypeToVariant(c.type), c.type)
      const field = newCustomField({
        id: `t_${c.type}`,
        key: `t_${c.type}`,
        type: c.type,
        options: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ],
      })
      const out = coerceAndValidateFlowAnswer(field, c.raw)
      assert.equal(out.ok, true, c.type)
      if (out.ok) assert.deepEqual(out.value, c.value)
    }
  })

  it('validates required only for active fields and ignores hidden variants', () => {
    const required = newCustomField({
      id: 'need',
      key: 'need',
      label: 'Need',
      required: true,
      type: 'short_text',
    })
    const optional = newCustomField({
      id: 'opt',
      key: 'opt',
      label: 'Opt',
      required: false,
      type: 'long_text',
    })
    const mapped = mapSlotAnswersFromFlowData({
      fields: [required, optional],
      page: 'A',
      data: {
        slot_1_short_text: '',
        slot_1_long_text: 'hidden leftover',
        slot_2_long_text: '',
        slot_2_short_text: 'also hidden',
      },
    })
    assert.equal(mapped.ok, false)
    assert.deepEqual(
      mapped.errors.map((e) => e.fieldId),
      ['need'],
    )
    const filled = mapSlotAnswersFromFlowData({
      fields: [required, optional],
      page: 'A',
      data: { slot_1_short_text: 'yes', slot_1_long_text: 'ignore me' },
    })
    assert.equal(filled.ok, true)
    assert.equal(filled.answers.need, 'yes')
    assert.equal(filled.answers.opt, '')
  })

  it('rejects select and multi_select values outside the configured options', () => {
    const select = newCustomField({
      id: 'meal',
      key: 'meal',
      type: 'select',
      options: [{ value: 'veg', label: 'Veg' }],
    })
    const multi = newCustomField({
      id: 'allergies',
      key: 'allergies',
      type: 'multi_select',
      options: [{ value: 'nuts', label: 'Nuts' }],
    })
    assert.equal(coerceAndValidateFlowAnswer(select, 'halal').ok, false)
    assert.equal(coerceAndValidateFlowAnswer(multi, ['nuts', 'shellfish']).ok, false)
    assert.equal(coerceAndValidateFlowAnswer(select, 'veg').ok, true)
    assert.equal(coerceAndValidateFlowAnswer(multi, ['nuts']).ok, true)
  })

  it('keeps per_traveler and per_stay answers on separate mappings', () => {
    const schema = {
      version: 1 as const,
      source: 'custom' as const,
      fields: [
        ...simplePresetSchema().fields,
        newCustomField({
          id: 'coming_city',
          key: 'coming_city',
          label: 'City',
          scope: 'per_traveler',
          enabled: true,
        }),
        newCustomField({
          id: 'trip_origin',
          key: 'trip_origin',
          label: 'Origin',
          scope: 'per_stay',
          enabled: true,
        }),
      ],
    }
    const traveler = reconstructSlotMapping({ schema, scope: 'per_traveler', page: 'A' })
    const stay = reconstructSlotMapping({ schema, scope: 'per_stay', page: 'A' })
    assert.equal(traveler[0]?.field?.id, 'coming_city')
    assert.equal(stay[0]?.field?.id, 'trip_origin')
    assert.equal(customScreenIdFor('per_stay', 'A'), 'STAY_FIELDS_A')
  })

  it('prefills existing answers and preserves field order/labels', () => {
    const fields = [
      newCustomField({ id: 'second_q', key: 'second_q', label: 'Second', order: 2, type: 'short_text' }),
      newCustomField({ id: 'first_q', key: 'first_q', label: 'First', order: 1, type: 'date' }),
    ]
    const parsed = parseRegistrationFormSchema({ version: 1, source: 'custom', fields })
    assert.equal(parsed.ok, true)
    const ordered = dynamicFlowFields(parsed.schema!)
    assert.deepEqual(
      ordered.map((f) => f.id),
      ['first_q', 'second_q'],
    )
    const data = buildSlotFlowData({
      slot: 1,
      field: ordered[0]!,
      value: '1990-01-01',
      locale: 'fr',
    })
    assert.equal(data.slot_1_show_date, true)
    assert.equal(data.slot_1_init_date, '1990-01-01')
    assert.equal(String(data.slot_1_label).startsWith('First'), true)
  })

  it('splits builtin extras onto member fields and custom answers separately', () => {
    const fields = [
      ...dynamicFlowFields(completePresetSchema()).filter((f) => f.id === 'profession'),
      newCustomField({ id: 'q1', key: 'q1', label: 'Q1', enabled: true }),
    ]
    const split = splitSlotAnswersByKind(fields, { profession: 'Engineer', q1: 'Hello' })
    assert.equal(split.builtins.profession, 'Engineer')
    assert.equal(split.custom.q1, 'Hello')
  })
})
