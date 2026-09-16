const PROGRAM_NAMES = Object.freeze({
  common: 'Common Settings',
  vividFriends: 'Vivid Friends',
  immersiveLibrary: 'Immersive Library',
  hereMyPhoto: 'Here My Photo'
});

const VALUE_LABELS = Object.freeze({
  none: 'None',
  vividFriends: 'Vivid Friends',
  immersiveLibrary: 'Immersive Library',
  hereMyPhoto: 'Here My Photo',
  custom: 'Custom',
  basic: 'Basic',
  active: 'Active',
  black: 'Black',
  white: 'White',
  classic: 'Classic',
  kids: 'Kids',
  right_left: 'Right-Left',
  'right-left': 'Right-Left',
  up_down: 'Up-Down',
  'up-down': 'Up-Down',
  true: 'Active',
  false: 'Inactive'
});

const asObject = (value) => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {}
);

const asArray = (value) => (Array.isArray(value) ? value : []);

const sameValue = (left, right) => (
  JSON.stringify(left ?? null) === JSON.stringify(right ?? null)
);

const displayValue = (value) => {
  if (value === null || value === undefined || value === '') return '없음';
  if (Object.prototype.hasOwnProperty.call(VALUE_LABELS, String(value))) {
    return VALUE_LABELS[String(value)];
  }
  if (typeof value === 'number') return String(value);
  return String(value);
};

const contentIdentity = (content, index) => {
  const source = asObject(content);
  return String(
    source.contentId ||
    source.contentName ||
    `index-${index}`
  );
};

