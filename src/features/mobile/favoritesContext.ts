import { createContext, useContext } from 'react';
import type { Favorite, FavoriteInput } from './mobileModel';
import type { UserSession } from '../../types/noplan';
export interface FavoritesState { user:UserSession|null; items:Favorite[]; loading:boolean; busy:boolean; error:string; reload:()=>void; toggle:(item:FavoriteInput)=>Promise<void> }
export const FavoritesContext=createContext<FavoritesState|null>(null);
export function useFavorites(){const value=useContext(FavoritesContext);if(!value)throw new Error('FavoritesProvider is required');return value;}
