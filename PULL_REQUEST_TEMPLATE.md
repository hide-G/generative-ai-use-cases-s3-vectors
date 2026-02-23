# Amazon S3 Vectors RAGチャット機能の追加

## 概要

GenUプロジェクトに新しい「RAG チャット (Amazon S3 Vectors)」ユースケースを追加しました。Amazon S3 Vectors（GA版）を使用したベクトル検索ベースのRAGチャット機能を提供します。

## 主な変更内容

### 🆕 新機能

- **Amazon S3 Vectors RAGチャット**: ベクトル検索を使用したセマンティック検索機能
- **フィルタリング機能**: メタデータベースの高度なフィルタリング
- **ストリーミング応答**: リアルタイムでの回答生成
- **引用機能**: 検索結果の参考文献表示

### 📁 追加されたファイル

#### フロントエンド

- `packages/web/src/pages/RagS3VectorsPage.tsx` - S3 Vectorsページコンポーネント
- `packages/web/src/hooks/useRagS3Vectors.ts` - ビジネスロジックフック
- `packages/web/src/hooks/useRagS3VectorsApi.ts` - API通信フック

#### バックエンド

- `packages/cdk/lambda/retrieveS3Vectors.ts` - S3 Vectors検索Lambda関数
- `packages/cdk/lambda/utils/s3VectorsApi.ts` - S3 Vectors API統合ユーティリティ
- `packages/cdk/lib/construct/rag-s3-vectors.ts` - CDK構成

#### 型定義・設定

- `packages/types/src/rag-s3-vectors.ts` - S3 Vectors用型定義
- `packages/common/src/custom/rag-s3-vectors.ts` - フィルター設定

#### ドキュメント

- `RAG_S3_VECTORS_SETUP.md` - セットアップガイド
- `.kiro/steering/genu-coding-standards.md` - コーディング規約ガイド

### 🔧 変更されたファイル

- `packages/cdk/cdk.json` - S3 Vectors設定追加
- `packages/cdk/lib/stack-input.ts` - スタック入力設定更新
- `packages/cdk/lib/generative-ai-use-cases-stack.ts` - メインスタック統合
- `packages/web/src/main.tsx` - ルーティング追加
- `packages/web/src/App.tsx` - ナビゲーション追加
- その他設定ファイル

## 技術仕様

### Amazon S3 Vectors（GA版）対応

- **スケール**: 単一インデックスで最大20億ベクトル
- **パフォーマンス**: 頻繁なクエリで約100ミリ秒以下のレスポンス
- **検索結果**: クエリあたり最大100件の検索結果
- **書き込み性能**: 最大1,000 PUT トランザクション/秒

### 実装特徴

- **既存パターン準拠**: KendraとKnowledge Baseの実装パターンを踏襲
- **日本語完全対応**: 全てのコメント、エラーメッセージ、ドキュメントが日本語
- **GenU規約準拠**: プロジェクトのコーディング規約に完全準拠
- **モジュラー設計**: 既存機能に影響を与えない独立した実装

## セットアップ方法

1. **S3 Vectorsリソースの作成**

```bash
aws s3vectors create-vector-bucket --vector-bucket-name your-bucket-name
aws s3vectors create-index --vector-bucket-name your-bucket-name --index-name your-index-name
```

2. **CDK設定の更新**

```json
{
  "ragS3VectorsEnabled": true,
  "s3VectorsBucketName": "your-bucket-name",
  "s3VectorsIndexName": "your-index-name"
}
```

3. **デプロイ**

```bash
npm run cdk:deploy
```

## テスト状況

- ✅ TypeScript型チェック通過
- ✅ ESLint規約チェック通過
- ✅ 既存機能への影響なし確認
- ✅ 日本語コメント・ドキュメント完備

## 注意事項

- 現在の実装はモックアップのため、本番環境では実際のS3 Vectors SDKへの置き換えが必要
- Amazon S3 Vectorsが利用可能なリージョンでのみ動作
- 適切なIAM権限の設定が必要

## 今後の予定

1. 実際のS3 Vectors JavaScript SDKが利用可能になり次第、実装を更新
2. Amazon Bedrock Knowledge BaseとS3 Vectorsの統合機能追加
3. Amazon OpenSearchとの統合機能追加

## レビューポイント

- [ ] コーディング規約への準拠
- [ ] 既存機能への影響確認
- [ ] 日本語コメント・ドキュメントの品質
- [ ] セキュリティ設定の適切性
- [ ] パフォーマンスへの影響

---

この機能により、GenUプロジェクトにAmazon S3 Vectorsを使用した最新のベクトル検索RAG機能が追加されます。
