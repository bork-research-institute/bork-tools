export interface TokenInfo {
  name: string;
  symbol: string;
  description: string;
  base64: string | null;
  website: string | null;
  twitter: string | null;
  discord: string | null;
  telegram: string | null;
}

export interface FieldGuidance {
  name: string | null;
  symbol: string | null;
  description: string | null;
}

export interface LaunchContent {
  token: TokenInfo;
  missingFields: string[] | null;
  fieldGuidance: FieldGuidance | null;
}
