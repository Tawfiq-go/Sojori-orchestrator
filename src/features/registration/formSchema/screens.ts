import { enabledFields } from './completeness'
import { PASSPORT_OCR_PROPERTIES } from './builtinCatalog'
import {
  completionFieldsForTraveler,
  fieldScreen,
  isDedicatedPassportField,
} from './componentBudget'
import type {
  PassportOcrProperty,
  RegistrationFieldDef,
  RegistrationFormSchema,
  RegistrationScreenPlacement,
  RegistrationValueSource,
} from './types'

export type RegistrationFlowInfoScreenId = 'FORM' | 'COMPLETE' | 'STAY_COMPLETE' | 'LIST_REFRESH'

export function defaultScreenForField(
  field: Pick<RegistrationFieldDef, 'kind' | 'binding' | 'scope' | 'screen' | 'valueSource' | 'ocrProperty'>,
): RegistrationScreenPlacement {
  if (field.binding === 'passport_photo' || field.screen === 'upload') return 'upload'
  if (field.valueSource === 'ocr' || (field.ocrProperty && (PASSPORT_OCR_PROPERTIES as readonly string[]).includes(field.ocrProperty))) {
    return 'passport'
  }
  if (field.screen === 'passport' || field.screen === 'completion') {
    return field.screen
  }
  if (field.kind === 'builtin' && field.binding && (PASSPORT_OCR_PROPERTIES as readonly string[]).includes(field.binding)) {
    return 'passport'
  }
  return 'completion'
}

export function defaultValueSourceForField(
  field: Pick<RegistrationFieldDef, 'kind' | 'binding' | 'valueSource' | 'ocrProperty'>,
): RegistrationValueSource {
  if (field.valueSource === 'manual' || field.valueSource === 'ocr') return field.valueSource
  if (field.ocrProperty && (PASSPORT_OCR_PROPERTIES as readonly string[]).includes(field.ocrProperty)) {
    return 'ocr'
  }
  if (field.kind === 'builtin' && field.binding && (PASSPORT_OCR_PROPERTIES as readonly string[]).includes(field.binding)) {
    return 'ocr'
  }
  return 'manual'
}

export function effectiveOcrProperty(
  field: Pick<RegistrationFieldDef, 'kind' | 'binding' | 'valueSource' | 'ocrProperty'>,
): PassportOcrProperty | undefined {
  const source = defaultValueSourceForField(field)
  if (source !== 'ocr') return undefined
  if (field.ocrProperty && (PASSPORT_OCR_PROPERTIES as readonly string[]).includes(field.ocrProperty)) {
    return field.ocrProperty
  }
  if (field.kind === 'builtin' && field.binding && (PASSPORT_OCR_PROPERTIES as readonly string[]).includes(field.binding)) {
    return field.binding as PassportOcrProperty
  }
  return undefined
}

export function shouldShowCompletionScreen(
  schema: RegistrationFormSchema,
  travelerIndex: number,
  travelerCount: number,
): boolean {
  return completionFieldsForTraveler(schema, travelerIndex, travelerCount).length > 0
}

export function nextScreenAfterFormSave(
  schema: RegistrationFormSchema,
  travelerIndex = 0,
  travelerCount = 1,
): 'COMPLETE' | 'LIST_REFRESH' {
  return shouldShowCompletionScreen(schema, travelerIndex, travelerCount)
    ? 'COMPLETE'
    : 'LIST_REFRESH'
}

export function stayCompletionFields(schema: RegistrationFormSchema): RegistrationFieldDef[] {
  return enabledFields(schema).filter((f) => fieldScreen(f) === 'completion' && f.scope === 'per_stay')
}

export function shouldShowStayCompletionScreen(schema: RegistrationFormSchema): boolean {
  return stayCompletionFields(schema).length > 0
}

export function passportInfoFields(schema: RegistrationFormSchema): RegistrationFieldDef[] {
  return enabledFields(schema).filter(
    (f) => fieldScreen(f) === 'passport' && f.binding !== 'passport_photo',
  )
}

export function isOcrBoundField(field: RegistrationFieldDef): boolean {
  return defaultValueSourceForField(field) === 'ocr' && Boolean(effectiveOcrProperty(field))
}

export function dedicatedPassportFieldForProperty(
  schema: RegistrationFormSchema,
  prop: PassportOcrProperty,
): RegistrationFieldDef | null {
  return (
    passportInfoFields(schema).find(
      (f) => isDedicatedPassportField(f) && (f.ocrProperty || f.binding) === prop,
    ) ?? null
  )
}
