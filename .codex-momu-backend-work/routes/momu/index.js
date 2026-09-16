const express = require('express');
const router = express.Router();

// Momu feature routers
const momuAuthRouter = require('./auth');
const { startTemporaryPasswordWorker } = require('../../services/temporaryPasswordWorker');
const momuDeviceRouter = require('./device');
const momuProgramRouter = require('./program');
const hereMyPhotoRouter = require('./hereMyPhoto');
const vividFriendsRouter = require('./vividFriends');
const momuUploadRouter = require('./upload');
const momuStorageRouter = require('./storage');
const momuProgramHistoryRouter = require('./programHistoryRouter');
const {
  startWeeklyCompletedImageCleanupWorker
} = require('./weeklyCompletedImages');

router.use('/auth', momuAuthRouter);
router.use('/device', momuDeviceRouter);
router.use('/program', momuProgramRouter);
router.use('/here-my-photo', hereMyPhotoRouter);
router.use('/vivid-friends', vividFriendsRouter);
router.use('/upload', momuUploadRouter);
router.use('/storage', momuStorageRouter);
router.use('/program-history', momuProgramHistoryRouter);

router.startProgramScheduleWorker = () => {
  momuProgramRouter.startProgramScheduleWorker?.();
  startWeeklyCompletedImageCleanupWorker();
  startTemporaryPasswordWorker();
};

module.exports = router;
