export const policyStatuses = [
  { statusName: 'Active', statusCode: 'ACTIVE', description: 'The policy is currently active.' },
  { statusName: 'Pending', statusCode: 'PENDING', description: 'The policy is pending approval or first payment.' },
  { statusName: 'Lapsed', statusCode: 'LAPSED', description: 'The policy has lapsed due to non-payment.' },
  { statusName: 'Completed', statusCode: 'COMPLETED', description: 'The policy term has completed.' },
  { statusName: 'Surrendered', statusCode: 'SURRENDERED', description: 'The policy was surrendered before maturity.' },
];