import {MessageCircle} from 'lucide-react';

const message='Bonjour NEOVA, je souhaite un audit gratuit pour mon entreprise.';
export const whatsappUrl=`https://wa.me/212704307637?text=${encodeURIComponent(message)}`;

export function WhatsAppLink({floating=false}:{floating?:boolean}){
  return <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={floating?'whatsapp-floating':'button whatsapp-button'} aria-label="Discuter avec NEOVA Flow AI sur WhatsApp (nouvel onglet)"><MessageCircle size={22} aria-hidden="true"/><span>{floating?'WhatsApp':'Discuter sur WhatsApp'}</span></a>;
}
