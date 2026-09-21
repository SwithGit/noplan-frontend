import type { TravelNeeds } from './travelNeeds';
import { t as uiText } from '../../i18n/translate';
import { useState } from 'react';
import type { TourismAttraction } from '../../api/tourismApi';
import { TourismPicker } from './TourismPicker';
import { DirectPlacePicker } from './DirectPlacePicker';
import { attractionFromPlace } from './tourismModel';
import { tourismNode } from './nopiModel';
import { excludedPlace, validatePickedPlace } from './placeIdentity';
import type { TripPlace } from './tripModel';

export function PlacePicker({ needs, destination, initial, context, excluded = {}, onClose, onSelect }: {
  needs?: TravelNeeds; destination: string; initial?: TripPlace; context: string; excluded?: Record<string, string>;
  onClose: () => void; onSelect: (place: TripPlace, attraction?: TourismAttraction) => void;
}) {
  const [direct, setDirect] = useState(Boolean(initial && !initial.tourism));
  const select = (place: TripPlace, attraction?: TourismAttraction) => {
    validatePickedPlace(place);
    const duplicate = excludedPlace(place, excluded);
    if (duplicate) throw Error(`${duplicate} · 이미 담은 장소예요.`);
    if (initial?.requiredVisit && (!place.tourism || place.tourism.contentTypeId === '25')) throw Error('필수 방문을 유지하려면 추천 관광지에서 개별 장소를 골라 주세요.');
    onSelect(initial?.requiredVisit ? { ...place, requiredVisit: initial.requiredVisit } : place, attraction);
  };
  return direct ? <DirectPlacePicker needs={needs} destination={destination} initial={initial} context={uiText(context)} excluded={excluded} onClose={onClose} onRecommended={() => setDirect(false)} onSelect={select} />
    : <TourismPicker needs={needs} destination={destination} initial={initial?.tourism ? attractionFromPlace(initial) : undefined} initialDuration={initial?.durationMinutes || 75} context={uiText(context)} disabledPlaces={excluded} onClose={onClose} onDirectSearch={() => setDirect(true)} onSelect={(attraction, duration) => select(tourismNode(attraction, duration).place, attraction)} />;
}
