import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@/utils/test-utils";
import { CreateJobModal } from "@/components/jobs/CreateJobModal";
import userEvent from "@testing-library/user-event";

// --- 1. MOCK LOCATION SELECTOR ---
vi.mock("@/components/jobs/job/LocationSelector", () => ({
  default: ({ onChange }: { onChange: (val: string[]) => void }) => (
    <input
      data-testid="mock-location-input"
      placeholder="Select Location"
      onChange={(e) => onChange([e.target.value])}
    />
  ),
}));

// --- 2. SETUP SUPABASE MOCK WITH DATA ---
const mockClients = [
  { id: "c1", client_name: "Google", end_client: "Alphabet" },
  { id: "c2", client_name: "Microsoft", end_client: "Microsoft Corp" },
];

const mockSupabaseChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  then: vi.fn((resolve) => resolve({ data: mockClients, error: null })),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => mockSupabaseChain),
  },
}));

describe("CreateJobModal Integration Flow", () => {
  const onCloseMock = vi.fn();
  const onSaveMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseChain.then.mockImplementation((resolve) => 
      resolve({ data: mockClients, error: null })
    );
  });

  it("completes the full External Job creation flow", async () => {
    const user = userEvent.setup();

    render(
      <CreateJobModal 
        isOpen={true} 
        onClose={onCloseMock} 
        onSave={onSaveMock} 
      />
    );

    // --- STEP 0: SELECT JOB TYPE ---
    // Use exact text match or regex for the specific button
    const externalBtn = screen.getByRole("button", { name: /External A position for one of your clients/i });
    await user.click(externalBtn);

    // --- STEP 1: FILL FORM (CLIENT & JOB INFO) ---
    
    // 1. Select Client
    // FIX: Select by the LABEL "Client Name", not the placeholder "Select a client"
    const clientTrigger = screen.getByRole("combobox", { name: /Client Name/i });
    await user.click(clientTrigger);
    
    // Select option from portal
    const googleOption = await screen.findByRole("option", { name: "Google" });
    await user.click(googleOption);

    // 2. Fill Budget
    // Placeholder works here because Input doesn't obscure it like Select trigger does
    const budgetInput = screen.getByPlaceholderText(/enter amount/i);
    await user.type(budgetInput, "20"); 

    // 3. Fill Job Info
    await user.type(screen.getByLabelText(/Job Title/i), "Senior React Engineer");
    await user.type(screen.getByLabelText(/Job ID/i), "JOB-2024-001");
    
    // 4. Select Hiring Mode
    // FIX: Select by LABEL "Hiring Mode"
    const hiringModeTrigger = screen.getByRole("combobox", { name: /Hiring Mode/i });
    await user.click(hiringModeTrigger);
    await user.click(await screen.findByRole("option", { name: "Full-Time" }));

    // 5. Fill Location (using our mock input)
    const locationInput = screen.getByTestId("mock-location-input");
    await user.type(locationInput, "Bangalore");

    // --- STEP 1: NAVIGATE NEXT ---
    const nextButton = screen.getByRole("button", { name: /Next Step/i });
    await user.click(nextButton);

    // --- STEP 2: JOB DESCRIPTION ---
    await waitFor(() => {
      expect(screen.getByText(/Final Skills Review/i)).toBeInTheDocument();
    });

    // Fill Description (> 100 chars)
    const longDescription = "This is a detailed job description that is definitely longer than one hundred characters. We are looking for a React developer who knows how to write unit tests using Vitest and React Testing Library. The candidate should be proficient in TypeScript and Tailwind CSS.";
    const descInput = screen.getByPlaceholderText(/e.g., Senior React developer/i);
    await user.type(descInput, longDescription);

    // --- STEP 3: SAVE ---
    const createButton = screen.getByRole("button", { name: /Create Job/i });
    
    // Verify it is enabled
    expect(createButton).toBeEnabled();
    
    await user.click(createButton);

    // --- ASSERTION ---
    await waitFor(() => {
      expect(onSaveMock).toHaveBeenCalledTimes(1);
    });

    const savedData = onSaveMock.mock.calls[0][0];
    
    expect(savedData).toMatchObject({
      title: "Senior React Engineer",
      job_id: "JOB-2024-001",
      hiring_mode: "Full Time",
      location: ["Bangalore"],
      client_details: {
        clientName: "Google",
        clientBudget: expect.stringContaining("20"), 
      },
      description: longDescription,
      job_type_category: "External"
    });
  });
});