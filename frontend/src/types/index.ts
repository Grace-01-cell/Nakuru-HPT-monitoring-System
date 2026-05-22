export interface HptRecord {
  mfl_code: string;
  facility_name: string;
  ward_name: string;
  subcounty_name: string;

  amount_received: number;
  funding_source: string;
  date_received: string;

  amount_allocated_to_hpt: number;
  amount_spent_on_hpt: number;

  balance: number;
  hpt_percent: number;

  required_hpt_percent: number;
  compliance_status: string;

  supporting_document: string;
}

export interface CountySummary {
  total_amount_received: number;
  total_hpt_allocated: number;
  total_hpt_spent: number;
  total_balance: number;

  average_hpt_percent: number;

  compliant_facilities: number;
  non_compliant_facilities: number;

  required_hpt_percent: number;
}