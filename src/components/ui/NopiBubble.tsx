import nopiImage from '../../assets/nopi/nopi.png';

interface NopiBubbleProps {
  title: string;
  body?: string;
  compact?: boolean;
}

export function NopiBubble({ title, body, compact = false }: NopiBubbleProps) {
  return (
    <section className={`nopi-bubble-row ${compact ? 'is-compact' : ''}`}>
      <img alt="" className="nopi-bubble-avatar" src={nopiImage} />
      <div className="nopi-bubble">
        <strong>{title}</strong>
        {body && <span>{body}</span>}
      </div>
    </section>
  );
}
