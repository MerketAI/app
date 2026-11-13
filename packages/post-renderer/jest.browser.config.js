/**
 * The browser suite, kept out of `npm test` on purpose.
 *
 * It launches Chrome, renders every stress case and compares images, so it is
 * minutes rather than seconds, and it needs a browser the unit tests do not.
 * Run it with `npm run test:browser` - and before shipping any change to the
 * templates, the compositor or the auto-fit pass.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.browser.test.ts'],
  // One worker: the cases contend for the same browser and the comparisons are
  // image-sized, so parallelism here buys little and costs memory.
  maxWorkers: 1,
};
