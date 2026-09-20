import { useEffect, useState } from 'react';
import { t } from '../../i18n/translate';
import { getLocale } from '../../i18n/locale';
import { createTripInvite, createTripPublicLink, getTripMembers, removeTripMember, revokeTripInvite, revokeTripPublicLink, type TripMember } from '../../api/tripsApi';
import { ROUTES } from '../../routes';
import { TripDialog } from './TripDialog';
import type { TripRecord } from './tripModel';
import './tripSharing.css';

export function TripSharing({trip,onClose}:{trip:TripRecord;onClose:()=>void}) {
  const [tab,setTab] = useState<'view'|'edit'>('view');
  const [members,setMembers] = useState<TripMember[]>([]);
  const [links,setLinks] = useState<Partial<Record<'view'|'edit',{url:string;expiresAt:string}>>>({});
  const [busy,setBusy] = useState(false), [message,setMessage] = useState('');
  const owner = trip.collaboration?.role === 'owner', link = links[tab];
  useEffect(()=>{let active=true;getTripMembers(trip.id).then(value=>{if(active)setMembers(value);}).catch(()=>{if(active)setMessage('참여자를 불러오지 못했어요.');});return()=>{active=false;};},[trip.id]);
  const perform = async(action:()=>Promise<void>)=>{setBusy(true);setMessage('');try{await action();}catch(cause){setMessage(cause instanceof Error?cause.message:'처리하지 못했어요. 다시 시도해 주세요.');}finally{setBusy(false);}};
  return <TripDialog title={t('여행 공유')} className="trip-sharing-dialog" onClose={onClose}>
    <div className="trip-sharing-tabs"><button type="button" aria-pressed={tab==='view'} onClick={()=>{setTab('view');setMessage('');}}>{t('일정 보기 링크')}</button><button type="button" aria-pressed={tab==='edit'} onClick={()=>{setTab('edit');setMessage('');}}>{t('함께 편집 초대')}</button></div>
    <div className="trip-share-explanation"><h3>{t(tab==='view'?'로그인 없이 여행을 보여주세요.':'친구와 같은 여행을 함께 수정해요.')}</h3><p>{t(tab==='view'?'링크를 받은 사람은 날짜·장소·시간과 지도를 볼 수 있어요. 개인 메모와 동행 조건은 공개되지 않아요.':'초대받은 친구는 로그인 후 장소·시간·메모를 수정할 수 있어요. 변경사항은 자동 저장돼요.')}</p></div>
    {owner ? <div className="trip-invite-controls">
      <p className="trip-muted">{t(tab==='view'?'보기 링크는 30일 동안 유효해요. 새로 만들면 이전 보기 링크는 만료돼요.':'편집 초대는 7일 동안 유효해요. 새로 만들면 이전 초대 링크는 만료돼요.')}</p>
      <button type="button" className="trip-button primary" disabled={busy} onClick={()=>void perform(async()=>{
        const result = await (tab==='view'?createTripPublicLink(trip.id):createTripInvite(trip.id));
        setLinks(previous=>({...previous,[tab]:{url:`${window.location.origin}${tab==='view'?ROUTES.tripShared:ROUTES.tripJoin}#${result.token}`,expiresAt:result.expiresAt}}));
        setMessage('링크를 만들었어요. 복사해서 친구에게 보내 주세요.');
      })}>{t(busy?'처리 중…':link?'새 링크 만들기':'링크 만들기')}</button>
      {link && <><label className="trip-field">{t(tab==='view'?'일정 보기 링크':'함께 편집 초대')}<input readOnly value={link.url} onFocus={e=>e.currentTarget.select()}/></label><div className="trip-timeline-actions"><button type="button" className="trip-button" disabled={busy} onClick={()=>void perform(async()=>{await navigator.clipboard.writeText(link.url);setMessage('링크를 복사했어요.');})}>{t('링크 복사')}</button>{tab==='view'&&<a className="trip-button" href={link.url} target="_blank" rel="noreferrer">{t('공유 화면 미리보기')}</a>}</div><small>{new Date(link.expiresAt).toLocaleDateString(getLocale())} · {t('링크 만료일')}</small></>}
      <button className="trip-text-link" type="button" disabled={busy} onClick={()=>void perform(async()=>{await(tab==='view'?revokeTripPublicLink(trip.id):revokeTripInvite(trip.id));setLinks(previous=>({...previous,[tab]:undefined}));setMessage(tab==='view'?'보기 링크를 만료했어요. 친구의 편집 권한은 유지돼요.':'편집 초대를 만료했어요. 이미 참여한 친구의 권한은 유지돼요.');})}>{t('이 종류의 링크 만료시키기')}</button>
    </div> : <p className="trip-muted">{t('공유 링크와 참여자 관리는 여행을 만든 사람이 할 수 있어요.')}</p>}
    <h3>{t('함께하는 사람')} · {members.length}</h3>
    <ul className="trip-member-list">{members.map(member=><li key={member.userId}><span><strong>{member.nickname}</strong><small>{t(member.role==='owner'?'여행 만든 사람':'함께 편집')}</small></span>{owner&&member.role!=='owner'&&<button type="button" className="trip-text-link" disabled={busy} onClick={()=>{if(!window.confirm(t('이 친구의 편집 권한을 해제할까요? 기존 편집 초대 링크도 만료돼요.')))return;void perform(async()=>{await removeTripMember(trip.id,member.userId);setLinks(previous=>({...previous,edit:undefined}));setMembers(await getTripMembers(trip.id));setMessage('참여자를 제외하고 기존 초대 링크를 만료했어요.');});}}>{t('제외')}</button>}</li>)}</ul>
    {message&&<p className="trip-alert" role="status">{t(message)}</p>}
  </TripDialog>;
}
