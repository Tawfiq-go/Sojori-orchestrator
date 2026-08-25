import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  ADMIN_CUSTOM_QUESTION_LIMIT,
  OWNER_CUSTOM_QUESTION_LIMIT,
  canAddCustomQuestion,
  countEnabledCustomQuestions,
  customQuestionCountErrors,
  customQuestionLimitError,
  fieldsForOwnerCompletionTab,
  fieldsForOwnerPassportTab,
  inheritanceStatusLabel,
  newCustomField,
  ownerFacingSourceBadge,
  parseRegistrationFormSchemaStrict,
  simplePresetSchema,
  completePresetSchema,
  builtinField,
} from './index'

describe('owner registration experience', () => {
  it('owner can add up to four custom questions then is rejected', () => {
    let schema = simplePresetSchema()
    for (let i = 0; i < OWNER_CUSTOM_QUESTION_LIMIT; i++) {
      const check = canAddCustomQuestion(schema, 'owner')
      assert.equal(check.ok, true, check.reason)
      schema = {
        ...schema,
        fields: [
          ...schema.fields,
          newCustomField({
            id: `q${i}`,
            key: `q${i}`,
            label: `Q${i}`,
            screen: 'completion',
            valueSource: 'manual',
            enabled: true,
          }),
        ],
      }
    }
    assert.equal(countEnabledCustomQuestions(schema), 4)
    const fifth = canAddCustomQuestion(schema, 'owner')
    assert.equal(fifth.ok, false)
    assert.equal(fifth.reason, customQuestionLimitError('owner'))
  })

  it('admin can add more than an owner, up to the admin limit', () => {
    let schema = simplePresetSchema()
    for (let i = 0; i < OWNER_CUSTOM_QUESTION_LIMIT + 1; i++) {
      assert.equal(canAddCustomQuestion(schema, 'admin').ok, true)
      schema = {
        ...schema,
        fields: [
          ...schema.fields,
          newCustomField({
            id: `aq${i}`,
            key: `aq${i}`,
            label: `AQ${i}`,
            screen: 'completion',
            enabled: true,
          }),
        ],
      }
    }
    assert.ok(countEnabledCustomQuestions(schema) > OWNER_CUSTOM_QUESTION_LIMIT)
    while (countEnabledCustomQuestions(schema) < ADMIN_CUSTOM_QUESTION_LIMIT) {
      const i = countEnabledCustomQuestions(schema)
      assert.equal(canAddCustomQuestion(schema, 'admin').ok, true)
      schema = {
        ...schema,
        fields: [
          ...schema.fields,
          newCustomField({
            id: `aqx${i}`,
            key: `aqx${i}`,
            label: `AQx${i}`,
            screen: 'completion',
            enabled: true,
          }),
        ],
      }
    }
    assert.equal(canAddCustomQuestion(schema, 'admin').ok, false)
    assert.match(String(canAddCustomQuestion(schema, 'admin').reason), /10/)
  })

  it('strict parse rejects more than admin custom ceiling (backend)', () => {
    const fields = [
      ...simplePresetSchema().fields,
      ...Array.from({ length: ADMIN_CUSTOM_QUESTION_LIMIT + 1 }, (_, i) =>
        newCustomField({
          id: `overflow${i}`,
          key: `overflow${i}`,
          label: `O${i}`,
          enabled: true,
          screen: 'completion',
        }),
      ),
    ]
    const parsed = parseRegistrationFormSchemaStrict({ version: 2, fields })
    assert.equal(parsed.ok, false)
    assert.ok(parsed.errors.some((e) => /questions personnalisées/i.test(e)))
    assert.ok(customQuestionCountErrors({ version: 2, fields }, 4).length > 0)
  })

  it('places passport OCR fields on passport tab and manual on completion', () => {
    const schema = completePresetSchema()
    const passport = fieldsForOwnerPassportTab(schema)
    const completion = fieldsForOwnerCompletionTab(schema)
    assert.ok(passport.some((f) => f.binding === 'document_number'))
    assert.ok(passport.every((f) => f.binding !== 'profession'))
    assert.ok(completion.some((f) => f.binding === 'profession' || f.binding === 'city'))
    assert.ok(completion.every((f) => f.valueSource !== 'ocr'))
  })

  it('uses friendly source badges without OCR terminology', () => {
    const nationality = builtinField('nationality', { enabled: true })
    const profession = builtinField('profession', { enabled: true })
    assert.equal(ownerFacingSourceBadge(nationality), 'Lu sur le passeport')
    assert.equal(ownerFacingSourceBadge(profession), 'À renseigner par le voyageur')
    assert.doesNotMatch(ownerFacingSourceBadge(nationality), /OCR|slot|short_text/i)
  })

  it('formats inheritance labels for owners', () => {
    assert.equal(
      inheritanceStatusLabel({ ownerMode: true, override: false, origin: 'owner' }),
      'Configuration du propriétaire',
    )
    assert.equal(
      inheritanceStatusLabel({ ownerMode: false, override: true, origin: 'listing' }),
      'Configuration personnalisée pour ce logement',
    )
    assert.equal(
      inheritanceStatusLabel({ ownerMode: false, override: false, origin: 'owner' }),
      'Configuration du propriétaire',
    )
  })
})
