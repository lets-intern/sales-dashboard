export type Client = {
  id: string;
  name: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  notes: string;
};

export type Deal = {
  id: string;
  client_id: string | null;
  type: string;
  segment: string;
  name: string;
  status: string;
  amount: number;
  owner: string;
  paid: boolean;
  invoice_status: string;
  quarter: string;
  period_start: string | null;
  period_end: string | null;
  comm_notes: string;
};

export type Item = {
  id: string;
  deal_id: string | null;
  channel: string;
  date: string | null;
  status: string;
  owner: string;
  notes: string;
};

export type TableName = "clients" | "deals" | "items";
