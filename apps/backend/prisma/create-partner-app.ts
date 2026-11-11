/**
 * Creates a B2B partner application and prints its credentials.
 *
 * Solves the bootstrap problem: the admin API that issues these credentials is
 * itself protected by an ADMIN token, so the very first application has to be
 * created out of band.
 *
 *   npm run partner:create -- --name "Acme Marketing Suite"
 *   npm run partner:create -- --name "Acme" --credits 500 --tier PROFESSIONAL
 *
 * The secret is printed once and stored only as a SHA-256 hash.
 */
import { PrismaClient } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';

const prisma = new PrismaClient();

const UPPER_ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const LOWER_ALNUM = 'abcdefghijklmnopqrstuvwxyz0123456789';
const SECRET_ALPHABET =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@!#$%&*';

function pick(alphabet: string, length: number): string {
  const bytes = randomBytes(length * 2);
  let out = '';
  for (let i = 0; i < length; i++) {
    const n = (bytes[i * 2] << 8) | bytes[i * 2 + 1];
    out += alphabet[n % alphabet.length];
  }
  return out;
}

function arg(flag: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(`--${flag}`);
  if (index === -1 || index === process.argv.length - 1) return fallback;
  return process.argv[index + 1];
}

async function main() {
  const name = arg('name');
  if (!name) {
    console.error(
      'Usage: npm run partner:create -- --name "<Partner name>" [--credits 100] [--tier STARTER] [--email ops@partner.com] [--no-auto-provision]',
    );
    process.exit(1);
  }

  const appKey = `U${pick(UPPER_ALNUM, 20)}-${pick(LOWER_ALNUM, 13)}`;
  const appSecret = pick(SECRET_ALPHABET, 32);

  const app = await prisma.partnerApp.create({
    data: {
      name,
      contactEmail: arg('email'),
      description: arg('description'),
      appKey,
      appSecretHash: createHash('sha256').update(appSecret, 'utf8').digest('hex'),
      appSecretLast4: appSecret.slice(-4),
      secretRotatedAt: new Date(),
      scopes: JSON.stringify(['*']),
      defaultTier: arg('tier', 'STARTER')!,
      defaultCredits: Number(arg('credits', '100')),
      autoProvision: !process.argv.includes('--no-auto-provision'),
    },
  });

  const line = '='.repeat(72);
  console.log(`\n${line}`);
  console.log(`  Partner application created: ${app.name}`);
  console.log(line);
  console.log(`  APP_KEY     ${appKey}`);
  console.log(`  APP_SECRET  ${appSecret}`);
  console.log(line);
  console.log('  Store APP_SECRET now - it is hashed at rest and cannot be');
  console.log('  retrieved again. Rotate it via');
  console.log(`  POST /api/v1/admin/partner-apps/${app.id}/rotate-secret`);
  console.log(line);
  console.log('\n  Try it:\n');
  console.log('  curl http://localhost:3002/api/v1/partner/me \\');
  console.log(`    -H "X-App-Key: ${appKey}" \\`);
  console.log(`    -H "X-App-Secret: ${appSecret}"`);
  console.log('\n  Then act for one of your subscribers by adding X-App-Uid:\n');
  console.log('  curl http://localhost:3002/api/v1/content \\');
  console.log(`    -H "X-App-Key: ${appKey}" \\`);
  console.log(`    -H "X-App-Secret: ${appSecret}" \\`);
  console.log('    -H "X-App-Uid: UYYHD77887778888"\n');
}

main()
  .catch((error) => {
    console.error('Failed to create partner application:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
