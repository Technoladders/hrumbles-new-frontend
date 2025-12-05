// src/types/openaiUsage.ts

export interface OpenAIUsageLog {
  id: string;
  organization_id: string;
  user_id: string | null;
  operation_type: 'jd_title_analysis' | 'keyword_generation' | 'chat_jd_generation';
  status: 'success' | 'error';
  model_used: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  jd_text_hash?: string;
  jd_word_count?: number;
  search_history_id?: string;
  api_response?: any;
  error_message?: string;
  created_at: string;
}

export interface OpenAIUsageAnalytics {
  organization_id: string;
  operation_type: string;
  model_used: string;
  usage_date: string;
  total_calls: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_cost: number;
  avg_cost_per_call: number;
  error_count: number;
}