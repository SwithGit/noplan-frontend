import { useState } from 'react';
import { stampImage } from './eventModel';

export function StampArrival({ id, onFinish }: { id: number; onFinish: () => void }) {
  const [ready, setReady] = useState(false);
  return <div className={`ne-arrival ${ready ? 'ne-arrival-ready' : ''}`}>
    <img src={stampImage(id)} alt={`노피 ${id} 스탬프`} onLoad={() => setReady(true)} onError={onFinish}
      onAnimationEnd={event => { if (event.animationName === 'ne-nopi-arrive') onFinish(); }} />
    <div className="ne-arrival-sparkles" aria-hidden="true"><i>✦</i><i>✧</i><i>♥</i><i>✦</i><i>•</i><i>•</i></div>
  </div>;
}
