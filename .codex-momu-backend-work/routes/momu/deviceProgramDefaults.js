const DEFAULT_DEVICE_PROGRAM_CONFIG = Object.freeze({
  launchOnStartup: 'none',
  idleLaunchDelaySeconds: 180,
  vividFriends: {
    isActive: true,
    backgroundMode: 'custom',
    backgroundImageUrl: null,
    musicMode: 'custom',
    musicFileUrl: null,
    effectMode: 'custom',
    effectFileUrl: null,
    motionType: 'right_left',
    drawingTimerMinutes: 0,
    drawingListMode: 'basic',
    drawingImageUrls: []
  },
  immersiveLibrary: {
    isActive: true,
    isBasic: true,
    launchMode: 'basic',
    contents: []
  },
  hereMyPhoto: {
    isActive: true,
    backgroundMode: 'custom',
    backgroundImageUrl: null,
    musicMode: 'custom',
    musicFileUrl: null,
    effectMode: 'custom',
    effectFileUrl: null,
    motionType: 'right_left',
    drawingTimerMinutes: 0,
    cameraDeviceName: '',
    stickerMode: 'custom',
    stickerImageUrls: []
  }
});

const createDefaultDeviceProgramConfig = () => (
  JSON.parse(JSON.stringify(DEFAULT_DEVICE_PROGRAM_CONFIG))
);

module.exports = {
  DEFAULT_DEVICE_PROGRAM_CONFIG,
  createDefaultDeviceProgramConfig
};
