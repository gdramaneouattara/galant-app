import fs from 'fs';
import path from 'path';

const cwd = process.cwd();
const bucketName = process.argv[2] || 'photos';

const readEnvFile = (filename) => {
  const filePath = path.join(cwd, filename);
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const out = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    out[key.trim()] = rest.join('=').trim();
  }
  return out;
};

const envFromFiles = {
  ...readEnvFile('.env'),
  ...readEnvFile('.env.local'),
  ...readEnvFile('.env.txt'),
};

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  envFromFiles.SUPABASE_URL ||
  envFromFiles.EXPO_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  envFromFiles.SUPABASE_SERVICE_ROLE_KEY ||
  envFromFiles.SUPABASE_ANON_KEY ||
  envFromFiles.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL/Key manquants. Définis SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (ou EXPO_PUBLIC_*).');
  process.exit(1);
}

const baseUrl = supabaseUrl.replace(/\/+$/, '');
const headers = {
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
};

const bucketEndpoint = `${baseUrl}/storage/v1/bucket/${bucketName}`;
const createEndpoint = `${baseUrl}/storage/v1/bucket`;
const isPublicBucket = bucketName === 'photos';

const check = await fetch(bucketEndpoint, { headers });
if (check.status === 200) {
  const data = await check.json();
  if (data.public) {
    console.log(`Bucket "${data.name}" déjà présent et public.`);
    process.exit(0);
  }
  console.log(`Bucket "${data.name}" déjà présent mais privé.`);
  console.log(`SQL pour le rendre public:`);
  console.log(`update storage.buckets set public = true where id = '${bucketName}';`);
  process.exit(0);
}

if (check.status !== 404) {
  const body = await check.text();
  console.error(`Erreur ${check.status} lors de la vérification: ${body}`);
  if (check.status === 401 || check.status === 403) {
    console.error('Astuce: utilise la SERVICE_ROLE_KEY pour créer un bucket.');
  }
  process.exit(2);
}

const res = await fetch(createEndpoint, {
  method: 'POST',
  headers,
  body: JSON.stringify({ id: bucketName, name: bucketName, public: isPublicBucket }),
});

if (res.status === 200 || res.status === 201) {
  console.log(`Bucket "${bucketName}" créé en ${isPublicBucket ? 'public' : 'privé'}.`);
  process.exit(0);
}

const body = await res.text();
console.error(`Erreur ${res.status} lors de la création: ${body}`);
if (res.status === 401 || res.status === 403) {
  console.error('Astuce: utilise la SERVICE_ROLE_KEY pour créer un bucket.');
}
process.exit(3);
