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

const endpoint = `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/bucket/${bucketName}`;

const res = await fetch(endpoint, {
  headers: {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  },
});

if (res.status === 200) {
  const data = await res.json();
  const visibility = data.public ? 'public' : 'privé';
  console.log(`Bucket "${data.name}" trouvé (${visibility}).`);
  process.exit(0);
}

if (res.status === 404) {
  console.log(`Bucket "${bucketName}" introuvable.`);
  process.exit(2);
}

const body = await res.text();
console.error(`Erreur ${res.status} lors de la vérification du bucket: ${body}`);
if (res.status === 401 || res.status === 403) {
  console.error('Astuce: utilise la SERVICE_ROLE_KEY pour lire les buckets.');
}
process.exit(3);
