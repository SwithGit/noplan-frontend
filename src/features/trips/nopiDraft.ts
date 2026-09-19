import type { DayRouteResult } from '../../api/dayRouteApi';
import { effectiveTransport, withDayTransport } from './coursePolicy';
import { courseDay, courseLegs, dayNodes, type CourseNode } from './nopiModel';
import { placeKeys } from './placeIdentity';
import type { TripDocument } from './tripModel';

export interface NopiDayDraft {
  nodes: CourseNode[];
  start: string;
  end: string;
  transport: TripDocument['transport'];
  manualTravel: Record<string, number>;
  routesResponse?: { key: string; routes?: DayRouteResult[]; error?: string };
  variant: number;
  edited: boolean;
  error: string;
  notice: string;
}
export function createNopiDrafts(document: TripDocument): Record<string, NopiDayDraft> {
  return Object.fromEntries(document.days.map(day => [day.id, {
    nodes: dayNodes(day), start: day.blocks[0]?.startTime || '09:00',
    end: day.blocks.filter(block => block.places.length).reduce((last, block) => block.endTime > last ? block.endTime : last, '18:00'),
    transport: effectiveTransport(document, day), manualTravel: {}, variant: 0, edited: false, error: '', notice: '',
  }]));
}
export const nopiRouteKey = (draft: Pick<NopiDayDraft, 'transport' | 'nodes'>) => JSON.stringify({ transport: draft.transport, legs: courseLegs(draft.nodes) });
export function nopiDraftExclusions(document: TripDocument, drafts: Record<string, NopiDayDraft>, exceptDayId: string) {
  const result: Record<string, string> = {};
  document.days.forEach((day, index) => {
    if (day.id !== exceptDayId) drafts[day.id].nodes.forEach(node => placeKeys(node.place).forEach(key => { result[key] = `DAY ${index + 1}에 담음`; }));
  });
  return result;
}
export function buildNopiDays(document: TripDocument, drafts: Record<string, NopiDayDraft>) {
  return document.days.flatMap((day, index) => {
    const draft = drafts[day.id];
    if (!draft.edited) return [];
    // Time settings for an empty day are drafts, not an instruction to erase it.
    if (!draft.nodes.length) {
      if (day.blocks.some(block => block.places.length)) throw Error(`DAY ${index + 1}의 장소를 모두 지웠어요. 장소를 담거나 기존 일정을 유지해 주세요.`);
      return [];
    }
    try {
      const routes = draft.routesResponse?.key === nopiRouteKey(draft) ? draft.routesResponse.routes || [] : [];
      return [withDayTransport(courseDay(day, draft.nodes, draft.start, draft.end, routes, nopiDraftExclusions(document, drafts, day.id), draft.manualTravel), draft.transport, document.transport)];
    } catch (cause) { throw Error(`DAY ${index + 1} · ${cause instanceof Error ? cause.message : '일정을 확인해 주세요.'}`); }
  });
}
