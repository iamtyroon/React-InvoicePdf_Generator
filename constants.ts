import { Currency } from './types';

export const COLORS = [
  '240 5.9% 10%',   // Theme Primary (Dark Blue/Black)
  '221.2 83.2% 53.3%', // Blue
  '0 84.2% 60.2%',  // Red (Destructive)
  '142.1 76.2% 36.3%', // Green
  '24.6 95% 53.1%',    // Orange
  '47.9 95.8% 53.1%', // Yellow
  '271.2 83.2% 53.3%', // Purple
  '240 3.8% 46.1%',    // Gray (Muted Foreground)
];

export const CURRENCIES: Currency[] = [
  { code: 'USD', name: 'United States Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
];

export const DEFAULT_INVOICE = {
  title: 'INVOICE',
  logoUrl: null,
  from: {
    name: '',
    email: '',
    address: '',
    phone: '',
    businessNumber: '',
  },
  to: {
    name: '',
    email: '',
    address: '',
    phone: '',
    mobile: '',
    fax: '',
  },
  number: '',
  date: new Date().toISOString().split('T')[0],
  terms: 'On Receipt',
  items: [],
  signatureUrl: null,
  color: COLORS[0],
  taxType: 'none' as const,
  taxValue: 0,
  discountType: 'none' as const,
  discountValue: 0,
  currency: CURRENCIES[3], // Default to KES
  bankDetails: {
    bankName: '',
    bankCity: '',
    branch: '',
    cardName: '',
    cardNumber: '',
    swiftCode: '',
  },
};