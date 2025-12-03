/// Helper functions to get district/keyword/payment/weekday by name
import { District, Districts } from './districts.const';
import { Keyword, Keywords } from './keywords.const';
import { PaymentMethod, PaymentMethods } from './payments.const';
import { Weekday, Weekdays } from './weekdays.const';

// District helpers
export function getDistrictByEN(enName: string): District | undefined {
  return Districts.find(d => d.en === enName);
}

export function getDistrictByTC(tcName: string): District | undefined {
  return Districts.find(d => d.tc === tcName);
}

// Keyword helpers
export function getKeywordByEN(enName: string): Keyword | undefined {
  return Keywords.find(k => k.en === enName);
}

export function getKeywordByTC(tcName: string): Keyword | undefined {
  return Keywords.find(k => k.tc === tcName);
}

// Payment method helpers
export function getPaymentMethodByEN(enName: string): PaymentMethod | undefined {
  return PaymentMethods.find(p => p.en === enName);
}

export function getPaymentMethodByTC(tcName: string): PaymentMethod | undefined {
  return PaymentMethods.find(p => p.tc === tcName);
}

// Weekday helpers
export function getWeekdayByEN(enName: string): Weekday | undefined {
  return Weekdays.find(w => w.en === enName);
}

export function getWeekdayByTC(tcName: string): Weekday | undefined {
  return Weekdays.find(w => w.tc === tcName);
}

// Get sorted lists for dropdowns
export function getDistrictOptions(lang: 'EN' | 'TC'): string[] {
  return Districts.map(d => lang === 'TC' ? d.tc : d.en).sort();
}

export function getKeywordOptions(lang: 'EN' | 'TC'): string[] {
  return Keywords.map(k => lang === 'TC' ? k.tc : k.en).sort();
}

export function getPaymentMethodOptions(lang: 'EN' | 'TC'): string[] {
  return PaymentMethods.map(p => lang === 'TC' ? p.tc : p.en);
}

export function getWeekdayOptions(lang: 'EN' | 'TC'): string[] {
  return Weekdays.map(w => lang === 'TC' ? w.tc : w.en);
}
