export type Client = {
  id: string;
  name: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  biz_reg_no: string;
  tax_email: string;
  notes: string;
};

export type StatementLine = {
  date: string; // 거래일 (YYMMDD)
  name: string; // 항목
  list_price: number; // 정가
  sale_price: number; // 할인가
  note: string; // 비고
};

export type StatementData = {
  receipt_date: string; // 영수일 (YYYY-MM-DD)
  lines: StatementLine[];
  pay_method: string; // 결제 방법
  contact_note: string; // 담당자 안내문
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
  statement: StatementData | null;
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
