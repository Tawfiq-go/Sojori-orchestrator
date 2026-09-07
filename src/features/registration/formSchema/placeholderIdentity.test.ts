import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isGeneratedPlaceholderName, isAnswerFilled } from './answers'

test('11. dashboard does not mark traveler complete from placeholder / contract-only names', () => {
  assert.equal(isGeneratedPlaceholderName('Voyageur1'), true)
  assert.equal(isGeneratedPlaceholderName('Traveler 1'), true)
  assert.equal(isAnswerFilled('Voyageur 1'), false)
  assert.equal(isAnswerFilled('Marius'), true)
  assert.equal(isAnswerFilled(''), false)
})
