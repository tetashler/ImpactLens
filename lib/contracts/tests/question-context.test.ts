import test from 'node:test';
import assert from 'node:assert/strict';

const api = await import('../../question-simulation/context.ts').catch(() => null);

test('local questions keep Singapore context provisional when the country is not explicitly named', () => {
  assert.ok(api, 'question scope contract is required');
  for (const question of ['Add an MRT line in Singapore', 'Build a polyclinic in Singapore', 'What if we built a park in Tampines?', 'What if a community facility opens in Tampines?']) {
    const context = api.classifyQuestionContext(question);
    assert.equal(context.scope, 'local');
    assert.equal(context.primaryJurisdiction?.id, 'SG');
    assert.equal(context.relevantJurisdictions.some(j => j.id === 'MY'), false);
    assert.ok(context.candidateEntityTypes.includes('residents'));
    assert.deepEqual(api.parseQuestionContext(JSON.parse(JSON.stringify(context))), context);
  }
  assert.equal(api.classifyQuestionContext('Build a park in Tampines').primaryJurisdiction?.provenance, 'application-context');
  assert.equal(api.classifyQuestionContext('Build a park in Singapore').primaryJurisdiction?.provenance, 'explicit-question');
  for (const question of ['What if a neighbourhood facility opens in Tampines?', 'What if a new school opens in Tampines?', 'What if a housing estate opens in Tampines?']) {
    assert.equal(api.classifyQuestionContext(question).scope, 'local');
    assert.equal(api.classifyQuestionContext(question).intent, 'local-amenity');
  }
  assert.notEqual(api.classifyQuestionContext('What if a community facility opens in Malaysia?').intent, 'local-amenity');
});

test('cross-border channels identify questions for investigation instead of asserting tariff outcomes', () => {
  assert.ok(api, 'question scope contract is required');
  for (const question of ['What if Singapore increased taxes on imported goods?', 'How would shipping rules change?', 'What if foreign workers faced new rules?', 'What if company headquarters relocated?']) {
    const context = api.classifyQuestionContext(question);
    assert.equal(context.scope, 'cross-border');
    assert.equal(context.classification.confidence, 'provisional');
    assert.ok(context.unresolvedQuestions.length > 0);
    assert.equal(context.intent, 'cross-border-policy');
  }
  const taxes = api.classifyQuestionContext('What if Singapore increased taxes?');
  assert.equal(taxes.scope, 'undetermined');
  assert.equal(taxes.classification.confidence, 'provisional');
  assert.equal(api.classifyQuestionContext('What if Singapore changed a policy?').classification.confidence, 'provisional');
  assert.ok(taxes.unresolvedQuestions.some(q => /which tax|tax instrument/i.test(q)));
  const imports = api.classifyQuestionContext('What if Singapore increased taxes on imported goods?');
  assert.ok(imports.assumptions.some(a => /provisional|working interpretation/i.test(a.statement)));
  assert.ok(imports.unresolvedQuestions.some(q => /GST|tariff|excise/i.test(q)));
});

test('ASEAN scope does not invent member countries and only narrow withdrawal intent enables the demo route', () => {
  assert.ok(api, 'question scope contract is required');
  const withdrawal = api.classifyQuestionContext('What if Singapore left ASEAN?');
  assert.equal(withdrawal.scope, 'international');
  assert.equal(withdrawal.intent, 'asean-withdrawal');
  assert.equal(api.classifyQuestionContext('What if Singapore withdrew from ASEAN?').intent, 'asean-withdrawal');
  assert.equal(api.classifyQuestionContext('What if Singapore had withdrawn from ASEAN?').intent, 'asean-withdrawal');
  assert.deepEqual(withdrawal.relevantJurisdictions.map(j => j.id), ['SG', 'ASEAN']);
  for (const question of ['How can ASEAN improve healthcare?', 'What if taxes rose in ASEAN?', 'What if Singapore raised GST and left ASEAN?'])
    assert.notEqual(api.classifyQuestionContext(question).intent, 'asean-withdrawal');
  for (const question of ['What if Singapore did not leave ASEAN?', 'What if Singapore stays in ASEAN instead of leaving?', 'What does withdrawal from ASEAN mean?', 'What if Malaysia left ASEAN?'])
    assert.notEqual(api.classifyQuestionContext(question).intent, 'asean-withdrawal');
  const countries = api.classifyQuestionContext('What if Singapore changed import rules for Malaysia and China?');
  assert.deepEqual(countries.relevantJurisdictions.map(j => j.id), ['SG', 'MY', 'CN']);
  assert.equal(api.classifyQuestionContext('What would this mean for us?').relevantJurisdictions.some(j => j.id === 'US'), false);
});

test('scope outputs are content-bound frozen snapshots and reject forged scope, fields, prototypes and oversize text', () => {
  assert.ok(api, 'question scope contract is required');
  const context = api.classifyQuestionContext('Build a polyclinic in Singapore');
  assert.ok(Object.isFrozen(context) && Object.isFrozen(context.assumptions));
  assert.equal(api.classifyQuestionContext(context.question).contextIdentity, context.contextIdentity);
  assert.notEqual(api.classifyQuestionContext('Build a park in Singapore').contextIdentity, context.contextIdentity);
  for (const edit of [{ scope: 'international' }, { relevantJurisdictions: [] }, { extra: true }, { version: 2 }])
    assert.throws(() => api.parseQuestionContext({ ...context, ...edit }));
  assert.throws(() => api.parseQuestionContext(Object.assign(Object.create({ inherited: true }), context)));
  assert.throws(() => api.classifyQuestionContext('x'.repeat(2001)));
  assert.throws(() => api.classifyQuestionContext(''));
});
