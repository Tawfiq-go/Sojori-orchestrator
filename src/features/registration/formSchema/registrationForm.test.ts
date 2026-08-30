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
  fieldValueForTraveler,
  mapSlotAnswersFromFlowData,
  mergeCustomAnswers,
  missingFieldsForMember,
  missingStayFields,
  needsWebCheckin,
  newCustomField,
  nextCustomScreen,
  parseRegistrationFormSchema,
  pickEnabledFormMemberPatch,
  reconstructSlotMapping,
  requiredEnabledFields,
  resolveEffectiveRegistrationForm,
  screenshotHotelRegistrationSchema,
  simplePresetSchema,
  slotBindingsForPage,
  splitSlotAnswersByKind,
  validateFormReviewFields,
  formReviewControlFlags,
  formScreenFlowFlags,
  isLegacyFormComponentEnabled,
  isPassportPhotoRequired,
  isPassportPhotoEnabled,
  nextScreenAfterFormSave,
  registrationFieldTypeLabel,
  registrationNavigationDiagnostics,
  schemaFromFlowState,
  sanitizeFlowDateValue,
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
  it('keeps police extras enabled but optional (do not block enregistrement)', () => {
    const schema = completePresetSchema()
    const required = requiredEnabledFields(schema).map((f) => f.id)
    for (const key of ['passport_photo', 'first_name', 'last_name', 'document_number']) {
      assert.ok(required.includes(key), key)
    }
    for (const key of ['profession', 'coming_from', 'going_to', 'phone']) {
      const field = schema.fields.find((f) => f.id === key)
      assert.ok(field, key)
      assert.equal(field!.enabled, true)
      assert.equal(field!.required, false)
      assert.equal(required.includes(key), false)
    }
    assert.equal(needsWebCheckin(schema), false)
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
    const profession = effective.schema.fields.find((f) => f.id === 'profession')
    assert.ok(profession)
    assert.equal(profession!.enabled, true)
    assert.equal(profession!.required, false)
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

  it('rejects a configuration that exceeds the completion short_text bank', () => {
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
    assert.ok(result.errors.some((e) => /Extra 13|capacité|short_text|texte court/i.test(e)))
    assert.equal(
      canAddDynamicRegistrationField({
        version: 2,
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

  it('fits completion fields on a single screen and skips page B', () => {
    const extras = Array.from({ length: 10 }, (_, i) =>
      newCustomField({
        id: `f${i + 1}`,
        key: `f${i + 1}`,
        label: `F${i + 1}`,
        enabled: true,
        order: 20 + i,
      }),
    )
    const schema = {
      version: 1 as const,
      source: 'custom' as const,
      fields: [...simplePresetSchema().fields, ...extras],
    }
    const fields = dynamicFlowFields(schema)
    assert.equal(fields.length, 10)
    assert.equal(customScreenIdFor('per_traveler', 'A'), 'COMPLETE')
    assert.equal(customScreenIdFor('per_stay', 'A'), 'STAY_COMPLETE')
    assert.equal(nextCustomScreen('per_traveler', 'A', 10), null)
    assert.equal(nextCustomScreen('per_stay', 'A', 6), null)
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
    assert.equal(customScreenIdFor('per_stay', 'A'), 'STAY_COMPLETE')
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

describe('schema-aware FORM review', () => {
  it('does not block a disabled or optional first name', () => {
    const schema = screenshotHotelRegistrationSchema()
    const result = validateFormReviewFields(schema, {
      first_name: '',
      last_name: '',
      document_number: 'AB1',
      nationality: 'MA',
      birth_date: '',
      hasVerifiedPhoto: true,
    })
    assert.equal(result.ok, true)
  })

  it('blocks a required first name', () => {
    const schema = simplePresetSchema()
    const result = validateFormReviewFields(schema, {
      first_name: '',
      last_name: 'Benali',
      document_number: 'AB1',
      nationality: 'MA',
      birth_date: '1990-01-01',
      hasVerifiedPhoto: true,
    })
    assert.equal(result.ok, false)
    if (!result.ok) assert.ok(result.missing.includes('first_name'))
  })

  it('uses exact production visibility flags', () => {
    const schema = screenshotHotelRegistrationSchema()
    const flags = formScreenFlowFlags(schema)
    assert.equal(flags.first_name_visible, false)
    assert.equal(flags.last_name_visible, false)
    assert.equal(flags.birth_date_visible, true)
    assert.equal(flags.birth_date_required, false)
    assert.equal(flags.nationality_visible, true)
    assert.equal(flags.nationality_required, true)
    assert.equal(flags.document_number_visible, true)
    assert.equal(flags.document_number_required, true)
    assert.equal(flags.place_of_birth_visible, true)
    assert.equal(flags.place_of_birth_required, false)
    assert.equal(flags.document_issued_at_visible, false)
    assert.equal(flags.document_issued_on_visible, false)
    assert.equal(flags.gender_visible, false)
    assert.equal(flags.residence_country_visible, false)
    assert.equal(isLegacyFormComponentEnabled(schema, 'gender'), false)
    assert.equal(isLegacyFormComponentEnabled(schema, 'residence_country'), false)
  })

  it('sends the configured label and required marker without calling optional fields required', () => {
    const schema = screenshotHotelRegistrationSchema()
    const nationality = formReviewControlFlags(schema, 'nationality', 'fr')
    assert.equal(nationality.required, true)
    assert.ok(nationality.label.includes('*'))
    const birth = formReviewControlFlags(schema, 'birth_date', 'fr')
    assert.equal(birth.required, false)
    assert.equal(birth.label.includes('*'), false)
    assert.equal(birth.showDate, true)
  })

  it('does not put disabled FORM fields on the save patch', () => {
    const schema = screenshotHotelRegistrationSchema()
    const patch = pickEnabledFormMemberPatch(schema, {
      first_name: 'Amine',
      last_name: 'Benali',
      nationality: 'MA',
      document_number: 'AB1',
      birth_date: '1990-01-01',
      document_issued_at: 'Bangalore',
    })
    assert.equal(patch.first_name, undefined)
    assert.equal(patch.last_name, undefined)
    assert.equal(patch.document_issued_at, undefined)
    assert.equal(patch.nationality, 'MA')
    assert.equal(patch.document_number, 'AB1')
    assert.equal('gender' in patch, false)
  })

  it('requires verified photo only when passport photo is required', () => {
    const required = screenshotHotelRegistrationSchema()
    assert.equal(isPassportPhotoRequired(required), true)
    const noPhoto = validateFormReviewFields(required, {
      document_number: 'AB1',
      nationality: 'MA',
      hasVerifiedPhoto: false,
    })
    assert.equal(noPhoto.ok, false)
    const disabled = {
      version: 1 as const,
      source: 'custom' as const,
      fields: simplePresetSchema().fields.map((f) =>
        f.id === 'passport_photo' ? { ...f, enabled: false, required: false } : f,
      ),
    }
    assert.equal(isPassportPhotoEnabled(disabled), false)
    const skipped = validateFormReviewFields(disabled, {
      first_name: 'Amine',
      last_name: 'Benali',
      document_number: 'AB1',
      nationality: 'MA',
      birth_date: '1990-01-01',
      hasVerifiedPhoto: false,
    })
    assert.equal(skipped.ok, true)
  })

  it('navigates the production schema FORM → COMPLETE with required extras', () => {
    const schema = screenshotHotelRegistrationSchema()
    assert.equal(nextScreenAfterFormSave(schema, 0, 1), 'COMPLETE')
    const traveler = dynamicFlowFieldsForScope(schema, 'per_traveler')
    assert.deepEqual(
      traveler.map((f) => f.label),
      [
        'Profession',
        'Lieu de provenance',
        'Allant à',
        'Téléphone',
        'Nouvelle question',
        'Domicile habituel',
        'Ville',
      ],
    )
    const pageA = slotBindingsForPage(traveler, 'A').filter((s) => s.field)
    const pageB = slotBindingsForPage(traveler, 'B').filter((s) => s.field)
    assert.equal(pageA.length, 5)
    assert.equal(pageB.length, 2)
    const profession = buildSlotFlowData({ slot: 1, field: traveler[0]! })
    assert.equal(profession.slot_1_show_short_text, true)
    assert.equal(profession.slot_1_short_text_required, true)
    assert.ok(String(profession.slot_1_label).includes('*'))
    assert.equal(String(profession.slot_1_label).includes('optional'), false)
    const timeQ = buildSlotFlowData({ slot: 5, field: traveler[4]! })
    assert.equal(timeQ.slot_5_show_time, true)
    assert.equal(timeQ.slot_5_time_required, true)
    assert.ok(String(timeQ.slot_5_helper).includes('HH:MM'))
    const domicile = buildSlotFlowData({ slot: 6, field: traveler[5]! })
    assert.equal(domicile.slot_6_short_text_required, false)
    assert.equal(String(domicile.slot_6_label).includes('*'), false)
    const city = buildSlotFlowData({ slot: 7, field: traveler[6]! })
    assert.equal(city.slot_7_short_text_required, true)
    assert.equal(emptySlotFlowData(8).slot_8_active, false)
    assert.equal(emptySlotFlowData(8).slot_8_show_short_text, false)
    assert.equal(nextCustomScreen('per_traveler', 'A', traveler.length), null)
    assert.equal(nextCustomScreen('per_traveler', 'B', traveler.length), null)
    assert.equal(coerceAndValidateFlowAnswer(traveler[4]!, '').ok, false)
    assert.equal(coerceAndValidateFlowAnswer(traveler[4]!, '08:30').ok, true)
    assert.equal(coerceAndValidateFlowAnswer(traveler[5]!, '').ok, true)
    assert.equal(coerceAndValidateFlowAnswer(traveler[6]!, '').ok, false)
    const mappedB = mapSlotAnswersFromFlowData({
      fields: traveler,
      page: 'B',
      data: { slot_6_short_text: '', slot_7_short_text: 'Casablanca' },
    })
    assert.equal(mappedB.ok, true)
    const diag = registrationNavigationDiagnostics(schema, {
      reservationId: 'res-1',
      listingId: 'listing-1',
      origin: 'listing',
      override: true,
    })
    assert.deepEqual(diag.formVisibilityFlags, {
      document_type_visible: false,
      first_name_visible: false,
      last_name_visible: false,
      birth_date_visible: true,
      nationality_visible: true,
      document_number_visible: true,
      issuing_country_visible: false,
      place_of_birth_visible: true,
      document_issued_at_visible: false,
      document_issued_on_visible: false,
      document_expiry_date_visible: false,
      gender_visible: false,
      residence_country_visible: false,
    })
    assert.equal(diag.selectedNextScreen, 'COMPLETE')
    assert.equal(nextScreenAfterFormSave(simplePresetSchema(), 0, 1), 'LIST_REFRESH')
    assert.equal(nextScreenAfterFormSave(completePresetSchema(), 0, 1), 'COMPLETE')
  })

  it('keeps a listing override with disabled names instead of falling back to simple', () => {
    const override = screenshotHotelRegistrationSchema()
    const fromState = schemaFromFlowState({
      registrationLevel: 'simple',
      registrationForm: { schema: override, origin: 'listing', override: true },
    })
    assert.equal(fromState.source, 'custom')
    assert.equal(fromState.fields.find((f) => f.id === 'first_name')?.enabled, false)
    assert.equal(formScreenFlowFlags(fromState).first_name_visible, false)
    const inherited = resolveEffectiveRegistrationForm({
      listingGestion: {},
      ownerGestion: { registrationFormSchema: override },
    })
    assert.equal(inherited.origin, 'owner')
    const listing = resolveEffectiveRegistrationForm({
      listingGestion: {
        registrationFormOverride: true,
        registrationFormSchema: override,
      },
      ownerGestion: { registrationFormSchema: simplePresetSchema() },
    })
    assert.equal(listing.origin, 'listing')
    assert.equal(listing.schema.fields.find((f) => f.id === 'first_name')?.enabled, false)
  })

  it('keeps DatePicker renderable when OCR date is empty or malformed', () => {
    assert.equal(sanitizeFlowDateValue('1990-07-15'), '1990-07-15')
    assert.equal(sanitizeFlowDateValue('15/07/1990'), '')
    assert.equal(sanitizeFlowDateValue(''), '')
    const birth = formReviewControlFlags(screenshotHotelRegistrationSchema(), 'birth_date')
    assert.equal(birth.visible, true)
    assert.equal(birth.showDate, true)
  })

  it('labels passport photo as a document upload, not short_text', () => {
    const photo = simplePresetSchema().fields.find((f) => f.id === 'passport_photo')
    assert.ok(photo)
    assert.equal(registrationFieldTypeLabel(photo!), 'photo/document')
  })

  it('restores visible traveler answers when reopening registration', () => {
    const schema = screenshotHotelRegistrationSchema()
    const nationality = schema.fields.find((f) => f.id === 'nationality')!
    const profession = schema.fields.find((f) => f.id === 'profession')!
    const member = { nationality: 'india', document_number: 'Z0000000' }
    assert.equal(fieldValueForTraveler(nationality, member), 'india')
    assert.equal(
      fieldValueForTraveler(profession, member, { profession: 'Engineer' }),
      'Engineer',
    )
  })
})
