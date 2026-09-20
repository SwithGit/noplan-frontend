import { useEffect, useState } from 'react';
import { getTripCollaboration, tripHeartbeat, type TripCollaborationState } from '../../api/tripsApi';
import { t } from '../../i18n/translate';
import { getLocale } from '../../i18n/locale';
import './tripSharing.css';
export function TripCollaborationBar({id,editing}:{id:string;editing:boolean}) {
  const [data,setData]=useState<TripCollaborationState>(),[error,setError]=useState(false);
  useEffect(()=>{let active=true,busy=false;
    const load=async()=>{if(busy||document.visibilityState==='hidden')return;busy=true;try{await tripHeartbeat(id,editing);const value=await getTripCollaboration(id);if(active){setData(value);setError(false);}}catch{if(active)setError(true);}finally{busy=false;}};
    void load();const timer=window.setInterval(()=>void load(),15000);const focus=()=>void load();window.addEventListener('focus',focus);
    return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',focus);};
  },[id,editing]);
  return <div className="trip-collaboration-bar"><div className="trip-presence">{data?.members.map(member=><span key={member.userId} title={t(member.online?member.editing?'코스 편집 중':'접속 중':'자리 비움')}><i className={member.online?'online':''}/>{member.nickname}<small>{t(member.online?member.editing?'코스 편집 중':'접속 중':'자리 비움')}</small></span>)}</div><details><summary>{t('변경 내역')}</summary><div className="trip-activity-list">{error&&<p>{t('참여자와 변경 내역을 불러오지 못했어요.')}</p>}{!error&&!data?.activity.length&&<p>{t('아직 기록된 변경사항이 없어요.')}</p>}{data?.activity.map(item=><article key={item.version}><strong>{item.nickname}</strong><time>{new Date(item.createdAt).toLocaleString(getLocale())}</time>{item.summary.map((summary,index)=><p key={index}>{summary.date&&`${summary.date} · `}{t(summary.type==='conditions_updated'?'여행 조건 수정':summary.type==='day_added'?'날짜 추가':summary.type==='day_removed'?'날짜 삭제':'일정 수정')}{!!summary.added&&` · ${t('장소 추가')} ${summary.added}`}{!!summary.removed&&` · ${t('장소 삭제')} ${summary.removed}`}</p>)}</article>)}</div></details></div>;
}
