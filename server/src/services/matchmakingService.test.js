const assert = require('assert');
const { getActivityDecay } = require('./matchmakingService');

const now = new Date('2026-07-27T00:00:00.000Z');
const daysAgo = (days) => new Date(now.getTime() - (days * 24 * 3600 * 1000)).toISOString();

assert.deepStrictEqual(getActivityDecay(null, now), {
  inactiveDays: 0,
  activityPenaltyPercent: 0,
  activityMultiplier: 1,
});

assert.deepStrictEqual(getActivityDecay(daysAgo(7), now), {
  inactiveDays: 7,
  activityPenaltyPercent: 0,
  activityMultiplier: 1,
});

assert.deepStrictEqual(getActivityDecay(daysAgo(10), now), {
  inactiveDays: 10,
  activityPenaltyPercent: 15,
  activityMultiplier: 0.85,
});

assert.deepStrictEqual(getActivityDecay(daysAgo(15), now), {
  inactiveDays: 15,
  activityPenaltyPercent: 45,
  activityMultiplier: 0.55,
});

assert.deepStrictEqual(getActivityDecay(daysAgo(30), now), {
  inactiveDays: 30,
  activityPenaltyPercent: 70,
  activityMultiplier: 0.3,
});

console.log('matchmakingService activity decay tests passed');
