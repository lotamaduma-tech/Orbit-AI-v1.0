const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { createRequire } = require('node:module');
const backend = path.join(__dirname, '../backend');
const realRequire = createRequire(path.join(backend, 'server.js'));

async function fixture(t, options = {}) {
    const db = { conversations: [], messages: [], memories: [] };
    const calls = { provider: 0, aborted: false, contexts: [], uploads: 0 };
    let seq = 0;
    function query(table) {
        let action = 'select', values, filters = [], orders = [], limit = Infinity, single = false;
        const q = {
            select() { return q; }, eq(k, v) { filters.push(row => row[k] === v); return q; },
            insert(v) { action = 'insert'; values = v; return q; }, update(v) { action = 'update'; values = v; return q; },
            delete() { action = 'delete'; return q; }, order(k, opts) { orders.push([k, opts.ascending]); return q; },
            limit(n) { limit = n; return q; }, single() { single = true; return q; }, maybeSingle() { single = true; return q; },
            then(resolve, reject) {
                return Promise.resolve().then(() => {
                    if (options.databaseError) return { data: null, error: new Error('Database unavailable') };
                    if (action === 'insert') {
                        const row = { id: 'id-' + ++seq, created_at: new Date(seq * 1000).toISOString(), updated_at: new Date(seq * 1000).toISOString(), is_pinned: false, ...values };
                        db[table].push(row); return { data: single ? row : [row], error: null };
                    }
                    let rows = db[table].filter(row => filters.every(fn => fn(row)));
                    if (action === 'delete') db[table] = db[table].filter(row => !rows.includes(row));
                    if (action === 'update') rows.forEach(row => Object.assign(row, values));
                    rows = [...rows].sort((a, b) => {
                        for (const [key, ascending] of orders) {
                            const value = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
                            if (value) return ascending ? value : -value;
                        }
                        return 0;
                    }).slice(0, limit);
                    return { data: single ? rows[0] || null : rows, error: null };
                }).then(resolve, reject);
            }
        };
        return q;
    }
    const supabase = { from: query, auth: { getUser: async token => {
        if (options.authStall) return new Promise(() => {});
        return token === 'valid' ? { data: { user: { id: 'user-a' } }, error: null } : { data: {}, error: { status: 401 } };
    } } };
    async function provider(request, { signal } = {}) {
        calls.provider++; calls.contexts.push(request.messages);
        if (options.providerError) throw new Error('Provider unavailable');
        return { async *[Symbol.asyncIterator]() {
            if (options.stall) {
                await new Promise((resolve, reject) => {
                    const abort = () => { calls.aborted = true; reject(signal.reason); };
                    if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
                });
            }
            yield { choices: [{ delta: { content: 'Hello from test provider' } }] };
            if (options.midstreamError) throw new Error('Provider stream interrupted');
        } };
    }
    class Groq { constructor() { this.chat = { completions: { create: provider } }; } }
    class OpenAI { constructor() {
        this.images = { generate: async (_request, { signal }) => { signal.throwIfAborted(); return { data: [{ b64_json: 'aW1hZ2U=' }] }; } };
        this.responses = { create: async (_request, { signal }) => { signal.throwIfAborted(); return { output_text: 'image description' }; } };
    } }
    const multerReal = realRequire('multer');
    function multer(...args) {
        const upload = multerReal(...args);
        return { array: (...args) => { const fn = upload.array(...args); return (req, res, next) => { calls.uploads++; fn(req, res, next); }; },
            single: (...args) => { const fn = upload.single(...args); return (req, res, next) => { calls.uploads++; fn(req, res, next); }; } };
    }
    multer.memoryStorage = multerReal.memoryStorage;
    const fakeRequire = name => ({ dotenv: { config() {} }, 'groq-sdk': Groq, openai: OpenAI,
        '@supabase/supabase-js': { createClient: () => supabase }, multer }[name] || realRequire(name));
    const context = vm.createContext({ require: fakeRequire, module: { exports: {} }, __dirname: backend,
        process: { env: { GROQ_API_KEY: 'test', OPENAI_API_KEY: 'test', SUPABASE_URL: 'https://test.invalid',
            SUPABASE_ANON_KEY: 'test', SUPABASE_SERVICE_ROLE_KEY: 'test', ALLOWED_ORIGINS: 'https://frontend.example', REQUEST_TIMEOUT: String(options.timeout || 2000) } },
        console, AbortController, AbortSignal, DOMException, Buffer, Uint8Array, setTimeout, clearTimeout, setInterval, clearInterval,
        fetch: () => { throw new Error('Unexpected external network request in test'); } });
    vm.runInContext(fs.readFileSync(path.join(backend, 'server.js'), 'utf8'), context);
    const exports = context.module.exports;
    const server = exports.app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => { server.closeAllConnections(); server.close(); });
    const base = 'http://127.0.0.1:' + server.address().port;
    const chat = (message = 'hello', extra = {}, token = 'valid') => fetch(base + '/api/chat', {
        method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ message, ...extra })
    });
    return { db, calls, base, chat, ...exports };
}

