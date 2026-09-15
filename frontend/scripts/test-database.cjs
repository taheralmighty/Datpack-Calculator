const { PGlite } = require('@electric-sql/pglite');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const migration = readFileSync(require('node:path').join(__dirname, '../../database/migrations/001_internal_quotation_integrity.sql'), 'utf8');

(async () => {
  const existing = new PGlite();
  try {
    await existing.exec(`create table quotations(id uuid primary key, client_id uuid, state jsonb not null, updated_at timestamptz not null);
      insert into quotations values('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','{"jobName":"Original"}','2026-09-14T00:00:00Z');`);
    const update = state => existing.query(`update quotations set state=$1::jsonb, updated_at='2026-09-14T00:00:01Z'
      where id='00000000-0000-4000-8000-000000000001' and client_id='00000000-0000-4000-8000-000000000002'
      and updated_at='2026-09-14T00:00:00Z' and state->>'_deletedAt' is null returning id`, [JSON.stringify(state)]);
    const competing = await Promise.all([update({ jobName: 'First edit' }), update({ jobName: 'Second edit' })]);
    assert.equal(competing.reduce((count, result) => count + result.rows.length, 0), 1);
    const original = (await existing.query('select state from quotations')).rows[0].state;
    await existing.query(`update quotations set state=state || '{"_deletedAt":"2026-09-14T00:00:02Z"}'::jsonb,
      updated_at='2026-09-14T00:00:02Z' where updated_at='2026-09-14T00:00:01Z' and state->>'_deletedAt' is null`);
    assert.equal((await existing.query("select id from quotations where state->>'_deletedAt' is null")).rows.length, 0);
    assert.equal((await update({ jobName: 'Late edit' })).rows.length, 0);
    const deleted = (await existing.query('select state from quotations')).rows[0].state;
    assert.equal(deleted.jobName, original.jobName);
    assert.ok(deleted._deletedAt);
    await assert.rejects(existing.query("insert into quotations values('00000000-0000-4000-8000-000000000001',null,'{}',now())"), /duplicate key/);
    console.log('Existing schema without migration: atomic timestamp conflicts, JSON soft-delete filtering, original-state preservation and duplicate-ID protection passed.');
  } finally { await existing.close(); }
  for (const legacy of [false, true]) {
    const database = new PGlite();
    try {
      await database.exec('create role anon; create role authenticated;');
      if (legacy) {
        await database.exec(`create table clients(id uuid primary key default gen_random_uuid(), name text not null, phone text, email text, created_at timestamptz default now());
          create table quotations(id uuid primary key default gen_random_uuid(), client_id uuid references clients(id), data jsonb not null, created_at timestamptz default now());
          insert into clients(id,name) values('00000000-0000-4000-8000-000000000001','Legacy');
          insert into quotations(id,client_id,data) values('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','{"jobName":"Preserved"}');`);
      }
      await database.exec(migration);
      const requiredColumns = {
        clients: ['id', 'name', 'phone', 'email', 'created_at'],
        quotations: ['id', 'client_id', 'created_at', 'job_name', 'quote_number', 'version', 'is_repeat_order', 'state', 'updated_at', 'revision', 'deleted_at'],
      };
      for (const [table, columns] of Object.entries(requiredColumns)) {
        const actual = (await database.query('select column_name from information_schema.columns where table_schema=$1 and table_name=$2', ['public', table])).rows.map(row => row.column_name);
        for (const column of columns) assert.ok(actual.includes(column), `${table}.${column} is required by the adapter`);
      }
      await database.exec(migration);
      if (legacy) {
        const result = await database.query('select data,state from quotations');
        assert.deepEqual(result.rows[0].data, result.rows[0].state);
      }
      const client = (await database.query("insert into clients(name) values('Test') returning id")).rows[0];
      const payload = { id: '00000000-0000-4000-8000-000000000003', client_id: client.id, quote_number: 'QT-TEST', version: 1, job_name: 'Test', state: { jobName: 'Test' } };
      const save = revision => database.query('select save_quotation_checked($1::jsonb,$2::bigint) as saved', [JSON.stringify(payload), revision]);
      assert.equal((await save(0)).rows[0].saved.revision, 1);
      assert.equal((await save(1)).rows[0].saved.revision, 2);
      await assert.rejects(save(1), /conflict/);
      await database.query('select delete_quotation_checked($1::uuid)', [payload.id]);
      await assert.rejects(save(0), /conflict/);
      assert.equal((await database.query('select id from quotations where id=$1 and deleted_at is null', [payload.id])).rows.length, 0);
      payload.id = '00000000-0000-4000-8000-000000000004';
      await database.query('select delete_quotation_checked($1::uuid)', [payload.id]);
      await assert.rejects(save(0), /conflict/);
      await database.exec('set role anon');
      await assert.rejects(database.query('select * from quotations'), /permission denied/);
      await database.exec('reset role');
      console.log(`${legacy ? 'Legacy upgrade' : 'Fresh schema'}: full column matrix, migration rerun, preservation, CRUD, revisions, tombstones and default-deny grants passed.`);
    } finally { await database.close(); }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });