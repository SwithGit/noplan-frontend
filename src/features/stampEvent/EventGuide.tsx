import { useState } from 'react';
import { EventDialog } from './EventDialog';
import { guideSteps } from './eventModel';

export function EventGuide({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const item = guideSteps[step];
  return <EventDialog title="참여 방법" onClose={onClose}>
    <div className="ne-guide" aria-live="polite">
      <span className="ne-tag">STEP {String(step + 1).padStart(2, '0')}</span>
      <h3>{item.title}</h3>
      <div className="ne-guide-art"><img src={`/images/stamp-event/guide-${step + 1}.webp`} alt="" /></div>
      <p>{item.description}</p>
      <div className="ne-dots" aria-label={`${step + 1} / 5 단계`}>{guideSteps.map((_, i) => <span key={i} className={step === i ? 'active' : ''} />)}</div>
    </div>
    <div className="ne-actions">{step > 0 && <button type="button" className="ne-secondary" onClick={() => setStep(step - 1)}>이전</button>}<button type="button" className="ne-primary" onClick={() => step === 4 ? onClose() : setStep(step + 1)}>{step === 4 ? '확인' : '다음 →'}</button></div>
  </EventDialog>;
}
