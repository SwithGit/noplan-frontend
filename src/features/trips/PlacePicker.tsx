import { t as uiText } from '../../i18n/translate';
import { useState } from 'react';
import type { TourismAttraction } from '../../api/tourismApi';
import { TourismPicker } from './TourismPicker';
import { DirectPlacePicker } from './DirectPlacePicker';
import { attractionFromPlace } from './tourismModel';
import { tourismNode } from './nopiModel';
import { excludedPlace, validatePickedPlace } from './placeIdentity';
import type { TripPlace } from './tripModel';

export function PlacePicker({ destination, initial, context, excluded = {}, onClose, onSelect }: {
  destination: string; initial?: TripPlace; context: string; excluded?: Record<string, string>;
  onClose: () => void; onSelect: (place: TripPlace, attraction?: TourismAttraction) => void;
}) {
  const [direct, setDirect] = useState(Boolean(initial && !initial.tourism));
  const select = (place: TripPlace, attraction?: TourismAttraction) => {
    validatePickedPlace(place);
    const duplicate = excludedPlace(place, excluded);
    if (duplicate) throw Error(`${duplicate} · 이미 담은 장소예요.`);
    onSelect(place, attraction);
  };
  return direct ? <DirectPlacePicker destination={destination} initial={initial} context={uiText(context)} excluded={excluded} onClose={onClose} onRecommended={() => setDirect(false)} onSelect={select} />
    : <TourismPicker destination={destination} initial={initial?.tourism ? attractionFromPlace(initial) : undefined} initialDuration={initial?.durationMinutes || 75} context={uiText(context)} disabledPlaces={excluded} onClose={onClose} onDirectSearch={() => setDirect(true)} onSelect={(attraction, duration) => select(tourismNode(attraction, duration).place, attraction)} />;
}
