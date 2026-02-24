import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmailConfigurationManagement from '../../src/components/UserManagement/EmailConfigurationManagement';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi } from 'vitest';

// --- 1. MOCK SHADCN SELECT COMPONENTS ---
// This bypasses the complex browser layout animations and lets us test the raw React logic!
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value }: any) => <div data-testid="mock-select" data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-testid="mock-select-item" data-value={value}>{children}</div>,
  SelectValue: () => <div>Select Value</div>,
}));

// --- 2. MOCK SUPABASE DATABASE ---
const mockSupabase = vi.hoisted(() => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ 
      data: [{
        report_type: 'daily_recruiter_report',
        is_active: true, // Forces UI to be expanded
        config: { sendTime: '12:25', sendDay: 'Friday', sendToRecruiters: false }
      }], 
      error: null 
    }),
  };
  
  return {
    from: vi.fn(() => mockQuery),
    upsert: vi.fn().mockResolvedValue({ error: null }),
  };
});

vi.mock('../../src/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

// --- 3. MOCK REAL API PAYLOAD ---
vi.mock('../../src/api/user', () => ({
  fetchEmployees: vi.fn().mockResolvedValue([
    { id: 'f4f61056', first_name: 'Gaayathri', last_name: 'Murugeshan', email: 'gaayathri.m@hrumbles.ai' },
    { id: '7550ccd4', first_name: 'John', last_name: 'Doe', email: 'john@hrumbles.ai' },
  ])
}));

const store = configureStore({
  reducer: { auth: () => ({ organization_id: 'test-org-id' }) }
});

describe('EmailConfigurationManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders time options in 15-minute intervals and includes custom saved times', async () => {
    const user = userEvent.setup();

    render(
      <Provider store={store}>
        <EmailConfigurationManagement />
      </Provider>
    );

    // 1. Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/Loading configurations/i)).not.toBeInTheDocument();
    });

    // 2. Go to the Daily tab
    const dailyTab = screen.getByRole('tab', { name: /Daily/i });
    await user.click(dailyTab);

    // 3. Find the Time Select component and verify it loaded our custom '12:25' from the database
    const selects = await screen.findAllByTestId('mock-select');
    expect(selects[0]).toHaveAttribute('data-value', '12:25');

    // 4. Extract all the options that the component generated
    const items = await screen.findAllByTestId('mock-select-item');
    const generatedValues = items.map(item => item.getAttribute('data-value'));

    // 5. Assert the business logic is perfectly correct!
    expect(generatedValues).toContain('00:00'); // Validates standard interval
    expect(generatedValues).toContain('12:15'); // Validates standard interval
    expect(generatedValues).toContain('12:25'); // Validates custom DB injection
  });
});