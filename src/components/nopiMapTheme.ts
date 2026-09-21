import stopImage from '../assets/map/nopi-stop.png';
import arrivalImage from '../assets/map/nopi-arrival.png';
import departureImage from '../assets/map/nopi-departure.png';

export const nopiMapImages = { stop: stopImage, arrival: arrivalImage, departure: departureImage };

export function nopiMarkerAppearance(points: readonly { lng: number }[], index: number) {
  // Arrival takes priority for a one-stop course. Kakao maps stay north-up,
  // so increasing longitude is also movement toward the right of the screen.
  const kind = index === points.length - 1 ? 'arrival' : index === 0 ? 'departure' : 'stop';
  const facingRight = kind === 'stop' && points[index + 1].lng > points[index].lng;
  return { image: nopiMapImages[kind], className: `is-${kind}${facingRight ? ' faces-right' : ''}` };
}

// Fixed pixel widths keep the translucent jelly readable at every map zoom.
export const jellyRouteLayers = [
  { strokeWeight: 16, strokeColor: '#8060bd', strokeOpacity: 0.32, zIndex: 0 },
  { strokeWeight: 12, strokeColor: '#bea5f0', strokeOpacity: 0.68, zIndex: 1 },
  { strokeWeight: 4, strokeColor: '#f5edff', strokeOpacity: 0.8, zIndex: 2 },
] as const;
