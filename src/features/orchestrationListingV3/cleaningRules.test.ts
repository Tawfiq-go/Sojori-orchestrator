import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mergeCleaningRulesPatch, typeFlags } from './cleaningRules'

describe('cleaningRules UI merge', () => {
  it('defaults then type override', () => {
    const rules = mergeCleaningRulesPatch(undefined, {
      statusAccept: 'listing',
      defaults: { autoAccept: true, autoStart: false },
      types: { cleaning_stay: { autoStart: true } },
    })
    assert.deepEqual(typeFlags(rules, 'cleaning_express'), { autoAccept: true, autoStart: false })
    assert.deepEqual(typeFlags(rules, 'cleaning_stay'), { autoAccept: true, autoStart: true })
  })

  it('partial patch keeps the rest', () => {
    const base = mergeCleaningRulesPatch(undefined, {
      statusAccept: 'listing',
      defaults: { autoAccept: true, autoStart: false },
      types: { cleaning_deep: { autoStart: false } },
      autoGenerate: true,
    })
    const next = mergeCleaningRulesPatch(base, { types: { cleaning_deep: { autoStart: true } } })
    assert.equal(next.statusAccept, 'listing')
    assert.equal(next.autoGenerate, true)
    assert.equal(next.types?.cleaning_deep?.autoStart, true)
  })
})
