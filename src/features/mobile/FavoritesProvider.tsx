import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { UserSession } from '../../types/noplan';
import { deleteFavorite, fetchFavorites, putFavorite } from '../../api/libraryApi';
import { favoriteIdentity, type Favorite, type FavoriteInput } from './mobileModel';
import { FavoritesContext } from './favoritesContext';

export function FavoritesProvider({user,children}:{user:UserSession|null;children:ReactNode}) {
  const [items,setItems]=useState<Favorite[]>([]),[loading,setLoading]=useState(Boolean(user)),[busy,setBusy]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  const pending=useRef(false);
  useEffect(()=>{
    if(!user?.userId)return;
    let cancelled=false;
    fetchFavorites().then(result=>{if(!cancelled){setItems(result);setError('');}}).catch(cause=>{if(!cancelled)setError(cause instanceof Error?cause.message:'찜 목록을 불러오지 못했어요.');}).finally(()=>{if(!cancelled)setLoading(false);});
    return()=>{cancelled=true;};
  },[user?.userId,revision]);
  const toggle=async(item:FavoriteInput)=>{
    if(!user)throw new Error('로그인하면 마음에 든 곳을 보관할 수 있어요.');
    if(pending.current||loading)throw new Error('저장 상태를 확인하고 있어요. 잠시 후 다시 눌러주세요.');
    if(error)throw new Error('찜 목록을 먼저 다시 불러와 주세요.');
    pending.current=true;setBusy(true);
    try {
      const existing=items.find(value=>favoriteIdentity(value)===favoriteIdentity(item));
      if(existing){await deleteFavorite(existing.id);setItems(previous=>previous.filter(value=>value.id!==existing.id));}
      else{const saved=await putFavorite(item);setItems(previous=>[saved,...previous.filter(value=>value.id!==saved.id)]);}
    } finally {pending.current=false;setBusy(false);}
  };
  return <FavoritesContext.Provider value={{user,items,loading,busy,error,reload:()=>{setLoading(true);setRevision(value=>value+1);},toggle}}>{children}</FavoritesContext.Provider>;
}
