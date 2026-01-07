import { S3VectorFilterConfiguration } from 'generative-ai-use-cases';
import { CognitoIdTokenPayload } from 'aws-jwt-verify/jwt-model';

/*
 * このファイルはS3 Vectorsのフィルター設定を定義するために使用されます。
 * 必要に応じてフィルターのコメントアウトを解除し、ニーズに合わせてカスタマイズしてください。
 *
 * サンプルファイル（packages/cdk/rag-docs/docs）のmetadata.jsonを参照し、
 * それに応じてドキュメントメタデータを定義してください。
 */

// 動的フィルター
// ユーザー属性によって自動的に適用されるフィルター
// ユーザー属性によって自動的に適用されるフィルターをここで定義します。
export const getDynamicS3VectorFilters = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _idTokenPayload: CognitoIdTokenPayload
): Record<string, any>[] => {
  const dynamicFilters: Record<string, any>[] = [];

  // 例1: Cognitoユーザーグループによるフィルター
  // Cognitoユーザーグループによってフィルターを適用

  // const groups = idTokenPayload['cognito:groups'];
  // if (!groups) throw new Error('cognito:groups is not set'); // グループが設定されていない場合はアクセス不可でエラーを投げる
  // const groupFilter = {
  //   group: {
  //     in: groups,
  //   },
  // };
  // dynamicFilters.push(groupFilter);

  // 例2: SAML IdPグループカスタム属性によるフィルター（属性マッピングの設定手順はdocs/SAML_WITH_ENTRA_ID.mdを確認）
  // SAML IdPグループカスタム属性によってフィルターを適用
  // カスタム属性の設定方法についてはdocs/SAML_WITH_ENTRA_ID.mdを参照してください

  // const groups = (idTokenPayload['custom:idpGroup'] as string) // グループは文字列として保持される（例: [group1id, group2id]）
  //   .slice(1, -1) // 最初と最後の括弧を削除
  //   .split(/, ?/) // カンマとスペースで分割
  //   .filter(Boolean); // 空文字列を削除
  // if (!groups) throw new Error('custom:idpGroup is not set'); // グループが設定されていない場合はアクセス不可でエラーを投げる
  // const groupFilter = {
  //   group: {
  //     in: groups,
  //   },
  // };
  // dynamicFilters.push(groupFilter);

  return dynamicFilters;
};

// 隠し静的明示的フィルター
// ユーザーに表示されないフィルター（例：アプリケーションレベルの権限、プールテナント）
// ユーザーに表示されないフィルターを定義します（例：アプリケーションレベルの権限、プールテナント）
export const hiddenStaticS3VectorFilters: Record<string, any>[] = [
  // 例1: データ分類によるフィルター
  // {
  //   classification: {
  //     notIn: ['secret'],
  //   },
  // },
  // 例2: テナントによるフィルター
  // {
  //   tenant: {
  //     equals: 'tenant1',
  //   },
  // },
  // ここでカスタマイズ
];

// ユーザー定義明示的フィルター
// アプリケーション上でユーザーに表示されるフィルター
// アプリケーション上でユーザーが選択できるフィルターを定義します
// サンプルファイル（packages/cdk/rag-docs/docs）はそれに応じてmetadata.jsonを定義しています。
export const userDefinedS3VectorFilters: S3VectorFilterConfiguration[] = [
  // 例1: カテゴリによるフィルター（文字列マッチ）
  {
    key: 'category',
    type: 'STRING',
    options: [{ value: 'AWS', label: 'AWS' }],
    description: 'カテゴリ',
  },

  // 例2: タグによるフィルター（文字列リスト）
  {
    key: 'tag',
    type: 'STRING_LIST',
    options: [
      { value: 'AWS', label: 'AWS' },
      { value: 'Amazon Bedrock', label: 'Amazon Bedrock' },
      { value: 'Amazon S3', label: 'Amazon S3' },
      { value: 'Vector Search', label: 'ベクトル検索' },
    ],
    description: 'タグ',
  },

  // 例3: 年によるフィルター（数値）
  {
    key: 'year',
    type: 'NUMBER',
    description: '年',
  },

  // 例4: 公開フラグによるフィルター（真偽値）
  {
    key: 'is_public',
    type: 'BOOLEAN',
    options: [
      { value: 'true', label: '公開' },
      { value: 'false', label: '非公開' },
    ],
    description: '公開状態',
  },

  // 例5: 言語によるフィルター（文字列マッチ）
  {
    key: 'language',
    type: 'STRING',
    options: [
      { value: 'en', label: '英語' },
      { value: 'ja', label: '日本語' },
    ],
    description: '言語',
  },

  // ここでカスタマイズ
];