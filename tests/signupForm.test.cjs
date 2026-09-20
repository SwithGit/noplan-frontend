const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
// Exercise the actual form handlers with deterministic hooks and mocked APIs.
// No browser, SMS, credentials or production account is used.
function harness(props = {}, overrides = {}) {
  let cursor = 0, dirty = true, tree, now = Date.now();
  const slots = [], effects = [], timers = new Map(), calls = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
  const react = {
    useState(initial) { const i = cursor++; if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, value => { slots[i].value = typeof value === 'function' ? value(slots[i].value) : value; dirty = true; }]; },
    useRef(value) { const i = cursor++; return slots[i] ?? (slots[i] = { current: value }); },
    useEffect(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) { const old = slots[i]; slots[i] = { deps }; effects.push(() => { old?.cleanup?.(); slots[i].cleanup = fn(); }); } },
  };
  const options = { available: true, phoneAvailable: true, policyVersion: 'v1', documents: { terms: 'https://example.com/terms', privacy: 'https://example.com/privacy', marketing: '' } };
  const api = { getSignupOptions: async () => options, checkSignupId: async () => ({ available: true }), sendSignupCode: async () => ({ challengeId: 'challenge', expiresAt: now + 180000, retryAt: now + 60000 }), verifySignupCode: async () => ({ phoneToken: 'proof', expiresAt: now + 600000 }), completeSignup: async (body, provider) => { calls.push({ body, provider }); return { user: { id: 'new-user' } }; }, ...overrides };
  const runtime = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: 'fragment' };
  const dependencies = { react, 'react/jsx-runtime': runtime, 'react-router-dom': { Link: 'a', useNavigate: () => () => {} }, '../../api/signupApi': api, '../../api/client': { storeLoggedInUser() {} }, '../../components/ui/DesktopNav': { DesktopNav: 'nav' }, '../../i18n/LanguageSelect': { LanguageSelect: 'locale' }, '../../i18n/locale': { useLocale() {} }, '../../i18n/translate': { t: value => value }, '../../routes': { ROUTES: { appHome: '/app', login: '/app/login' } } };
  const win = { location: { assign: url => calls.push({ redirect: url }) }, setInterval: fn => { const id = Symbol(); timers.set(id, fn); return id; } };
  const box = { exports: {}, require: name => { if (name.endsWith('.css') || name.endsWith('.png')) return ''; if (!(name in dependencies)) throw new Error(name); return dependencies[name]; }, Date: class extends Date { static now() { return now; } }, window: win, clearInterval: id => timers.delete(id), document: { activeElement: { focus() {} } } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/pages/auth/SignupForm.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, box);
  async function flush() { for (let i = 0; i < 20; i++) { if (dirty) { cursor = 0; dirty = false; tree = box.exports.SignupForm(props); while (effects.length) effects.shift()(); } await Promise.resolve(); } }
  const nodes = () => { const result = []; function walk(node) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(walk); result.push(node); walk(node.props?.children); } walk(tree); return result; };
  const text = node => node == null ? '' : Array.isArray(node) ? node.map(text).join('') : typeof node === 'object' ? text(node.props?.children) : String(node);
  const find = id => nodes().find(n => n.props?.id === id);
  return { calls, options, nodes, find, flush,
    async fill(id, value) { const node = find(id); assert.ok(node, id); node.props.onChange({ target: { value } }); await flush(); },
    async click(label) { const node = nodes().find(n => n.type === 'button' && text(n) === label); assert.ok(node, label); assert.ok(!node.props.disabled, label + ' disabled'); node.props.onClick(); await flush(); },
    async agree() { const node = nodes().find(n => n.type === 'input' && n.props.type === 'checkbox'); assert.ok(!node.props.disabled); node.props.onChange({ target: { checked: true } }); await flush(); },
    async submit() { nodes().find(n => n.type === 'form').props.onSubmit({ preventDefault() {} }); await flush(); },
    async advance(ms) { now += ms; for (const fn of timers.values()) fn(); await flush(); },
  };
}

test('social signup prefills available data and omits local account/password fields', async () => {
  const client = harness({ provider: 'google', profile: { name: 'Alex', email: 'a@example.com', nickname: 'Alex' }, registrationToken: 'registration' });
  await client.flush(); assert.equal(client.find('signup-id'), undefined);
  assert.equal(client.nodes().filter(n => n.props?.name === 'signup-password').length, 0);
  assert.equal(client.find('signup-name').props.value, 'Alex'); assert.equal(client.find('signup-email').props.value, 'a@example.com');
});

test('changing username while duplicate check is pending cannot approve a different username', async () => {
  let resolve;
  const client = harness({}, { checkSignupId: () => new Promise(done => { resolve = done; }) });
  await client.flush(); await client.fill('signup-id', 'first'); await client.click('중복 확인');
  await client.fill('signup-id', 'second'); resolve({ available: true }); await client.flush(); await client.submit();
  assert.equal(client.calls.length, 0);
  assert.ok(client.nodes().some(n => n.props?.role === 'alert' && n.props.children === '아이디 중복 확인을 해 주세요.'));
});

test('verified social signup stores consent but never submits a password confirmation or forces travel style', async () => {
  const client = harness({ provider: 'google', profile: { name: 'Alex', email: 'a@example.com', nickname: 'Alex' }, registrationToken: 'registration' });
  await client.flush(); await client.fill('signup-phone', '01012345678'); await client.click('인증번호 받기');
  await client.fill('signup-code', '123456'); await client.click('인증 확인'); await client.agree(); await client.submit();
  assert.equal(client.calls[0].body.phoneToken, 'proof'); assert.equal(client.calls[0].body.agreements.marketing, false);
  assert.equal(client.calls[0].body.pw, undefined); assert.equal('confirm' in client.calls[0].body, false); assert.equal('travelStyle' in client.calls[0].body, false);
  assert.equal(client.calls[0].provider, 'google'); assert.equal(client.calls[1].redirect, '/app');
});

test('changing a verified phone or waiting past its deadline prevents signup', async () => {
  for (const change of ['number', 'expiry']) {
    const client = harness({ provider: 'google', registrationToken: 'registration' }); await client.flush();
    await client.fill('signup-phone', '01012345678'); await client.click('인증번호 받기'); await client.fill('signup-code', '123456'); await client.click('인증 확인'); await client.agree();
    if (change === 'number') await client.fill('signup-phone', '01099999999'); else await client.advance(600001);
    await client.submit(); assert.equal(client.calls.length, 0);
  }
});

test('missing configuration keeps actual signup and SMS actions disabled', async () => {
  const client = harness({}, { getSignupOptions: async () => ({ available: false, phoneAvailable: false, documents: { terms: '', privacy: '', marketing: '' } }) });
  await client.flush(); assert.equal(client.nodes().find(n => n.type === 'button' && n.props.type === 'submit').props.disabled, true);
  await client.fill('signup-phone', '01012345678');
  assert.equal(client.nodes().find(n => n.type === 'button' && n.props.children === '인증번호 받기').props.disabled, true);
});
