// Amazon S3 Vectors用の型定義（GA版対応）

export type S3VectorMetadata = {
  [key: string]: string | number | boolean | string[];
};

export type S3Vector = {
  key: string;
  data: number[]; // float32配列
  metadata?: S3VectorMetadata;
};

export type S3VectorQueryResult = {
  key: string;
  distance?: number;
  metadata?: S3VectorMetadata;
  data?: number[];
};

export type S3VectorFilter = {
  [key: string]: {
    equals?: string | number | boolean;
    notEquals?: string | number | boolean;
    in?: (string | number | boolean)[];
    notIn?: (string | number | boolean)[];
    greaterThan?: number;
    greaterThanOrEqual?: number;
    lessThan?: number;
    lessThanOrEqual?: number;
  };
};

// API リクエスト/レスポンス型（GA版の新機能対応）
export type QueryS3VectorsRequest = {
  query: string;
  filter?: S3VectorFilter;
  topK?: number; // GA版では最大100件まで対応
  returnDistance?: boolean;
  returnMetadata?: boolean;
};

export type QueryS3VectorsResponse = {
  vectors: S3VectorQueryResult[];
  distanceMetric?: string;
};

export type RetrieveS3VectorsRequest = {
  query: string;
  filter?: S3VectorFilter;
  topK?: number; // GA版では最大100件まで対応
};

export type RetrieveS3VectorsResponse = {
  vectors: S3VectorQueryResult[];
  distanceMetric?: string;
};

// S3 Vectors設定用の型
export type S3VectorFilterConfiguration = {
  key: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'STRING_LIST';
  defaultValue?: string | number | boolean | string[];
  // STRING or STRING_LIST用
  options?: { value: string; label: string }[];
  // NUMBER用
  range?: {
    min?: number;
    max?: number;
  };
  description: string;
};