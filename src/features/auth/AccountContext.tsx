import {createContext,useContext} from 'react';
import type {Account} from '../../lib/api';
export const AccountContext=createContext<{user:Account;logout:()=>void;openAdmin:()=>void}|null>(null);
export function useAccount(){const value=useContext(AccountContext);if(!value)throw new Error('Account required');return value;}
