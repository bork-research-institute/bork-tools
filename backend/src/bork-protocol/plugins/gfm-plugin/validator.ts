import type { FieldGuidance, LaunchContent } from './types';

// TODO This is not used anywhere
export function isLaunchContent(content: LaunchContent) {
  // Check if token object exists
  if (!content.token || typeof content.token !== 'object') {
    content.missingFields = ['name', 'symbol', 'description'];
    content.fieldGuidance = {
      name: 'Please provide the full name of your token (e.g., "My Awesome Token")',
      symbol:
        'Please provide a 2-5 character ticker symbol for your token (e.g., "MAT")',
      description:
        "Please provide a clear description of your token's purpose and utility",
    };
    return false;
  }

  const { token } = content;

  // Check required fields
  const missingFields: string[] = [];
  const fieldGuidance: FieldGuidance = {
    name: null,
    symbol: null,
    description: null,
  };

  // Only check fields that are actually missing
  if (!token.name || token.name.trim() === '') {
    missingFields.push('name');
    fieldGuidance.name =
      'Please provide the full name of your token (e.g., "My Awesome Token")';
  }

  if (!token.symbol || token.symbol.trim() === '') {
    missingFields.push('symbol');
    fieldGuidance.symbol =
      'Please provide a 2-5 character ticker symbol for your token (e.g., "MAT")';
  }

  if (!token.description || token.description.trim() === '') {
    missingFields.push('description');
    fieldGuidance.description =
      "Please provide a clear description of your token's purpose and utility";
  }

  // If any required fields are missing, update the content with guidance
  if (missingFields.length > 0) {
    content.missingFields = missingFields;
    content.fieldGuidance = fieldGuidance;
    return false;
  }

  // Optional fields can be null or string
  const optionalFields = [
    'base64',
    'website',
    'twitter',
    'discord',
    'telegram',
  ];
  for (const field of optionalFields) {
    if (token[field] !== null && typeof token[field] !== 'string') {
      content.missingFields = ['format'];
      content.fieldGuidance = {
        name: null,
        symbol: null,
        description: null,
      };
      return false;
    }
  }

  return true;
}
