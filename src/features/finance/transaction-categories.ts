export type TransactionCategory = {
  name: string;
  symbol: string;
  color: string;
  keywords: readonly string[];
};

export const TRANSACTION_CATEGORIES: readonly TransactionCategory[] = [
  { name: 'Groceries', symbol: 'cart.fill', color: '#34C759', keywords: ['food', 'supermarket'] },
  { name: 'Grooming', symbol: 'scissors', color: '#AF52DE', keywords: ['hair', 'beauty', 'barber'] },
  { name: 'Eating Out', symbol: 'fork.knife', color: '#FF9500', keywords: ['restaurant', 'dining', 'meal'] },
  { name: 'Fuel', symbol: 'fuelpump.fill', color: '#A2845E', keywords: ['petrol', 'diesel', 'gasoline'] },
  { name: 'Transportation', symbol: 'bus.fill', color: '#0A84FF', keywords: ['taxi', 'bus', 'train', 'uber'] },
  { name: 'Subscriptions', symbol: 'repeat.circle.fill', color: '#5E5CE6', keywords: ['membership', 'recurring'] },
  { name: 'Fitness', symbol: 'figure.run', color: '#30B05A', keywords: ['gym', 'exercise', 'workout'] },
  { name: 'Miscell', symbol: 'square.grid.2x2.fill', color: '#8E8E93', keywords: ['miscellaneous', 'other'] },
  { name: 'Charity & Gifts', symbol: 'gift.fill', color: '#FF2D55', keywords: ['donation', 'giving'] },
  { name: 'Health & Wellness', symbol: 'heart.fill', color: '#FF3B30', keywords: ['medical', 'pharmacy', 'hospital'] },
  { name: 'Home Maintenance', symbol: 'hammer.fill', color: '#8E6B48', keywords: ['repair', 'house'] },
  { name: 'Home Improvement', symbol: 'paintbrush.fill', color: '#BF5AF2', keywords: ['renovation', 'decor'] },
  { name: 'Work & Career', symbol: 'briefcase.fill', color: '#5AC8FA', keywords: ['business', 'office', 'job'] },
  { name: 'Education', symbol: 'graduationcap.fill', color: '#5856D6', keywords: ['school', 'course', 'tuition'] },
  { name: 'Travel', symbol: 'airplane', color: '#00A7A5', keywords: ['flight', 'hotel', 'holiday'] },
  { name: 'Vehicle Maintenance', symbol: 'wrench.and.screwdriver.fill', color: '#636366', keywords: ['car', 'repair', 'service'] },
  { name: 'Vehicle Insurance', symbol: 'car.fill', color: '#007AFF', keywords: ['car', 'cover', 'policy'] },
  { name: 'Savings & Investment', symbol: 'chart.line.uptrend.xyaxis', color: '#00A86B', keywords: ['stocks', 'fund', 'save'] },
  { name: 'Clothing', symbol: 'tshirt.fill', color: '#FF375F', keywords: ['fashion', 'shoes', 'apparel'] },
  { name: 'Outing', symbol: 'ticket.fill', color: '#FF9F0A', keywords: ['event', 'fun', 'entertainment'] },
  { name: 'Transaction charges', symbol: 'creditcard.fill', color: '#8E8E93', keywords: ['fees', 'bank charge'] },
  { name: 'Ministry', symbol: 'building.columns.fill', color: '#AC8E68', keywords: ['church', 'religion', 'offering'] },
  { name: 'Lending', symbol: 'person.2.fill', color: '#64D2FF', keywords: ['loan', 'borrow'] },
  { name: 'Refunds', symbol: 'arrow.uturn.left.circle.fill', color: '#30D158', keywords: ['reimbursement', 'return'] },
  { name: 'Interest & Dividends', symbol: 'percent', color: '#32D74B', keywords: ['investment', 'yield'] },
  { name: 'Salary', symbol: 'banknote.fill', color: '#34C759', keywords: ['payroll', 'wage'] },
  { name: 'Income', symbol: 'arrow.down.circle.fill', color: '#30B05A', keywords: ['deposit', 'earnings'] },
  { name: 'Gifts', symbol: 'gift.fill', color: '#FF2D55', keywords: ['present', 'received'] },
  { name: 'Insurance', symbol: 'shield.fill', color: '#007AFF', keywords: ['policy', 'cover', 'premium'] },
  { name: 'Rent', symbol: 'house.fill', color: '#5856D6', keywords: ['housing', 'lease'] },
  { name: 'Electricity', symbol: 'bolt.fill', color: '#FFCC00', keywords: ['power', 'utility'] },
  { name: 'Water', symbol: 'drop.fill', color: '#0A84FF', keywords: ['utility', 'bill'] },
  { name: 'Gas', symbol: 'flame.fill', color: '#FF6B00', keywords: ['utility', 'cooking'] },
  { name: 'Internet', symbol: 'network', color: '#5E5CE6', keywords: ['wifi', 'broadband'] },
  { name: 'Airtime', symbol: 'phone.fill', color: '#30B05A', keywords: ['call', 'credit', 'mobile'] },
  { name: 'Data', symbol: 'antenna.radiowaves.left.and.right', color: '#007AFF', keywords: ['mobile', 'internet', 'bundle'] },
] as const;

export const TRANSFER_CATEGORY: TransactionCategory = {
  name: 'Transfer',
  symbol: 'arrow.left.arrow.right',
  color: '#6366F1',
  keywords: ['transfer', 'move'],
};

export const CUSTOM_CATEGORY_SYMBOLS = [
  'cart.fill',
  'fork.knife',
  'car.fill',
  'house.fill',
  'heart.fill',
  'gift.fill',
  'briefcase.fill',
  'graduationcap.fill',
  'airplane',
  'tshirt.fill',
  'ticket.fill',
  'creditcard.fill',
  'banknote.fill',
  'bolt.fill',
  'drop.fill',
  'flame.fill',
  'phone.fill',
  'hammer.fill',
  'wrench.and.screwdriver.fill',
  'square.grid.2x2.fill',
] as const;

export const CUSTOM_CATEGORY_COLORS = [
  '#34C759',
  '#FF9500',
  '#0A84FF',
  '#5856D6',
  '#FF3B30',
  '#FF2D55',
  '#5AC8FA',
  '#AF52DE',
] as const;
