import React from 'react';
import { Expense } from '@/lib/accounts-data';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/utils/currency';
import TechnoladdersLogo from '../../../public/hrumbles_logo2.png';

interface ExpenseDetailsProps {
  expense: Expense;
  onClose: () => void;
}

const ExpenseDetails: React.FC<ExpenseDetailsProps> = ({ expense, onClose }) => {
  return (
    <div className="max-w-[1200px] mx-auto p-1">
      <div className="mb-3 flex justify-between items-center">
        <Button
          variant="ghost"
          onClick={onClose}
          className="text-sm"
        >
          <span className="">←</span>
          Back to Expenses
        </Button>
      </div>

      {/* Expense document styled to match InvoiceDetails */}
      <div className="bg-white border rounded-lg shadow-sm p-8 print:shadow-none print:border-none">
        {/* Company Header with Logo and Details */}
        <div className="flex items-start justify-between gap-3 border-b pb-3 mb-3">
        <div className="flex gap-4">
            <div className="w-20 h-14 flex-shrink-0 pt-7">
              <img src={TechnoladdersLogo} alt="Company Logo" className="w-full" />
            </div>
            <div className="max-w-md">
  <h1 className="text-xl font-bold">Technoladders Solutions Private Limited</h1>
  <p className="text-sm text-gray-600 whitespace-normal break-words">
    Tidel Park, 1st Floor D Block, Module 115, D North Block, 1st Floor, No.4 Rajiv Gandhi Salai, Taramani Chennai Tamil Nadu 600113 India.
  </p>
</div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Expense</p>
            <h2 className="text-1xl font-bold">{expense.description}</h2>
            <p className="text-sm text-gray-600 mt-1">Date: {expense.date}</p>
          </div>
        </div>

        {/* Expense Summary */}
        <h2 className="text-gray-700 font-bold mb-4 uppercase">EXPENSE SUMMARY</h2>
        <div className="flex mb-6">
          <div className="w-2/3 pr-4">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-x-2 gap-y-3">
              <div className="text-gray-600">Description</div>
              <div className="text-center">:</div>
              <div>{expense.description}</div>

              <div className="text-gray-600">Date</div>
              <div className="text-center">:</div>
              <div>{expense.date}</div>

              <div className="text-gray-600">Category</div>
              <div className="text-center">:</div>
              <div>{expense.category}</div>

              <div className="text-gray-600">Vendor/Supplier</div>
              <div className="text-center">:</div>
              <div>{expense.vendor || 'Not specified'}</div>

              <div className="text-gray-600">Payment Method</div>
              <div className="text-center">:</div>
              <div>{expense.paymentMethod}</div>
            </div>
          </div>

          <div className="w-1/3">
            <div className="h-full border rounded-lg bg-green-50 flex flex-col items-center justify-center p-6">
              <p className="text-4xl font-bold text-gray-800">
                {formatINR(expense.amount).replace('₹', '')}
              </p>
              <p className="text-sm text-gray-600 mt-1">Expense Amount</p>
            </div>
          </div>
        </div>

        {/* Receipt Section */}
        {/* {expense.receiptUrl && ( */}
          <div className="mb-6 border rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div className="font-bold uppercase text-lg">ATTACHED RECEIPT</div>
              <Button variant="outline" asChild>
                <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer">
                  View Receipt
                </a>
              </Button>
            </div>
          </div>
        {/* )} */}

        {/* Notes Section */}
        {expense.notes && (
          <div className="mb-6 text-sm">
            <div>
              <span className="text-gray-600">Notes: </span>
              <span className="font-medium">{expense.notes}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 mt-10 pt-4 border-t">
          <p>-- This is a system-generated document. --</p>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDetails;