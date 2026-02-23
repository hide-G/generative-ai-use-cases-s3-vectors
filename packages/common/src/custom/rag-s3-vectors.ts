import { S3VectorFilterConfiguration } from 'generative-ai-use-cases';
import { CognitoIdTokenPayload } from 'aws-jwt-verify/jwt-model';

/*
 * This file is used to define filter settings for S3 Vectors via Knowledge Base.
 * Uncomment and customize filters as needed to match your document metadata.
 *
 * Refer to the sample files (packages/cdk/rag-docs/docs) metadata.json
 * and define your document metadata accordingly.
 */

// Dynamic filters
// Filters automatically applied based on user attributes
// Define filters that are automatically applied based on user attributes here.
export const getDynamicS3VectorFilters = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _idTokenPayload: CognitoIdTokenPayload
): Record<string, any>[] => {
  const dynamicFilters: Record<string, any>[] = [];

  // Example 1: Filter by Cognito user groups
  // Apply filters based on Cognito user groups

  // const groups = idTokenPayload['cognito:groups'];
  // if (!groups) throw new Error('cognito:groups is not set'); // Deny access if groups are not set
  // const groupFilter = {
  //   group: {
  //     in: groups,
  //   },
  // };
  // dynamicFilters.push(groupFilter);

  // Example 2: Filter by SAML IdP group custom attribute (see docs/SAML_WITH_ENTRA_ID.md for attribute mapping setup)
  // Apply filters based on SAML IdP group custom attribute
  // Refer to docs/SAML_WITH_ENTRA_ID.md for custom attribute configuration

  // const groups = (idTokenPayload['custom:idpGroup'] as string) // Groups are stored as string (e.g., [group1id, group2id])
  //   .slice(1, -1) // Remove first and last brackets
  //   .split(/, ?/) // Split by comma and optional space
  //   .filter(Boolean); // Remove empty strings
  // if (!groups) throw new Error('custom:idpGroup is not set'); // Deny access if groups are not set
  // const groupFilter = {
  //   group: {
  //     in: groups,
  //   },
  // };
  // dynamicFilters.push(groupFilter);

  return dynamicFilters;
};

// Hidden static explicit filters
// Filters not visible to users (e.g., application-level permissions, pool tenant)
// Define filters not visible to users here (e.g., application-level permissions, pool tenant)
export const hiddenStaticS3VectorFilters: Record<string, any>[] = [
  // Example 1: Filter by data classification
  // {
  //   classification: {
  //     notIn: ['secret'],
  //   },
  // },
  // Example 2: Filter by tenant
  // {
  //   tenant: {
  //     equals: 'tenant1',
  //   },
  // },
  // Customize here
];

// User-defined explicit filters
// Filters visible to users in the application
// Define filters that users can select in the application here
// Sample files (packages/cdk/rag-docs/docs) define metadata.json accordingly.
export const userDefinedS3VectorFilters: S3VectorFilterConfiguration[] = [
  // Example 1: Filter by category (string match)
  {
    key: 'category',
    type: 'STRING',
    options: [{ value: 'AWS', label: 'AWS' }],
    description: 'Category',
  },

  // Example 2: Filter by tag (string list)
  {
    key: 'tag',
    type: 'STRING_LIST',
    options: [
      { value: 'AWS', label: 'AWS' },
      { value: 'Amazon Bedrock', label: 'Amazon Bedrock' },
      { value: 'Amazon S3', label: 'Amazon S3' },
      { value: 'Vector Search', label: 'Vector Search' },
    ],
    description: 'Tag',
  },

  // Example 3: Filter by year (number)
  {
    key: 'year',
    type: 'NUMBER',
    description: 'Year',
  },

  // Example 4: Filter by public flag (boolean)
  {
    key: 'is_public',
    type: 'BOOLEAN',
    options: [
      { value: 'true', label: 'Public' },
      { value: 'false', label: 'Private' },
    ],
    description: 'Public Status',
  },

  // Example 5: Filter by language (string match)
  {
    key: 'language',
    type: 'STRING',
    options: [
      { value: 'en', label: 'English' },
      { value: 'ja', label: 'Japanese' },
    ],
    description: 'Language',
  },

  // Customize here
];
