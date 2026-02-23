// Amazon S3 Vectors filter configuration for Knowledge Base integration

// Filter configuration for UI (compatible with Knowledge Base RetrievalFilter)
export type S3VectorFilterConfiguration = {
  key: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'STRING_LIST';
  options?: { value: string; label: string }[];
  description: string;
};
