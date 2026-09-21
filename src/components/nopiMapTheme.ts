import stopImage from '../assets/map/nopi-stop.png';
import arrivalImage from '../assets/map/nopi-arrival.png';

export const nopiMapImages = { stop: stopImage, arrival: arrivalImage };

// Fixed pixel widths keep the translucent jelly readable at every map zoom.
export const jellyRouteLayers = [
  { strokeWeight: 16, strokeColor: '#8060bd', strokeOpacity: 0.32, zIndex: 0 },
  { strokeWeight: 12, strokeColor: '#bea5f0', strokeOpacity: 0.68, zIndex: 1 },
  { strokeWeight: 4, strokeColor: '#f5edff', strokeOpacity: 0.8, zIndex: 2 },
] as const;
