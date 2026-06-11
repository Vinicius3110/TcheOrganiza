export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          icon: string;
          color: string;
          parent_id: string | null;
          is_system: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          icon: string;
          color: string;
          parent_id?: string | null;
          is_system?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          icon?: string;
          color?: string;
          parent_id?: string | null;
          is_system?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      institutions: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          ispb: string;
          consent_id: string;
          vault_key_id: string;
          token_expires: string | null;
          status: 'active' | 'expired' | 'revoked';
          last_sync_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          ispb: string;
          consent_id: string;
          vault_key_id: string;
          token_expires?: string | null;
          status?: 'active' | 'expired' | 'revoked';
          last_sync_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          ispb?: string;
          consent_id?: string;
          vault_key_id?: string;
          token_expires?: string | null;
          status?: 'active' | 'expired' | 'revoked';
          last_sync_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          institution_id: string;
          user_id: string;
          external_id: string;
          name: string;
          type: 'corrente' | 'poupanca' | 'investimento';
          currency: string;
          balance: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          user_id: string;
          external_id: string;
          name: string;
          type: 'corrente' | 'poupanca' | 'investimento';
          currency?: string;
          balance?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          user_id?: string;
          external_id?: string;
          name?: string;
          type?: 'corrente' | 'poupanca' | 'investimento';
          currency?: string;
          balance?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          account_id: string;
          user_id: string;
          external_id: string;
          amount: number;
          description: string;
          merchant_name: string | null;
          merchant_cnpj: string | null;
          category_id: string | null;
          user_category_id: string | null;
          date: string;
          type: 'DEBIT' | 'CREDIT' | 'PIX' | 'TED' | 'BOLETO';
          status: 'pending' | 'posted' | 'categorized';
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          user_id: string;
          external_id: string;
          amount: number;
          description: string;
          merchant_name?: string | null;
          merchant_cnpj?: string | null;
          category_id?: string | null;
          user_category_id?: string | null;
          date: string;
          type?: 'DEBIT' | 'CREDIT' | 'PIX' | 'TED' | 'BOLETO';
          status?: 'pending' | 'posted' | 'categorized';
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          user_id?: string;
          external_id?: string;
          amount?: number;
          description?: string;
          merchant_name?: string | null;
          merchant_cnpj?: string | null;
          category_id?: string | null;
          user_category_id?: string | null;
          date?: string;
          type?: 'DEBIT' | 'CREDIT' | 'PIX' | 'TED' | 'BOLETO';
          status?: 'pending' | 'posted' | 'categorized';
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Relationships: [];
      };
      categorization_rules: {
        Row: {
          id: string;
          user_id: string | null;
          pattern: string;
          field: 'description' | 'merchant_name' | 'merchant_cnpj';
          category_id: string;
          confidence: number;
          hit_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          pattern: string;
          field?: 'description' | 'merchant_name' | 'merchant_cnpj';
          category_id: string;
          confidence?: number;
          hit_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          pattern?: string;
          field?: 'description' | 'merchant_name' | 'merchant_cnpj';
          category_id?: string;
          confidence?: number;
          hit_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