const buildProgramHistoryDiff = (beforeConfig, afterConfig) => {
  const before = asObject(beforeConfig);
  const after = asObject(afterConfig);
  const changes = [];

  const addChange = ({
    programKey,
    section,
    label,
    beforeValue,
    afterValue,
    details
  }) => {
    changes.push({
      programKey,
      programName: PROGRAM_NAMES[programKey] || programKey,
      section,
      label,
      before: beforeValue,
      after: afterValue,
      ...(details ? { details } : {})
    });
  };

  const compareValue = (
    programKey,
    section,
    label,
    beforeValue,
    afterValue,
    formatter = displayValue
  ) => {
    if (sameValue(beforeValue, afterValue)) return;
    addChange({
      programKey,
      section,
      label,
      beforeValue: formatter(beforeValue, afterValue),
      afterValue: formatter(afterValue, beforeValue)
    });
  };

  const compareFile = (
    programKey,
    section,
    label,
    beforeValue,
    afterValue
  ) => {
    if (sameValue(beforeValue, afterValue)) return;
    const beforeExists = typeof beforeValue === 'string' && beforeValue.trim().length > 0;
    const afterExists = typeof afterValue === 'string' && afterValue.trim().length > 0;
    addChange({
      programKey,
      section,
      label,
      beforeValue: beforeExists
        ? (afterExists ? '기존 파일' : '등록됨')
        : '미등록',
      afterValue: afterExists
        ? (beforeExists ? '변경 파일' : '등록됨')
        : '미등록'
    });
  };

  const compareCollection = (
    programKey,
    section,
    label,
    beforeValue,
    afterValue
  ) => {
    const oldItems = asArray(beforeValue);
    const newItems = asArray(afterValue);
    if (sameValue(oldItems, newItems)) return;

    const oldSet = new Set(oldItems.map((item) => JSON.stringify(item)));
    const newSet = new Set(newItems.map((item) => JSON.stringify(item)));
    const addedCount = [...newSet].filter((item) => !oldSet.has(item)).length;
    const removedCount = [...oldSet].filter((item) => !newSet.has(item)).length;
    const reordered =
      oldItems.length === newItems.length &&
      addedCount === 0 &&
      removedCount === 0;

    addChange({
      programKey,
      section,
      label,
      beforeValue: `${oldItems.length}개`,
      afterValue: `${newItems.length}개`,
      details: {
        beforeCount: oldItems.length,
        afterCount: newItems.length,
        addedCount,
        removedCount,
        reordered
      }
    });
  };

  const launchProgramKey = (
    after.launchOnStartup && after.launchOnStartup !== 'none'
      ? after.launchOnStartup
      : before.launchOnStartup && before.launchOnStartup !== 'none'
        ? before.launchOnStartup
        : 'common'
  );
  compareValue(
    launchProgramKey,
    'Launch on Startup',
    '시작 콘텐츠',
    before.launchOnStartup,
    after.launchOnStartup
  );
  compareValue(
    'common',
    'Idle Launch Delay',
    '자동 실행 대기 시간(초)',
    before.idleLaunchDelaySeconds,
    after.idleLaunchDelaySeconds
  );

  const compareGallery = (programKey, beforeGallery, afterGallery, isPhoto) => {
    const oldGallery = asObject(beforeGallery);
    const newGallery = asObject(afterGallery);

    compareValue(programKey, 'Active', '콘텐츠 활성화', oldGallery.isActive, newGallery.isActive);
    compareValue(programKey, 'Background Image', '배경 이미지 설정', oldGallery.backgroundMode, newGallery.backgroundMode);
    compareFile(programKey, 'Background Image', '배경 이미지 파일', oldGallery.backgroundImageUrl, newGallery.backgroundImageUrl);
    compareValue(programKey, 'Background Music', '배경 음악 설정', oldGallery.musicMode, newGallery.musicMode);
    compareFile(programKey, 'Background Music', '배경 음악 파일', oldGallery.musicFileUrl, newGallery.musicFileUrl);
    compareValue(programKey, 'Sound Effect', '효과음 설정', oldGallery.effectMode, newGallery.effectMode);
    compareFile(programKey, 'Sound Effect', '효과음 파일', oldGallery.effectFileUrl, newGallery.effectFileUrl);
    compareValue(programKey, 'Motion Type', '모션 방식', oldGallery.motionType, newGallery.motionType);
    compareValue(programKey, 'Drawing Timer', '체험 시간(분)', oldGallery.drawingTimerMinutes, newGallery.drawingTimerMinutes);

    if (isPhoto) {
      compareValue(programKey, 'Stickers', '스티커 방식', oldGallery.stickerMode, newGallery.stickerMode);
      compareCollection(programKey, 'Stickers', '스티커 컬렉션', oldGallery.stickerImageUrls, newGallery.stickerImageUrls);
      compareValue(programKey, 'Camera', '카메라 장치', oldGallery.cameraDeviceName, newGallery.cameraDeviceName);
    } else {
      compareValue(programKey, 'Drawing List', '도안 방식', oldGallery.drawingListMode, newGallery.drawingListMode);
      compareCollection(programKey, 'Drawing List', '도안 컬렉션', oldGallery.drawingImageUrls, newGallery.drawingImageUrls);
    }
  };

  compareGallery('vividFriends', before.vividFriends, after.vividFriends, false);
  compareGallery('hereMyPhoto', before.hereMyPhoto, after.hereMyPhoto, true);

  const oldLibrary = asObject(before.immersiveLibrary);
  const newLibrary = asObject(after.immersiveLibrary);
  compareValue('immersiveLibrary', 'Active', '콘텐츠 활성화', oldLibrary.isActive, newLibrary.isActive);
  compareValue('immersiveLibrary', 'Content Source', '콘텐츠 방식', oldLibrary.launchMode, newLibrary.launchMode);
  compareValue('immersiveLibrary', 'Content Source', 'Basic 패키지 사용', oldLibrary.isBasic, newLibrary.isBasic);

  const oldContents = asArray(oldLibrary.contents);
  const newContents = asArray(newLibrary.contents);
  const oldContentMap = new Map(
    oldContents.map((content, index) => [contentIdentity(content, index), asObject(content)])
  );
  const newContentMap = new Map(
    newContents.map((content, index) => [contentIdentity(content, index), asObject(content)])
  );
  const addedContentIds = [...newContentMap.keys()].filter((id) => !oldContentMap.has(id));
  const removedContentIds = [...oldContentMap.keys()].filter((id) => !newContentMap.has(id));

  if (addedContentIds.length || removedContentIds.length) {
    addChange({
      programKey: 'immersiveLibrary',
      section: 'Content List',
      label: '콘텐츠 목록',
      beforeValue: `${oldContents.length}개`,
      afterValue: `${newContents.length}개`,
      details: {
        beforeCount: oldContents.length,
        afterCount: newContents.length,
        addedCount: addedContentIds.length,
        removedCount: removedContentIds.length
      }
    });
  }
  if (addedContentIds.length > 0) {
    addChange({
      programKey: 'immersiveLibrary',
      section: 'Add Content',
      label: '추가 콘텐츠',
      beforeValue: '0개',
      afterValue: `${addedContentIds.length}개`,
      details: { addedCount: addedContentIds.length }
    });
  }
  if (removedContentIds.length > 0) {
    addChange({
      programKey: 'immersiveLibrary',
      section: 'Del Content',
      label: '삭제 콘텐츠',
      beforeValue: '0개',
      afterValue: `${removedContentIds.length}개`,
      details: { removedCount: removedContentIds.length }
    });
  }

  const oldOrder = oldContents.map(contentIdentity);
  const newOrder = newContents.map(contentIdentity);
  if (
    addedContentIds.length === 0 &&
    removedContentIds.length === 0 &&
    !sameValue(oldOrder, newOrder)
  ) {
    addChange({
      programKey: 'immersiveLibrary',
      section: 'Content Order',
      label: '콘텐츠 순서',
      beforeValue: '기존 순서',
      afterValue: '변경됨'
    });
  }

  for (const [contentId, oldContent] of oldContentMap.entries()) {
    const newContent = newContentMap.get(contentId);
    if (!newContent) continue;
    const contentName = newContent.contentName || oldContent.contentName || contentId;

    compareValue('immersiveLibrary', 'Edit Content', `${contentName} 제목`, oldContent.contentName, newContent.contentName);
    compareFile('immersiveLibrary', 'Edit Content', `${contentName} 타이틀 이미지`, oldContent.titleImageUrl, newContent.titleImageUrl);
    compareFile('immersiveLibrary', 'Edit Content', `${contentName} 프로젝터 영상`, oldContent.projectionMediaUrl, newContent.projectionMediaUrl);
    compareCollection('immersiveLibrary', 'Edit Content', `${contentName} 카드 이미지`, oldContent.cardImageUrls, newContent.cardImageUrls);
  }

  const grouped = new Map();
  for (const change of changes) {
    if (!grouped.has(change.programKey)) {
      grouped.set(change.programKey, {
        key: change.programKey,
        name: change.programName,
        sections: []
      });
    }
    const group = grouped.get(change.programKey);
    if (!group.sections.includes(change.section)) {
      group.sections.push(change.section);
    }
  }

  const changedPrograms = [...grouped.values()];
  const changeSummary = changedPrograms.length > 0
    ? changedPrograms
      .map((program) => `${program.name}: ${program.sections.join(', ')}`)
      .join(' | ')
    : '변경된 설정 없음';

  return {
    changes,
    changedPrograms,
    changeSummary
  };
};

