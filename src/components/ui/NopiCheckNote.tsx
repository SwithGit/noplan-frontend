import type { ReactNode } from 'react';
import nopiCheck from '../../assets/nopi/nopi-check.png';
import './nopiCheckNote.css';

export function NopiCheckNote({ children }: { children: ReactNode }) {
  return <span className="nopi-check-note"><img src={nopiCheck} alt="" aria-hidden="true" loading="lazy" /><span>{children}</span></span>;
}
