import {useCallback,useState} from 'react';
import {useLocale,translate} from '../../lib/i18n';
export function useTextGuide(){
 const {language}=useLocale();
 const [caption,setCaption]=useState('');
 const show=useCallback((text:string)=>setCaption(translate(text,language)),[language]);
 return {caption,show};
}
