const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { db, rtdb, bucket } = require('../config/firebase');
const { configureFfmpeg } = require('../utils/ffmpegBinary');

const ffmpeg = configureFfmpeg();

const IMAGE_VARIANTS = {
  thumb: { width: 240, quality: 62 },
  medium: { width: 720, quality: 68 },
};

const MEDIA_PREFIXES = ['profiles/', 'photos/', 'statuses/', 'chat-media/', 'chats/', 'events/'];
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'm4v', 'webm']);

const isFirebaseStorageUrl = (value) => (
  typeof value === 'string' && value.includes('firebasestorage.googleapis.com') && value.includes('/o/')
);

const storagePathFromUrl = (value) => {
  if (typeof value !== 'string') return null;
  if (!isFirebaseStorageUrl(value)) return null;
  const match = value.match(/\/o\/([^?]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
};

const extensionOf = (filePath) => String(filePath || '').split('?')[0].split('.').pop()?.toLowerCase() || '';

const isImagePath = (filePath) => IMAGE_EXTENSIONS.has(extensionOf(filePath));
const isVideoPath = (filePath) => VIDEO_EXTENSIONS.has(extensionOf(filePath));

const variantPathFor = (filePath, variant) => {
  const ext = extensionOf(filePath);
  const base = ext ? filePath.slice(0, -(ext.length + 1)) : filePath;
  return `${base}_${variant}.webp`;
};

const optimizedVideoPathFor = (filePath) => {
  const ext = extensionOf(filePath);
  const base = ext ? filePath.slice(0, -(ext.length + 1)) : filePath;
  return `${base}_optimized.mp4`;
};

const videoThumbnailPathFor = (filePath) => {
  const ext = extensionOf(filePath);
  const base = ext ? filePath.slice(0, -(ext.length + 1)) : filePath;
  return `${base}_thumb.jpg`;
};

const downloadUrlForPath = (filePath, token) => (
  `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`
);

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const transcodeImageVariant = (inputPath, outputPath, config) => (
  new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        `-vf scale='min(${config.width},iw)':-2`,
        '-frames:v 1',
        `-quality ${config.quality}`,
      ])
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath);
  })
);

const createImageVariantsForPath = async (filePath) => {
  if (!bucket || !filePath || !isImagePath(filePath) || filePath.includes('_thumb.') || filePath.includes('_medium.')) {
    return null;
  }

  const sourceFile = bucket.file(filePath);
  const [exists] = await sourceFile.exists();
  if (!exists) return null;

  const tmpDir = path.join(os.tmpdir(), 'galant-media-v2');
  ensureDir(tmpDir);
  const safeName = filePath.replace(/[\\/:%?&#=]/g, '_');
  const inputPath = path.join(tmpDir, `${Date.now()}_${safeName}`);

  await sourceFile.download({ destination: inputPath });

  const variants = {};
  try {
    for (const [name, config] of Object.entries(IMAGE_VARIANTS)) {
      const outputPath = path.join(tmpDir, `${Date.now()}_${safeName}_${name}.webp`);
      const destination = variantPathFor(filePath, name);
      const token = crypto.randomUUID();
      await transcodeImageVariant(inputPath, outputPath, config);
      await bucket.upload(outputPath, {
        destination,
        metadata: {
          contentType: 'image/webp',
          cacheControl: 'public,max-age=2592000,immutable',
          metadata: {
            firebaseStorageDownloadTokens: token,
          },
        },
      });
      variants[name] = {
        path: destination,
        url: downloadUrlForPath(destination, token),
      };
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
  } finally {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
  }

  return variants;
};

const transcodeVideo = (inputPath, outputPath, isChat = false) => (
  new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .duration(isChat ? 30 : 15)
      .outputOptions([
        '-vf scale=-2:540',
        '-r 24',
        '-c:v libx264',
        isChat ? '-crf 30' : '-crf 28',
        '-preset veryfast',
        '-c:a aac',
        '-b:a 64k',
        '-movflags +faststart',
      ])
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath);
  })
);

const createVideoThumbnail = (inputPath, outputPath) => (
  new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions(['-frames:v 1', '-vf scale=-2:360', '-q:v 8'])
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath);
  })
);

