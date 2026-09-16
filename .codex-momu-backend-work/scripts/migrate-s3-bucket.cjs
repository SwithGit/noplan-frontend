require('dotenv').config();

const crypto = require('node:crypto');
const {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} = require('@aws-sdk/client-s3');
const {
  fromInstanceMetadata,
} = require('@smithy/credential-provider-imds');

const argumentList = process.argv.slice(2);
const apply = argumentList.includes('--apply');
const sourceBucket = argumentList
  .find((value) => value.startsWith('--source-bucket='))
  ?.slice('--source-bucket='.length)
  .trim();
const destinationBucket = argumentList
  .find((value) => value.startsWith('--destination-bucket='))
  ?.slice('--destination-bucket='.length)
  .trim();
const sourceRegion = String(process.env.AWS_REGION || 'ap-northeast-2').trim();
const destinationRegion = String(
  process.env.AWS_DEST_REGION || sourceRegion,
).trim();
const prefixes = [
  String(process.env.AWS_S3_MOMU_ASSET_PREFIX || 'momu/assets'),
  String(process.env.AWS_S3_HERE_MY_PHOTO_PREFIX || 'momu/here-my-photo'),
  String(
    process.env.AWS_S3_VIVID_FRIENDS_PREFIX ||
      'momu/vivid-friends/completed',
  ),
  'Momu',
].map((value) => `${value.replace(/^\/+|\/+$/g, '')}/`);

if (!sourceBucket || !destinationBucket) {
  console.error(
    'Both --source-bucket=<bucket> and --destination-bucket=<bucket> are required.',
  );
  process.exit(1);
}
if (sourceBucket === destinationBucket) {
  console.error('Source and destination buckets must be different.');
  process.exit(1);
}
for (const requiredName of ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']) {
  if (!process.env[requiredName]) {
    console.error(`Missing source credential variable: ${requiredName}`);
    process.exit(1);
  }
}

const sourceClient = new S3Client({
  region: sourceRegion,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
});
const destinationClient = new S3Client({
  region: destinationRegion,
  requestStreamBufferSize: 64 * 1024,
  credentials: fromInstanceMetadata({
    maxRetries: 3,
    timeout: 2000,
  }),
});

async function listPrefix(client, bucket, prefix) {
  const objects = [];
  let continuationToken;

  do {
    const page = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));
    for (const item of page.Contents || []) {
      objects.push({
        key: item.Key,
        size: Number(item.Size || 0),
        etag: String(item.ETag || ''),
      });
    }
    continuationToken = page.IsTruncated
      ? page.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return objects;
}

function summarize(prefix, objects) {
  const fingerprint = crypto.createHash('sha256');
  let bytes = 0;
  for (const item of objects) {
    bytes += item.size;
    fingerprint.update(`${item.key}\0${item.size}\n`);
  }
  return {
    prefix,
    count: objects.length,
    bytes,
    keySizeFingerprint: fingerprint.digest('hex'),
  };
}

async function inventory(client, bucket) {
  const allObjects = [];
  const summaries = [];
  for (const prefix of [...new Set(prefixes)]) {
    const objects = await listPrefix(client, bucket, prefix);
    allObjects.push(...objects);
    summaries.push(summarize(prefix, objects));
  }
  return { allObjects, summaries };
}

function compareSummaries(source, destination) {
  return source.map((sourceSummary) => {
    const destinationSummary = destination.find(
      (item) => item.prefix === sourceSummary.prefix,
    );
    return {
      prefix: sourceSummary.prefix,
      sourceCount: sourceSummary.count,
      destinationCount: destinationSummary?.count || 0,
      sourceBytes: sourceSummary.bytes,
      destinationBytes: destinationSummary?.bytes || 0,
      matches:
        sourceSummary.count === (destinationSummary?.count || 0) &&
        sourceSummary.bytes === (destinationSummary?.bytes || 0) &&
        sourceSummary.keySizeFingerprint ===
          destinationSummary?.keySizeFingerprint,
    };
  });
}

async function copyObject(item) {
  if (item.size > 5 * 1024 * 1024 * 1024) {
    throw new Error(
      `Object exceeds the 5 GiB single PUT limit: ${item.key}`,
    );
  }

  const sourceObject = await sourceClient.send(new GetObjectCommand({
    Bucket: sourceBucket,
    Key: item.key,
  }));
  const putInput = {
    Bucket: destinationBucket,
    Key: item.key,
    Body: sourceObject.Body,
    ContentLength: sourceObject.ContentLength,
    ContentType: sourceObject.ContentType,
    CacheControl: sourceObject.CacheControl,
    ContentDisposition: sourceObject.ContentDisposition,
    ContentEncoding: sourceObject.ContentEncoding,
    ContentLanguage: sourceObject.ContentLanguage,
    Expires: sourceObject.Expires,
    Metadata: sourceObject.Metadata,
    ServerSideEncryption: 'AES256',
  };
  for (const [key, value] of Object.entries(putInput)) {
    if (value === undefined) delete putInput[key];
  }
  await destinationClient.send(new PutObjectCommand(putInput));
}

async function main() {
  const sourceBefore = await inventory(sourceClient, sourceBucket);
  const destinationBefore = await inventory(
    destinationClient,
    destinationBucket,
  );
  const beforeComparison = compareSummaries(
    sourceBefore.summaries,
    destinationBefore.summaries,
  );

  if (!apply) {
    console.log(JSON.stringify({
      mode: 'dry-run',
      sourceBucket,
      destinationBucket,
      sourceRegion,
      destinationRegion,
      source: sourceBefore.summaries,
      destination: destinationBefore.summaries,
      comparison: beforeComparison,
      message: 'Dry run only. Re-run with --apply to copy missing objects.',
    }, null, 2));
    return;
  }

  const destinationByKey = new Map(
    destinationBefore.allObjects.map((item) => [item.key, item]),
  );
  const objectsToCopy = sourceBefore.allObjects.filter((item) => {
    const destinationItem = destinationByKey.get(item.key);
    return !destinationItem || destinationItem.size !== item.size;
  });
  let copied = 0;
  let skipped = sourceBefore.allObjects.length - objectsToCopy.length;

  for (const item of objectsToCopy) {
    await copyObject(item);
    copied += 1;
    if (copied === 1 || copied % 25 === 0 || copied === objectsToCopy.length) {
      console.error(
        `[S3 COPY] copied=${copied}/${objectsToCopy.length} ` +
          `skipped=${skipped} key=${item.key}`,
      );
    }
  }

  const destinationAfter = await inventory(
    destinationClient,
    destinationBucket,
  );
  const comparison = compareSummaries(
    sourceBefore.summaries,
    destinationAfter.summaries,
  );
  const verified = comparison.every((item) => item.matches);
  if (!verified) {
    throw new Error(
      'Destination verification failed. Re-run the command to resume safely.',
    );
  }

  console.log(JSON.stringify({
    mode: 'apply',
    sourceBucket,
    destinationBucket,
    copied,
    skipped,
    verified,
    comparison,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.name || 'Error', error?.message || error);
  process.exitCode = 1;
});
