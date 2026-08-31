/**
 * Owner-facing registration editor behaviour — pure helpers + JSX source contracts.
 * Avoids mounting the full MUI editor (auth/API).
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  OWNER_CUSTOM_QUESTION_LIMIT,
  canAddCustomQuestion,
  customQuestionLimitError,
  fieldsForOwnerCompletionTab,
  fieldsForOwnerPassportTab,
  inheritanceStatusLabel,
  newCustomField,
  ownerFacingSourceBadge,
  parseRegistrationFormSchemaStrict,
  simplePresetSchema,
  completePresetSchema,
  registrationCapacityReport,
  buildRegistrationFormSnapshot,
  shouldKeepRegistrationSnapshot,
  registrationSchemaFingerprint,
} from '../registration/formSchema'

const here = path.dirname(fileURLToPath(import.meta.url))
const editorSource = fs.readFileSync(path.join(here, 'RegistrationFormEditor.tsx'), 'utf8')

describe('RegistrationFormEditor owner UI contracts', () => {
  it('owner sees the two friendly tabs and no technical capacity jargon in default markup', () => {
    assert.match(editorSource, /Informations du passeport/)
    assert.match(editorSource, /Compléter l’enregistrement/)
    assert.match(editorSource, /owner-registration-tabs/)
    assert.doesNotMatch(editorSource, /28\/50 composants/)
    assert.match(editorSource, /isAdmin && advancedOpen/)
    assert.match(editorSource, /formatCapacityCounter\(cap\.passport\)/)
    assert.match(editorSource, /passport-tab-help/)
    assert.match(editorSource, /Ces informations sont lues automatiquement sur le passeport/)
    assert.doesNotMatch(
      editorSource.match(/data-testid="passport-tab-help"[\s\S]*?<\/Alert>/)?.[0] || '',
      /\bOCR\b|short_text|composants/,
    )
  })

  it('owner sees WhatsApp vs Obligatoire as independent switches', () => {
    assert.match(editorSource, /label=\{<Typography sx=\{\{ fontSize: 11 \}\}>WhatsApp<\/Typography>\}/)
    assert.match(editorSource, /label=\{<Typography sx=\{\{ fontSize: 11 \}\}>Obligatoire<\/Typography>\}/)
    assert.doesNotMatch(editorSource, />Active</)
    assert.match(editorSource, /ownerFacingFieldStatusLine/)
    assert.match(
      editorSource,
      /n° d’entrée au Maroc peut être sur WhatsApp sans être obligatoire/,
    )
  })

  it('owner never sees Override annonce / Revenir au formulaire owner wording', () => {
    assert.doesNotMatch(editorSource, /Override annonce/)
    assert.doesNotMatch(editorSource, /Revenir au formulaire owner/)
    assert.match(editorSource, /Personnalisé pour ce logement/)
    assert.match(editorSource, /Revenir aux réglages du propriétaire/)
  })

  it('owner custom limit is four; fifth rejected by helper used by UI', () => {
    let schema = simplePresetSchema()
    for (let i = 0; i < OWNER_CUSTOM_QUESTION_LIMIT; i++) {
      assert.equal(canAddCustomQuestion(schema, 'owner').ok, true)
      schema = {
        ...schema,
        fields: [
          ...schema.fields,
          newCustomField({ id: `ui${i}`, key: `ui${i}`, label: `Q${i}`, enabled: true }),
        ],
      }
    }
    const fifth = canAddCustomQuestion(schema, 'owner')
    assert.equal(fifth.ok, false)
    assert.equal(fifth.reason, customQuestionLimitError('owner'))
    assert.match(editorSource, /Questions personnalisées :/)
  })

  it('admin advanced mode markup exposes technical mappings separately', () => {
    assert.match(editorSource, /Mode avancé \(admin\)/)
    assert.match(editorSource, /toggle-advanced/)
    assert.match(editorSource, /ocr=\$\{field\.ocrProperty\}/)
  })

  it('passport vs completion placement matches WhatsApp screens', () => {
    const schema = completePresetSchema()
    const passport = fieldsForOwnerPassportTab(schema)
    const completion = fieldsForOwnerCompletionTab(schema)
    assert.ok(passport.some((f) => f.binding === 'nationality'))
    assert.equal(ownerFacingSourceBadge(passport[0]!), 'Lu sur le passeport')
    assert.ok(completion.every((f) => ownerFacingSourceBadge(f) === 'À renseigner par le voyageur'))
    assert.equal(registrationCapacityReport(schema).ok, true)
  })

  it('inheritance labels match owner wording', () => {
    assert.equal(
      inheritanceStatusLabel({ ownerMode: false, override: false, origin: 'owner' }),
      'Configuration du propriétaire',
    )
  })

  it('unsupported OCR mapping still rejected by strict parse', () => {
    const bad = parseRegistrationFormSchemaStrict({
      version: 2,
      fields: [
        {
          ...simplePresetSchema().fields[0],
          id: 'city',
          key: 'city',
          kind: 'builtin',
          binding: 'city',
          label: 'Ville',
          type: 'short_text',
          enabled: true,
          required: true,
          scope: 'per_traveler',
          screen: 'passport',
          valueSource: 'ocr',
          ocrProperty: 'issuing_country',
        },
      ],
    })
    assert.equal(bad.ok, false)
    assert.ok(bad.errors.some((e) => /intégré|OCR|lié/i.test(e)))
  })

  it('disabled fields stay out of capacity-enabled placement tabs when filtered by callers', () => {
    const schema = {
      ...simplePresetSchema(),
      fields: simplePresetSchema().fields.map((f) =>
        f.binding === 'profession' ? { ...f, enabled: false } : f,
      ),
    }
    const completion = fieldsForOwnerCompletionTab(schema).filter((f) => f.enabled !== false)
    assert.equal(completion.some((f) => f.binding === 'profession'), false)
  })

  it('reset registration attempt uses latest schema; active attempt keeps frozen fingerprint', () => {
    const olderForm = {
      schema: simplePresetSchema(),
      origin: 'listing' as const,
      override: true,
      registrationLevel: 'simple' as const,
    }
    const newerForm = {
      schema: completePresetSchema(),
      origin: 'listing' as const,
      override: true,
      registrationLevel: 'complete' as const,
    }
    const active = buildRegistrationFormSnapshot(olderForm, 'reg_active')
    assert.equal(
      shouldKeepRegistrationSnapshot({
        cached: active,
        guests: [{ done: false }],
        members: [{ first_name: 'Ada' }],
      }),
      true,
    )
    assert.equal(active.schemaFingerprint, registrationSchemaFingerprint(olderForm.schema))

    const reset = buildRegistrationFormSnapshot(newerForm, 'reg_reset')
    assert.equal(reset.schemaFingerprint, registrationSchemaFingerprint(newerForm.schema))
    assert.notEqual(active.schemaFingerprint, reset.schemaFingerprint)
  })
})
