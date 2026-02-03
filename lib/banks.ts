/**
 * List of Nepalese financial institutions for IPO applications
 */

export const BANKS = [
  // Commercial Banks - Class A
  'Nepal Bank Ltd.',
  'Rastriya Banijya Bank Ltd.',
  'Agriculture Development Bank Ltd.',
  'Nabil Bank Ltd.',
  'Nepal Investment Mega Bank Ltd.',
  'Standard Chartered Bank Nepal Ltd.',
  'Himalayan Bank Ltd.',
  'Nepal SBI Bank Ltd.',
  'Everest Bank Ltd.',
  'NIC ASIA Bank Ltd.',
  'Machhapuchchhre Bank Ltd.',
  'Kumari Bank Ltd.',
  'Laxmi Sunrise Bank Ltd.',
  'Siddhartha Bank Ltd.',
  'Global IME Bank Ltd.',
  'Citizens Bank International Ltd.',
  'Prime Commercial Bank Ltd.',
  'NMB Bank Ltd.',
  'Prabhu Bank Ltd.',
  'Sanima Bank Ltd.',
  
  // Development Banks - Class B
  'Muktinath Bikas Bank Ltd.',
  'Jyoti Bikas Bank Ltd.',
  'Garima Bikas Bank Ltd.',
  'Mahalaxmi Bikas Bank Ltd.',
  'Lumbini Bikas Bank Ltd.',
  'Shangrila Development Bank Ltd.',
  'Kamana Sewa Bikas Bank Ltd.',
  'Shine Resunga Development Bank Ltd.',
  'Excel Development Bank Ltd.',
  'Miteri Development Bank Ltd.',
  'Karnali Development Bank Ltd.',
  'Corporate Development Bank Ltd.',
  'Sindhu Bikas Bank Ltd.',
  'Saptakoshi Development Bank Ltd.',
  'Green Development Bank Ltd.',
  'Narayani Development Bank Ltd.',
  'Salapa Bikas Bank Ltd.',
  
  // Finance Companies - Class C
  'Nepal Finance Ltd.',
  'Nepal Share Markets and Finance Ltd.',
  'Goodwill Finance Ltd.',
  'Progressive Finance Ltd.',
  'Janaki Finance Company Ltd.',
  'Pokhara Finance Ltd.',
  'Central Finance Ltd.',
  'Multipurpose Finance Ltd.',
  'Samriddhi Finance Company Ltd.',
  'Guheshwori Merchant Banking & Finance Ltd.',
  'ICFC Finance Ltd.',
  'Manjushree Finance Ltd.',
  'Reliance Finance Ltd.',
  'Gorkhas Finance Ltd.',
  'Shree Investment & Finance Company Ltd.',
  'Best Finance Ltd.',
  'Capital Merchant Banking & Finance Company Ltd.',
] as const;

export type BankName = typeof BANKS[number];