const optimizeVideoForPath = async (filePath) => {
  if (!bucket || !filePath || !isVideoPath(filePath) || filePath.includes('_optimized.')) return null;

  const sourceFile = bucket.file(filePath);
  const [exists] = await sourceFile.exists();
  if (!exists) return null;

  const tmpDir = path.join(os.tmpdir(), 'galant-media-v2');
  ensureDir(tmpDir);
  const safeName = filePath.replace(/[\\/:%?&#=]/g, '_');
  const inputPath = path.join(tmpDir, `${Date.now()}_${safeName}`);
  const outputPath = path.join(tmpDir, `${Date.now()}_${safeName}_optimized.mp4`);
  const thumbnailPath = path.join(tmpDir, `${Date.now()}_${safeName}_thumb.jpg`);
  const videoDestination = optimizedVideoPathFor(filePath);
  const thumbnailDestination = videoThumbnailPathFor(filePath);
  const videoToken = crypto.randomUUID();
  const thumbnailToken = crypto.randomUUID();

  await sourceFile.download({ destination: inputPath });

  try {
    await transcodeVideo(inputPath, outputPath, filePath.startsWith('chat-media/'));
    await createVideoThumbnail(outputPath, thumbnailPath);

    await bucket.upload(outputPath, {
      destination: videoDestination,
      metadata: {
        contentType: 'video/mp4',
        cacheControl: 'public,max-age=2592000,immutable',
        metadata: { firebaseStorageDownloadTokens: videoToken },
      },
    });
    await bucket.upload(thumbnailPath, {
      destination: thumbnailDestination,
      metadata: {
        contentType: 'image/jpeg',
        cacheControl: 'public,max-age=2592000,immutable',
        metadata: { firebaseStorageDownloadTokens: thumbnailToken },
      },
    });

    return {
      video: {
        path: videoDestination,
        url: downloadUrlForPath(videoDestination, videoToken),
      },
      thumbnail: {
        path: thumbnailDestination,
        url: downloadUrlForPath(thumbnailDestination, thumbnailToken),
      },
    };
  } finally {
    [inputPath, outputPath, thumbnailPath].forEach((tmpPath) => {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    });
  }
};

const collectStoragePathsFromValue = (value, output) => {
  if (!value) return;
  if (typeof value === 'string') {
    const storagePath = storagePathFromUrl(value);
    if (storagePath) output.add(storagePath);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStoragePathsFromValue(item, output));
    return;
  }
  if (typeof value === 'object') {
    Object.values(value).forEach((item) => collectStoragePathsFromValue(item, output));
  }
};

const collectReferencedMediaPaths = async () => {
  const referenced = new Set();
  const collections = [
    'profiles',
    'venues',
    'venue_events',
    'statuses',
    'photo_review_queue',
    'kyc_verifications',
  ];

  for (const collectionName of collections) {
    const snap = await db.collection(collectionName).get();
    snap.docs.forEach((doc) => {
      const data = doc.data();
      collectStoragePathsFromValue(data, referenced);
      ['media_url', 'thumbnail_url'].forEach((field) => {
        if (data[field] && !isFirebaseStorageUrl(data[field])) {
          const prefix = collectionName === 'statuses' ? 'statuses/' : '';
          referenced.add(`${prefix}${data[field]}`);
        }
      });
    });
  }

  for (const root of ['messages', 'venue_messages']) {
    const snap = await rtdb.ref(root).once('value');
    if (snap.exists()) collectStoragePathsFromValue(snap.val(), referenced);
  }

  [...referenced].forEach((filePath) => {
    if (isImagePath(filePath) && !filePath.includes('_thumb.') && !filePath.includes('_medium.')) {
      referenced.add(variantPathFor(filePath, 'thumb'));
      referenced.add(variantPathFor(filePath, 'medium'));
    }
  });

  return referenced;
};

const backfillPhotoArrayVariantsForCollection = async ({ collectionName, arrayField = 'photos', primaryField = null, limit }) => {
  const snap = await db.collection(collectionName).get();
  let processed = 0;
  let updated = 0;
  let variantsCreated = 0;

  for (const doc of snap.docs) {
    if (processed >= limit) break;
    const item = doc.data();
    const photos = Array.isArray(item[arrayField]) ? item[arrayField] : [];
    if (primaryField && item[primaryField] && !photos.includes(item[primaryField])) photos.unshift(item[primaryField]);
    const nextVariants = { ...(item.photo_variants || {}) };
    let changed = false;

    for (const photoUrl of photos) {
      if (processed >= limit) break;
      processed++;
      if (nextVariants[photoUrl]?.thumb && nextVariants[photoUrl]?.medium) continue;
      const filePath = storagePathFromUrl(photoUrl);
      if (!filePath || !isImagePath(filePath)) continue;
      const variants = await createImageVariantsForPath(filePath);
      if (!variants) continue;
      nextVariants[photoUrl] = {
        full: photoUrl,
        thumb: variants.thumb.url,
        medium: variants.medium.url,
        thumb_path: variants.thumb.path,
        medium_path: variants.medium.path,
      };
      variantsCreated += Object.keys(variants).length;
      changed = true;
    }

    if (changed) {
      await doc.ref.update({
        photo_variants: nextVariants,
        media_backfilled_at: new Date().toISOString(),
      });
      updated++;
    }
  }

  return { processed, updated, variantsCreated };
};

const backfillImageVariants = async ({ limit = 250 } = {}) => {
  const targets = [
    { collectionName: 'profiles', arrayField: 'photos' },
    { collectionName: 'venues', arrayField: 'photos', primaryField: 'photo_url' },
    { collectionName: 'venue_events', arrayField: 'photos', primaryField: 'photo_url' },
  ];
  const totals = { processed: 0, updated: 0, variantsCreated: 0 };

  for (const target of targets) {
    const remaining = Math.max(0, limit - totals.processed);
    if (remaining === 0) break;
    const result = await backfillPhotoArrayVariantsForCollection({ ...target, limit: remaining });
    totals.processed += result.processed;
    totals.updated += result.updated;
    totals.variantsCreated += result.variantsCreated;
  }

  return totals;
};

const stripStoragePrefix = (filePath, prefix) => (
  filePath && filePath.startsWith(prefix) ? filePath.slice(prefix.length) : filePath
);

const resolveStatusStoragePath = (value) => {
  const fromUrl = storagePathFromUrl(value);
  if (fromUrl) return fromUrl;
  if (typeof value !== 'string' || !value) return null;
  return value.startsWith('statuses/') ? value : `statuses/${value}`;
};

const backfillStatusVideos = async ({ limit }) => {
  const snap = await db.collection('statuses').get();
  let processed = 0;
  let updated = 0;

  for (const doc of snap.docs) {
    if (processed >= limit) break;
    const item = doc.data();
    if (String(item.message_type || item.type || '').toUpperCase() !== 'VIDEO') continue;
    const filePath = resolveStatusStoragePath(item.media_url);
    if (!filePath || !isVideoPath(filePath) || filePath.includes('_optimized.')) continue;
    if (filePath.includes('/compressed_') && item.thumbnail_url) continue;
    processed++;

    const optimized = await optimizeVideoForPath(filePath);
    if (!optimized) continue;

    await doc.ref.update({
      media_url: stripStoragePrefix(optimized.video.path, 'statuses/'),
      thumbnail_url: stripStoragePrefix(optimized.thumbnail.path, 'statuses/'),
      media_optimized_at: new Date().toISOString(),
    });
    updated++;
  }

  return { processed, updated };
};

const backfillRealtimeVideoMessages = async ({ root, limit }) => {
  const snap = await rtdb.ref(root).once('value');
  let processed = 0;
  let updated = 0;
  if (!snap.exists()) return { processed, updated };

  const visit = async (nodeRef, value) => {
    if (processed >= limit || !value || typeof value !== 'object') return;

    const messageType = String(value.message_type || value.type || '').toUpperCase();
    if (messageType === 'VIDEO' && value.media_url) {
      const filePath = storagePathFromUrl(value.media_url);
      if (!filePath || !isVideoPath(filePath) || filePath.includes('_optimized.')) return;
      if (filePath.includes('/compressed_') && value.metadata?.thumbnail_url) return;
      processed++;

      const optimized = await optimizeVideoForPath(filePath);
      if (!optimized) return;

      await nodeRef.update({
        media_url: optimized.video.url,
        'metadata/thumbnail_url': optimized.thumbnail.url,
        media_optimized_at: new Date().toISOString(),
      });
      updated++;
      return;
    }

    for (const [key, childValue] of Object.entries(value)) {
      if (processed >= limit) break;
      await visit(nodeRef.child(key), childValue);
    }
  };

  await visit(rtdb.ref(root), snap.val());
  return { processed, updated };
};

const backfillVideoMedia = async ({ limit = 100 } = {}) => {
  const totals = { processed: 0, updated: 0 };
  const statusResult = await backfillStatusVideos({ limit });
  totals.processed += statusResult.processed;
  totals.updated += statusResult.updated;

  for (const root of ['messages', 'venue_messages']) {
    const remaining = Math.max(0, limit - totals.processed);
    if (remaining === 0) break;
    const result = await backfillRealtimeVideoMessages({ root, limit: remaining });
    totals.processed += result.processed;
    totals.updated += result.updated;
  }

  return totals;
};

const cleanupOrphanMedia = async ({ dryRun = true, limit = 500 } = {}) => {
  const referenced = await collectReferencedMediaPaths();
  let scanned = 0;
  let deleted = 0;
  const orphanPaths = [];

  for (const prefix of MEDIA_PREFIXES) {
    const [files] = await bucket.getFiles({ prefix });
    for (const file of files) {
      if (scanned >= limit) break;
      scanned++;
      if (referenced.has(file.name)) continue;
      orphanPaths.push(file.name);
      if (!dryRun) {
        await file.delete();
        deleted++;
      }
    }
    if (scanned >= limit) break;
  }

  return {
    dryRun,
    scanned,
    referenced: referenced.size,
    orphanCount: orphanPaths.length,
    deleted,
    sample: orphanPaths.slice(0, 25),
  };
};

module.exports = {
  storagePathFromUrl,
  variantPathFor,
  backfillImageVariants,
  backfillVideoMedia,
  cleanupOrphanMedia,
};
