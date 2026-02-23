# RAG チャット (Amazon S3 Vectors) セットアップガイド

このドキュメントでは、GenUプロジェクトに新しく追加された「RAG チャット (Amazon S3 Vectors)」ユースケースのセットアップ方法について説明します。

## 概要

Amazon S3 Vectorsは、ベクトルデータを格納し、セマンティック検索を実行するための専用ストレージサービスです。2025年12月にGA（一般提供）が開始され、本番環境での使用が可能になりました。このユースケースでは、S3 Vectorsを使用してドキュメントの意味的検索を行い、検索結果を基にLLMが回答を生成します。

## 新機能（GA版）

- **大幅なスケール向上**: 単一インデックスで最大20億ベクトル（プレビュー時の40倍）
- **パフォーマンス向上**: 頻繁なクエリで約100ミリ秒以下のレイテンシー
- **検索結果の拡張**: クエリあたり最大100件の検索結果（以前は30件）
- **書き込み性能向上**: 最大1,000 PUT トランザクション/秒をサポート
- **リージョン拡大**: 14のAWSリージョンで利用可能

## 前提条件

1. **AWS アカウント**: Amazon S3 Vectorsが利用可能なリージョンでのAWSアカウント
2. **ベクトルバケットとインデックス**: 事前に作成されたS3ベクトルバケットとベクトルインデックス

## セットアップ手順

### 1. S3 Vectorsリソースの作成

#### ベクトルバケットの作成

```bash
# AWS CLIを使用してベクトルバケットを作成
aws s3vectors create-vector-bucket \
    --vector-bucket-name your-vector-bucket-name \
    --region us-east-1
```

#### ベクトルインデックスの作成

```bash
# ベクトルインデックスを作成（GA版の新しいパラメータを使用）
aws s3vectors create-index \
    --vector-bucket-name your-vector-bucket-name \
    --index-name your-vector-index-name \
    --data-type "float32" \
    --dimension 1536 \
    --distance-metric "cosine" \
    --metadata-configuration "nonFilterableMetadataKeys=AMAZON_BEDROCK_TEXT,AMAZON_BEDROCK_METADATA"
```

### 2. CDK設定の更新

`packages/cdk/cdk.json`ファイルを更新して、S3 Vectors設定を有効化します：

```json
{
  "context": {
    "ragS3VectorsEnabled": true,
    "s3VectorsBucketName": "your-vector-bucket-name",
    "s3VectorsIndexName": "your-vector-index-name",
    "s3VectorsEmbeddingModelId": "amazon.titan-embed-text-v2:0"
  }
}
```

### 3. ベクトルデータの準備

#### サンプルドキュメントの埋め込み生成

```python
import boto3
import json

# Bedrockクライアントを初期化
bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

# テキストをベクトル埋め込みに変換
def generate_embedding(text):
    response = bedrock.invoke_model(
        modelId='amazon.titan-embed-text-v2:0',
        body=json.dumps({
            'inputText': text
        })
    )
    return json.loads(response['body'].read())['embedding']

# S3 Vectorsクライアント（注意: 実際のSDKが利用可能になったら更新）
# s3vectors = boto3.client('s3vectors', region_name='us-east-1')

# ベクトルデータの挿入例
sample_documents = [
    {
        'key': 'document1.pdf',
        'text': 'Amazon S3 Vectorsは、ベクトルデータを格納し、セマンティック検索を実行するための専用ストレージサービスです。',
        'metadata': {
            'title': 'Amazon S3 Vectorsドキュメント',
            'category': 'AWS',
            'year': 2025,
            'language': 'ja'
        }
    }
]

for doc in sample_documents:
    embedding = generate_embedding(doc['text'])
    # TODO: 実際のS3 Vectors SDKが利用可能になったら実装
    # s3vectors.put_vectors(
    #     vectorBucketName='your-vector-bucket-name',
    #     indexName='your-vector-index-name',
    #     vectors=[{
    #         'key': doc['key'],
    #         'data': embedding,
    #         'metadata': doc['metadata']
    #     }]
    # )
```

### 4. デプロイ

```bash
# 依存関係のインストール
npm ci

# CDKデプロイ
npm run cdk:deploy
```

## 設定オプション

### フィルター設定

`packages/common/src/custom/rag-s3-vectors.ts`ファイルでフィルター設定をカスタマイズできます：

```typescript
// ユーザー定義明示的フィルター
export const userDefinedS3VectorFilters: S3VectorFilterConfiguration[] = [
  {
    key: 'category',
    type: 'STRING',
    options: [{ value: 'AWS', label: 'AWS' }],
    description: 'カテゴリ',
  },
  // 他のフィルター設定...
];
```

### 環境変数

以下の環境変数が自動的に設定されます：

- `VITE_APP_RAG_S3_VECTORS_ENABLED`: S3 Vectors機能の有効/無効
- `VITE_APP_S3_VECTORS_BUCKET_NAME`: ベクトルバケット名
- `VECTOR_BUCKET_NAME`: Lambda関数用のベクトルバケット名
- `VECTOR_INDEX_NAME`: Lambda関数用のベクトルインデックス名
- `EMBEDDING_MODEL_ID`: 埋め込みモデルID

## 使用方法

1. GenUアプリケーションにアクセス
2. サイドメニューから「RAG チャット (Amazon S3 Vectors)」を選択
3. 質問を入力してS3 Vectorsベースの検索と回答生成を実行
4. 必要に応じて詳細設定でフィルターを適用

## トラブルシューティング

### よくある問題

1. **S3 Vectors SDKの使用**
   - Amazon S3 VectorsはGA（一般提供）になりました
   - 最新のAWS SDKを使用して実際のS3 Vectors APIを実装してください
   - 現在の実装はモックアップのため、本番環境では実際のSDKに置き換えが必要です

2. **ベクトル検索結果が空**
   - ベクトルインデックスにデータが挿入されているか確認
   - 埋め込みモデルの次元数がインデックス設定と一致しているか確認

3. **権限エラー**
   - Lambda関数にS3 Vectorsへのアクセス権限が付与されているか確認
   - Bedrockモデルへのアクセス権限が設定されているか確認

### ログの確認

```bash
# Lambda関数のログを確認
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/GenerativeAiUseCasesStack"
```

## 制限事項

1. **SDK実装**: 現在の実装はモックアップのため、本番環境では実際のS3 Vectors SDKに置き換えが必要
2. **リージョン制限**: S3 Vectorsが利用可能な14のリージョンでのみ動作
3. **スケール考慮**: 大規模データセット（20億ベクトル）を扱う場合は適切なインデックス設計が必要

## 今後の更新予定

1. **実際のS3 Vectors SDK統合**: JavaScript SDKを使用した実装への更新
2. **GA機能の活用**: 新しいスケールとパフォーマンス機能の完全活用
3. **Amazon Bedrock Knowledge Base統合**: S3 Vectorsをベクトルストレージエンジンとして使用
4. **Amazon OpenSearch統合**: OpenSearchとの統合機能の追加

## サポート

問題や質問がある場合は、以下のリソースを参照してください：

- [Amazon S3 Vectors ドキュメント](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vectors.html)
- [GenU GitHub Issues](https://github.com/aws-samples/generative-ai-use-cases/issues)
- [AWS サポート](https://aws.amazon.com/support/)
