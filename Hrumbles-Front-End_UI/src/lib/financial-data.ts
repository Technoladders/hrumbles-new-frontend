import { create } from 'zustand';

export interface Payment {
  id: string;
  employeeId: string;
  employeeName: string;
  paymentDate: string;
  paymentAmount: number;
  paymentCategory: PaymentCategory;
  status: string;
  avatar?: string;
  payslipData?: PayslipData;
}

export interface PayslipData {
  employeeId: string;
  employeeName: string;
  designation: string;
  payPeriod: string;
  basicSalary: number;
  houseRentAllowance: number;
  conveyanceAllowance: number;
  fixedAllowance: number;
  medicalAllowance?: number;
  specialAllowance?: number;
  totalEarnings: number;
  providentFund: number;
  professionalTax: number;
  incomeTax: number;
  loanDeduction: number;
  totalDeductions: number;
  netPayable: number;
  paidDays: number;
  lopDays: number;
  customEarnings: { name: string; amount: number }[];
  customDeductions: { name: string; amount: number }[];
}

interface FinancialStore {
  payments: Payment[];
  addPayment: (payment: Omit<Payment, 'id'>) => void;
  updatePayment: (id: string, updatedPayment: Payment) => void;
  deletePayment: (id: string) => void;
  setPayments: (payments: Payment[]) => void;
}

export interface PaymentCategory {
  Staff: 'Staff';
  Member: 'Member';
  Freelance: 'Freelance';
  'Part-Time': 'Part-Time';
}

export const useFinancialStore = create<FinancialStore>((set) => ({
  payments: [],
  addPayment: (payment) => set((state) => ({ 
    payments: [{ id: crypto.randomUUID(), ...payment }, ...state.payments] 
  })),
  updatePayment: (id, updatedPayment) => set((state) => ({
    payments: state.payments.map((payment) => 
      payment.id === id ? { ...payment, ...updatedPayment } : payment
    ),
  })),
  deletePayment: (id) => set((state) => ({
    payments: state.payments.filter((payment) => payment.id !== id),
  })),
  setPayments: (payments) => set({ payments }),
}));
