const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildProgramHistoryDiff,
  formatHistoryReport
} = require('../routes/momu/programHistory');

const createConfig = () => ({
  launchOnStartup: 'vividFriends',
  idleLaunchDelaySeconds: 180,
  vividFriends: {
    isActive: true,
    backgroundMode: 'custom',
    backgroundImageUrl: 'old-image-url',
    musicMode: 'custom',
    musicFileUrl: null,
    effectMode: 'basic',
    effectFileUrl: null,
    motionType: 'right_left',
    drawingTimerMinutes: 3,
    drawingListMode: 'custom',
    drawingImageUrls: ['a', 'b', 'c']
  },
  immersiveLibrary: {
    isActive: true,
    isBasic: false,
    launchMode: 'active',
    contents: []
  },
  hereMyPhoto: {
    isActive: true,
    stickerMode: 'basic',
    stickerImageUrls: []
  }
});

test('MOMU program history summarizes changed modes and collection counts', () => {
  const before = createConfig();
  const after = createConfig();
  after.vividFriends.backgroundMode = 'black';
  after.vividFriends.drawingImageUrls = ['a', 'd', 'b', 'c'];
  after.hereMyPhoto.stickerMode = 'custom';
  after.hereMyPhoto.stickerImageUrls = ['s1', 's2'];

  const diff = buildProgramHistoryDiff(before, after);
  assert.equal(diff.changes.length, 4);
  assert.deepEqual(
    diff.changedPrograms.map((program) => program.key),
    ['vividFriends', 'hereMyPhoto']
  );
  assert.match(diff.changeSummary, /Background Image/);
  assert.match(diff.changeSummary, /Stickers/);
});

test('MOMU history report omits actual asset URLs', () => {
  const before = createConfig();
  const after = createConfig();
  after.vividFriends.backgroundImageUrl = 'new-secret-url';
  const diff = buildProgramHistoryDiff(before, after);

  const report = formatHistoryReport({
    id: 'admin2',
    deviceSeq: 3,
    deviceName: 'Device 03',
    companyName: '기관',
    managerName: '관리자',
    managerPhone: '010-0000-0000',
    executionType: 'immediate',
    executionStatus: 'success',
    executedAt: new Date('2026-08-06T00:00:00Z'),
    changes: diff.changes,
    changeSummary: diff.changeSummary
  });

  assert.match(report, /배경 이미지 파일/);
  assert.doesNotMatch(report, /old-image-url/);
  assert.doesNotMatch(report, /new-secret-url/);
});
