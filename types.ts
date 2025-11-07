
export interface InvoiceItem {
  id: string;
  description: string;
  details: string;
  quantity: number;
  rate: number;
}

export interface BusinessInfo {
  name: string;
  email: string;
  address: string;
  phone: string;
  businessNumber: string;
}

export interface ClientInfo {
  name: string;
  email: string;
  address: string;
  phone: string;
  mobile: string;
  fax: string;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

export interface BankDetails {
  bankName: string;
  bankCity: string;
  branch: string;
  cardName: string;
  cardNumber: string;
  swiftCode: string;
}

export interface Invoice {
  title: string;
  logoUrl: string | null;
  from: BusinessInfo;
  to: ClientInfo;
  number: string;
  date: string;
  terms: string;
  items: InvoiceItem[];
  signatureUrl: string | null;
  color: string;
  taxType: 'none' | 'percentage' | 'fixed';
  taxValue: number;
  discountType: 'none' | 'percentage' | 'fixed';
  discountValue: number;
  currency: Currency;
  bankDetails: BankDetails;
}