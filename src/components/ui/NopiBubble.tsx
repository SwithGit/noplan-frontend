import nopiIconImage from '../../assets/nopi/nopi-icon.png';

interface NopiBubbleProps {
  title: string;
  body?: string;
  compact?: boolean;
}

export function NopiBubble({ title, body, compact = false }: NopiBubbleProps) {
  return (
    <section className={`nopi-bubble-row ${compact ? 'is-compact' : ''}`}>
      <img alt="" className="nopi-bubble-avatar" src={nopiIconImage} />
      <div className="nopi-bubble">
        <strong>{title}</strong>
        {body && <span>{body}</span>}
      </div>
    </section>
  );
}
