
export const WHATSAPP_NUMBER = '8615669529689';
export const WHATSAPP_DISPLAY = '+86 156 6952 9689';
export const WECHAT_ID = 'rosarystore';
export const CONTACT_EMAIL = 'intl@ouooo.com';

const generalInquiry = `Hello OUOOO, I would like to discuss a wholesale sourcing request.

Product or category:
Estimated quantity:
Destination country:
Customization or packaging requirements:`;

export function getWhatsAppUrl(message = generalInquiry): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message.trim())}`;
}

export function getProductWhatsAppUrl(product: { title: string; reference: string; url: string }): string {
  return getWhatsAppUrl(`Hello OUOOO, I am interested in this product.

Product: ${product.title}
Reference: ${product.reference}
Link: ${product.url}

Estimated quantity:
Destination country:
Customization or packaging requirements:`);
}

export const GENERAL_WHATSAPP_URL = getWhatsAppUrl();
