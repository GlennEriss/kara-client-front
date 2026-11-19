import assert from 'node:assert/strict'
import test from 'node:test'
import { birthdayFields, planMember } from '../reconcile-imported-birthdays.mjs'

const user = { matricule: 'TEST.MK.1', birthDate: '1990-05-15', isMigrated: true, dateShiftFixedAt: { seconds: 1 } }
const request = { matricule: 'TEST.MK.1', identity: { birthDate: '1990-05-14' }, isMigrated: true }
const reference = { birthDate: '1990-05-14', row: 7 }

test('repairs only the exact legacy J+1 confirmed by both sources', () => {
  assert.deepEqual(planMember(user, request, reference), { reason: 'repair', birthDate: '1990-05-14', birthMonth: 5, birthDay: 14, birthDayOfYear: 134, sourceRow: 7 })
})
test('does not modify ordinary registrations, unmarked imports, or missing birthdays', () => {
  assert.equal(planMember({ ...user, isMigrated: false }, request, reference).reason, 'not-imported')
  assert.equal(planMember({ ...user, dateShiftFixedAt: undefined }, request, reference).reason, 'no-legacy-shift-marker')
  assert.equal(planMember({ ...user, birthDate: '' }, request, reference).reason, 'missing-birthdate')
})
test('excludes missing, different-member, nonimported or discordant dossiers', () => {
  assert.equal(planMember(user, undefined, reference).reason, 'unconfirmed-dossier')
  assert.equal(planMember(user, { ...request, matricule: 'OTHER' }, reference).reason, 'unconfirmed-dossier')
  assert.equal(planMember(user, { ...request, isMigrated: false }, reference).reason, 'unconfirmed-dossier')
  assert.equal(planMember(user, { ...request, identity: { birthDate: '1957-05-14' } }, reference).reason, 'dossier-workbook-conflict')
})
test('excludes missing workbook records and impossible calendar dates', () => {
  assert.equal(planMember(user, request, undefined).reason, 'missing-workbook-reference')
  assert.equal(planMember(user, request, { birthDate: '1990-04-31', row: 7 }).reason, 'invalid-workbook-reference')
  for (const date of ['1990-02-29', 'invalid', '1990-05-14T23:00:00Z', '', null]) assert.equal(birthdayFields(date), null)
})
test('is idempotent and preserves edits that differ by more than one day', () => {
  assert.equal(planMember({ ...user, birthDate: reference.birthDate }, request, reference).reason, 'already-aligned')
  assert.equal(planMember({ ...user, birthDate: '1990-05-16' }, request, reference).reason, 'not-exactly-one-day-later')
})
test('handles year/month boundaries and leap years using calendar dates', () => {
  assert.deepEqual(birthdayFields('2000-02-29'), { birthMonth: 2, birthDay: 29, birthDayOfYear: 60 })
  assert.equal(birthdayFields('2000-12-31').birthDayOfYear, 366)
  assert.equal(birthdayFields('1990-12-31').birthDayOfYear, 365)
  assert.equal(planMember({ ...user, birthDate: '1991-01-01' }, { ...request, identity: { birthDate: '1990-12-31' } }, { birthDate: '1990-12-31', row: 9 }).reason, 'repair')
})
