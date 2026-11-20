export interface Certificate {
  id: string;
  certificate_id: string;
  recipient_name: string;
  course_name: string;
  organization_name: string;
  start_date: string | null;
  completion_date: string | null;
  issue_date: string | null;
  director_name: string | null;
  user_id: string;
  created_at: string;
  status: 'valid' | 'revoked';
  verification_url: string | null;
  barcode_value: string;
}

export interface AppSettings {
  id: number;
  user_id: string;
  company_name: string;
  director_name: string;
  course_name: string;
  default_issue_date: string | null;
  logo_url: string | null;
  signature_url: string | null;
  allow_public_download: boolean;
  seal_enabled: boolean;
  seal_size: number;
  seal_position: 'bottom_left' | 'bottom_center' | 'bottom_right';
  selected_seal_id: string | null;
  selected_stamp_id: string | null;
  selected_signature_id: string | null;
  updated_at: string;
}

export type SealKind = 'company_seal' | 'signatory_stamp' | 'director_signature';

export interface Seal {
  id: string;
  user_id: string;
  name: string;
  kind: SealKind;
  storage_path: string;
  is_default: boolean;
  created_at: string;
}

export interface SealRenderInfo {
  url: string;
  size: number;
  position: 'bottom_left' | 'bottom_center' | 'bottom_right';
}

export interface CertificateData {
  recipientName: string;
  courseName: string;
  organizationName: string;
  startDate: string;
  completionDate: string;
  issueDate: string;
  directorName: string;
  certificateId?: string;
  logoUrl?: string | null;
  signatureUrl?: string | null;
  verificationUrl?: string | null;
  barcodeValue?: string | null;
  status?: 'valid' | 'revoked';
  seal?: SealRenderInfo | null;
  stampUrl?: string | null;
  signatureImageUrl?: string | null;
}

export interface BulkRow {
  name: string;
  certificateId: string;
  courseName: string;
  startDate: string;
  completionDate: string;
  issueDate: string;
  valid: boolean;
  error?: string;
}
