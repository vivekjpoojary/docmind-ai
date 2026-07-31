export interface User {
  id: string;
  email: string;
  full_name: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface Document {
  id: string;
  filename: string;
  file_type: string;
  file_size_bytes: number;
  status: 'ready' | 'failed' | 'processing' | 'pending';
  chunk_count: number;
  page_count: number;
  uploaded_at: string;
  processed_at?: string | null;
  error_message?: string | null;
}

export interface Citation {
  chunk_id?: string;
  document_id: string;
  filename: string;
  page_number?: number;
  content: string;
  similarity?: number;
  excerpt?: string;
  relevance_score?: number;
}

export interface Message {
  id: string;
  sender: 'USER' | 'ASSISTANT';
  content: string;
  sources?: Citation[] | null;
  confidence_score?: number | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

export interface SearchResultItem {
  document_id: string;
  filename: string;
  page_number: number | null;
  excerpt: string;
  score: number;
  match_type: 'semantic' | 'keyword' | 'both';
}

export interface SearchResponse {
  query: string;
  mode: string;
  results: SearchResultItem[];
}

export interface UserAnalytics {
  total_documents: number;
  total_pages: number;
  total_chunks: number;
  storage_bytes: number;
  total_conversations: number;
  total_questions_asked: number;
}

export interface SystemAnalytics {
  total_users: number;
  total_documents: number;
  total_chunks: number;
  total_conversations: number;
  total_messages: number;
  total_storage_bytes: number;
}

export interface AdminUserListItem extends User {
  document_count: number;
  storage_bytes: number;
}
