import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../routes';
import { useFavorites } from './favoritesContext';
import { favoriteIdentity, type FavoriteInput } from './mobileModel';
import nopi from '../../assets/nopi/nopi-home.png';

export function MobileIcon({name}:{name:'heart'|'arrow'|'pin'|'search'|'spark'|'close'|'clock'|'settings'|'route'}) {
  const paths:Record<string,ReactNode>={heart:<path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z"/>,arrow:<path d="m9 5 7 7-7 7"/>,pin:<><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></>,search:<><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></>,spark:<><path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/></>,close:<path d="m6 6 12 12M6 18 18 6"/>,clock:<><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,settings:<><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/></>,route:<><circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M6 7v7a5 5 0 0 0 5 5h5M12 5h4a4 4 0 0 1 0 8h-4"/></>};
  return <svg className="m-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
export function MobileHeading({eyebrow,title,description}:{eyebrow:string;title:ReactNode;description:string}) {return <header className="m-heading"><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div><img src={nopi} alt="" /></header>;}
export function EmptyState({title,children,action}:{title:string;children:ReactNode;action?:ReactNode}) {return <div className="m-empty"><img src={nopi} alt=""/><h2>{title}</h2><p>{children}</p>{action}</div>;}
export function FavoriteButton({item,compact=false}:{item:FavoriteInput;compact?:boolean}) {
  const {user,items,loading,busy,error,reload,toggle}=useFavorites();const [message,setMessage]=useState('');
  const selected=items.some(value=>favoriteIdentity(value)===favoriteIdentity(item));
  return <div className={`m-favorite-control ${compact?'compact':''}`}><button className={`m-heart ${selected?'selected':''}`} aria-label={`${item.title} ${selected?'찜 해제':'찜하기'}`} aria-pressed={selected} disabled={Boolean(user)&&(loading||busy)} type="button" onClick={()=>{setMessage('');void toggle(item).catch(cause=>setMessage(cause instanceof Error?cause.message:'찜을 저장하지 못했어요.'));}}><MobileIcon name="heart"/>{!compact&&<span>{selected?'찜했어요':'찜하기'}</span>}</button>{message&&<div className="m-save-message" role="status"><span>{message}</span>{!user?<Link to={ROUTES.login}>로그인</Link>:error?<button type="button" onClick={reload}>다시 불러오기</button>:null}<button type="button" aria-label="찜 안내 닫기" onClick={()=>setMessage('')}>닫기</button></div>}</div>;
}