const parseJsonColumn = (value, fallback) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const formatHistoryReport = (row) => {
  const changes = parseJsonColumn(row.changes, []);
  const executionType = row.executionType === 'scheduled'
    ? '예약 실행'
    : '즉시 실행';
  const executedAt = row.executedAt instanceof Date
    ? row.executedAt.toISOString().replace('T', ' ').slice(0, 19)
    : String(row.executedAt || '');

  const lines = [
    'MOMU 업데이트 보고서',
    '============================================================',
    '',
    '■ 업데이트 정보',
    `업데이트 일시 : ${executedAt}`,
    `장치명        : ${row.deviceName || `Device ${row.deviceSeq}`}`,
    `기관명        : ${row.companyName || '-'}`,
    `실행자        : ${row.managerName || row.id}`,
    `연락처        : ${row.managerPhone || '-'}`,
    `실행 방식     : ${executionType}`,
    `실행 결과     : ${row.executionStatus === 'success' ? '정상 완료' : row.executionStatus}`,
    '',
    '■ 변경된 설정'
  ];

  if (!Array.isArray(changes) || changes.length === 0) {
    lines.push('- 변경된 설정 없음');
  } else {
    for (const change of changes) {
      lines.push(
        `- ${change.programName} / ${change.label}: ` +
        `${change.before} → ${change.after}`
      );
      if (change.details) {
        const detail = change.details;
        const detailParts = [];
        if (Number(detail.addedCount) > 0) detailParts.push(`추가 ${detail.addedCount}개`);
        if (Number(detail.removedCount) > 0) detailParts.push(`삭제 ${detail.removedCount}개`);
        if (detail.reordered) detailParts.push('순서 변경');
        if (detailParts.length > 0) lines.push(`  └ ${detailParts.join(', ')}`);
      }
    }
  }

  lines.push(
    '',
    '■ 변경 요약',
    `변경된 설정: ${Array.isArray(changes) ? changes.length : 0}건`,
    row.changeSummary || '변경된 설정 없음',
    '',
    '■ 비고',
    '본 보고서는 업데이트 시점의 설정 변경 내역을 자동으로 생성한 기록입니다.',
    '변경된 파일의 URL과 실제 파일 정보는 포함되지 않습니다.',
    '',
    'Generated by MOMU MO-CMS'
  );

  return lines.join('\r\n');
};

module.exports = {
  buildProgramHistoryDiff,
  formatHistoryReport,
  parseJsonColumn
};
