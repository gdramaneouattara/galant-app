import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('auth flow handles missing profile and suspended profile explicitly', async () => {
  const authFlow = await read('src/screens/auth/AuthFlowScreen.tsx');
  assert.match(authFlow, /profileError\.code\s*===\s*['"]PGRST116['"]/);
  assert.match(authFlow, /goTo\(\s*['"]identity['"]\s*\)/);
  assert.match(authFlow, /if\s*\(\s*profile\.suspended_at\s*\)/);
  assert.match(authFlow, /Compte suspendu/);
});

test('api client defers missing EXPO_PUBLIC_API_BASE_URL check to request time', async () => {
  const api = await read('src/lib/api.ts');
  assert.match(api, /if\s*\(!runtimeApiBaseUrl\)/);
  assert.match(api, /EXPO_PUBLIC_API_BASE_URL is missing/);
});

test('api client safely handles non-json error payloads', async () => {
  const api = await read('src/lib/api.ts');
  assert.match(api, /try\s*\{\s*payload = JSON\.parse\(text\)/s);
  assert.match(api, /catch\s*\{\s*payload = \{\s*raw:\s*text\s*\}/s);
  assert.match(api, /payload\.raw\.slice\(0,\s*200\)/);
});

