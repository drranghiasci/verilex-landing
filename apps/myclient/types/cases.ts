export type CaseStatus = 'open' | 'paused' | 'closed' | string;

export type CaseRow = {
  id: string;
  firm_id?: string | null;

  title: string | null;
  case_number: string | null;
  matter_type: string | null;

  client_first_name: string | null;
  client_last_name: string | null;
  client_email: string | null;
  client_phone: string | null;

  state: string | null;
  county: string | null;
  status: string | null;

  created_at: string | null;
  updated_at?: string | null;
  last_activity_at: string | null;

  internal_notes?: string | null;
};

export type EditableCaseFields = Partial<
  Pick<
    CaseRow,
    | 'title'
    | 'client_first_name'
    | 'client_last_name'
    | 'client_email'
    | 'client_phone'
    | 'state'
    | 'county'
    | 'status'
  >
>;
