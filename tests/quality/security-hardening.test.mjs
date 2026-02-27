import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('backend auth returns profile_not_found for missing profile (PGRST116)', async () => {
  const server = await read('server/src/index.js');
  assert.match(server, /profileError\.code\s*===\s*['"]PGRST116['"]/);
  assert.match(server, /status\(403\)\.json\(\{\s*error:\s*['"]profile_not_found['"]\s*\}\)/);
});

test('backend keeps invisible mode restricted to eligible plans', async () => {
  const server = await read('server/src/index.js');
  assert.match(server, /INVISIBLE_MODE_PLAN_KEYS\s*=\s*\[\s*['"]BIANNUAL['"]\s*,\s*['"]ANNUAL['"]\s*\]/);
  assert.match(server, /\.\.\.\(invisibleModeAllowed\s*\?\s*\{\}\s*:\s*\{\s*is_invisible:\s*false\s*\}\)/);
});

test('backend exposes admin suspend endpoint and updates suspended_at', async () => {
  const server = await read('server/src/index.js');
  assert.match(server, /adminRouter\.put\(\s*['"]\/users\/:id\/suspend['"]/);
  assert.match(server, /\.update\(\{\s*suspended_at\s*\}\)/);
});

for (const file of ['scripts/supabase-rls.sql', 'scripts/supabase-rls-rest-only.sql']) {
  test(`${file} has hardened message update controls`, async () => {
    const sql = await read(file);
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.prevent_unsafe_message_updates/i);
    assert.match(sql, /CREATE TRIGGER prevent_unsafe_message_updates/i);
    assert.match(sql, /Not allowed to edit another user message/i);
    assert.match(sql, /CREATE POLICY "Users can update their messages\."[\s\S]*or is_read = true/i);
  });

  test(`${file} normalizes match pairs and blocks self-matches`, async () => {
    const sql = await read(file);
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.normalize_match_pair/i);
    assert.match(sql, /A match requires two distinct users/i);
    assert.match(sql, /CREATE TRIGGER normalize_match_pair/i);
  });
}

