import { useEffect, useRef, useState, type PointerEvent } from 'react';

type Drag = {from:number;to:number;pointerId:number;x:number;y:number;scroller:HTMLElement};

export function useStopDrag(count: number, disabled: boolean, onMove: (from:number,to:number)=>void) {
  const listRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const frame = useRef(0);
  const [preview,setPreview] = useState<{from:number;to:number} | null>(null);
  const stop = () => { cancelAnimationFrame(frame.current); drag.current=null; setPreview(null); };
  useEffect(()=>()=>cancelAnimationFrame(frame.current),[]);

  const updateTarget = () => {
    const current = drag.current, list = listRef.current;
    if (!current || !list) return;
    const rect = list.getBoundingClientRect();
    let to = -1;
    if (current.x >= rect.left-24 && current.x <= rect.right+24) {
      list.querySelectorAll<HTMLElement>('[data-stop-index]').forEach(node=>{
        const bounds=node.getBoundingClientRect();
        if (current.y >= bounds.top && current.y <= bounds.bottom) to=Number(node.dataset.stopIndex);
      });
    }
    if (current.to!==to) {current.to=to;setPreview({from:current.from,to});}
  };
  const scroll = () => {
    const current=drag.current;
    if (!current) return;
    const bounds=current.scroller===document.scrollingElement
      ? {top:0,bottom:window.innerHeight} : current.scroller.getBoundingClientRect();
    const dy=current.y < bounds.top+80 ? -9 : current.y > bounds.bottom-100 ? 9 : 0;
    if (dy) {current.scroller.scrollTop+=dy;updateTarget();}
    frame.current=requestAnimationFrame(scroll);
  };
  const handleProps = (index:number, name:string) => ({
    type:'button' as const,
    disabled:disabled || count<2,
    'aria-label':`${index+1}번 ${name} 순서 변경. 드래그하거나 위아래 방향키를 누르세요.`,
    'aria-describedby':'course-reorder-help',
    onPointerDown:(event:PointerEvent<HTMLButtonElement>)=>{
      if (disabled || count<2 || event.button!==0 || !event.isPrimary) return;
      event.preventDefault();
      event.currentTarget.focus({preventScroll:true});
      event.currentTarget.setPointerCapture(event.pointerId);
      let scroller=listRef.current?.parentElement;
      while (scroller && !(scroller.scrollHeight>scroller.clientHeight && /auto|scroll/.test(getComputedStyle(scroller).overflowY))) scroller=scroller.parentElement;
      drag.current={from:index,to:index,pointerId:event.pointerId,x:event.clientX,y:event.clientY,
        scroller:scroller || document.scrollingElement as HTMLElement};
      setPreview({from:index,to:index});
      frame.current=requestAnimationFrame(scroll);
    },
    onPointerMove:(event:PointerEvent<HTMLButtonElement>)=>{
      if (drag.current?.pointerId!==event.pointerId) return;
      drag.current.x=event.clientX;drag.current.y=event.clientY;updateTarget();
    },
    onPointerUp:(event:PointerEvent<HTMLButtonElement>)=>{
      const current=drag.current;
      if (!current || current.pointerId!==event.pointerId) return;
      current.x=event.clientX;current.y=event.clientY;updateTarget();
      const {from,to}=current;
      stop();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      if (to>=0 && from!==to && !disabled) onMove(from,to);
    },
    onPointerCancel:stop,
    onLostPointerCapture:stop,
    onKeyDown:(event:React.KeyboardEvent<HTMLButtonElement>)=>{
      if (event.key==='Escape') {stop();return;}
      const to=event.key==='ArrowUp'?index-1:event.key==='ArrowDown'?index+1:-1;
      if (!disabled && to>=0 && to<count) {event.preventDefault();onMove(index,to);}
    },
  });
  return {listRef,preview,handleProps};
}
