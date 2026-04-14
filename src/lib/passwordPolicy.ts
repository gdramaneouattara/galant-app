export const PASSWORD_POLICY = {
  minLength: 10,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSymbol: true,
} as const;

export type PasswordPolicyResult = {
  valid: boolean;
  reasons: string[];
};

export const validatePasswordPolicy = (password: string): PasswordPolicyResult => {
  const reasons: string[] = [];

  if (password.length < PASSWORD_POLICY.minLength) {
    reasons.push(`au moins ${PASSWORD_POLICY.minLength} caracteres`);
  }
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    reasons.push('une lettre majuscule');
  }
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    reasons.push('une lettre minuscule');
  }
  if (PASSWORD_POLICY.requireDigit && !/\d/.test(password)) {
    reasons.push('un chiffre');
  }
  if (PASSWORD_POLICY.requireSymbol && !/[^\w\s]/.test(password)) {
    reasons.push('un caractere special');
  }

  return {
    valid: reasons.length === 0,
    reasons,
  };
};

export const getPasswordPolicyHint = () =>
  `Utilise au moins ${PASSWORD_POLICY.minLength} caracteres avec majuscule, minuscule, chiffre et caractere special.`;