test('real local HTTP chat emits exactly one complete, ends and persists valid response', async t => {
    const f = await fixture(t); const response = await f.chat(); const body = await response.text();
    assert.equal(response.status, 200); assert.match(body, /Hello from test provider/);
    assert.equal((body.match(/"type":"complete"/g) || []).length, 1); assert.equal((body.match(/\[DONE\]/g) || []).length, 1);
    assert.equal(f.db.messages.length, 2); assert.equal(f.db.messages[1].role, 'assistant');
});

test('authentication rejects before upload parsing and protects provider test endpoint', async t => {
    const f = await fixture(t); const response = await f.chat('hello', {}, 'invalid');
    assert.equal(response.status, 401); assert.equal(f.calls.uploads, 0); assert.equal(f.calls.provider, 0);
    assert.equal((await fetch(f.base + '/api/test-groq')).status, 401);
    const blocked = await fetch(f.base + '/api/health', { headers: { Origin: 'https://untrusted.example' } });
    assert.equal(blocked.status, 403);
});

test('provider errors end SSE without completion or assistant persistence', async t => {
    for (const option of ['providerError', 'midstreamError']) {
        const f = await fixture(t, { [option]: true }); const body = await (await f.chat()).text();
        assert.match(body, /"type":"error"/); assert.doesNotMatch(body, /"type":"complete"/);
        assert.equal(f.db.messages.filter(row => row.role === 'assistant').length, 0);
    }
});

test('overall deadline covers auth and provider stall; disconnect aborts upstream', async t => {
    const auth = await fixture(t, { authStall: true, timeout: 50 }); assert.equal((await auth.chat()).status, 504);
    const stalled = await fixture(t, { stall: true, timeout: 50 });
    const body = await (await stalled.chat()).text(); assert.match(body, /timed out/); assert.equal(stalled.calls.aborted, true);
    const disconnected = await fixture(t, { stall: true });
    const response = await disconnected.chat(); await response.body.cancel();
    await new Promise(resolve => setTimeout(resolve, 30)); assert.equal(disconnected.calls.aborted, true);
});

test('image generation uses the same completion and persistence lifecycle', async t => {
    const f = await fixture(t); const body = await (await f.chat('generate an image of a tree')).text();
    assert.match(body, /"type":"image"/); assert.equal((body.match(/"type":"complete"/g) || []).length, 1);
    assert.equal(f.db.messages[1].role, 'assistant');
});

test('latest 30 messages are chronological and ownership is preserved', async t => {
    const f = await fixture(t);
    f.db.conversations.push({ id: 'history', user_id: 'user-a' }, { id: 'other', user_id: 'user-b' });
    for (let i = 0; i < 45; i++) f.db.messages.push({ conversation_id: 'history', user_id: 'user-a', role: i % 2 ? 'assistant' : 'user', content: 'message ' + i, created_at: i });
    const history = await f.getConversationMessages('history', 'user-a');
    assert.equal(history.length, 30); assert.equal(history[0].content, 'message 15'); assert.equal(history.at(-1).content, 'message 44');
    const denied = await fetch(f.base + '/api/conversations/other/messages', { headers: { Authorization: 'Bearer valid' } });
    assert.equal(denied.status, 404);
});

test('pin, rename, delete and clear history only mutate the authenticated owner', async t => {
    const f = await fixture(t); await (await f.chat()).text();
    const id = f.db.conversations[0].id;
    const headers = { Authorization: 'Bearer valid', 'Content-Type': 'application/json' };
    const pin = await fetch(f.base + '/api/conversations/' + id + '/pin', { method: 'PATCH', headers, body: '{"isPinned":true}' });
    assert.equal(pin.status, 200); assert.equal(f.db.conversations[0].is_pinned, true);
    const rename = await fetch(f.base + '/api/conversations/' + id, { method: 'PATCH', headers, body: '{"title":"Renamed"}' });
    assert.equal(rename.status, 200); assert.equal(f.db.conversations[0].title, 'Renamed');
    f.db.conversations.push({ id: 'other', user_id: 'user-b' });
    assert.equal((await fetch(f.base + '/api/conversations/' + id, { method: 'DELETE', headers })).status, 200);
    await (await f.chat()).text();
    assert.equal((await fetch(f.base + '/api/conversations', { method: 'DELETE', headers })).status, 200);
    assert.deepEqual(f.db.conversations.map(row => row.id), ['other']);
});

test('real installed PDF parser reads a generated PDF and rejects damaged input gracefully', async t => {
    const f = await fixture(t);
    const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
    ];
    const text = 'BT /F1 12 Tf 20 200 Td (Adumex PDF test) Tj ET';
    objects.push('<< /Length ' + text.length + ' >>\nstream\n' + text + '\nendstream');
    let pdf = '%PDF-1.4\n', offsets = [0];
    objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
    const xref = Buffer.byteLength(pdf);
    pdf += 'xref\n0 6\n0000000000 65535 f \n' + offsets.slice(1).map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('');
    pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const file = { originalname: 'test.pdf', mimetype: 'application/pdf', buffer: Buffer.from(pdf), size: pdf.length };
    assert.match((await f.extractFileText(file)).text, /Adumex PDF test/);
    await assert.rejects(f.extractFileText({ ...file, buffer: Buffer.from('bad PDF') }), /damaged or password protected/);
});
