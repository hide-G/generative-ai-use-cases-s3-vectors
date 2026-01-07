import * as lambda from 'aws-lambda';
import { RetrieveS3VectorsRequest } from 'generative-ai-use-cases';
import { initBedrockRuntimeClient } from './utils/bedrockClient';
import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// 環境変数
const VECTOR_BUCKET_NAME = process.env.VECTOR_BUCKET_NAME;
const VECTOR_INDEX_NAME = process.env.VECTOR_INDEX_NAME;
const EMBEDDING_MODEL_ID = process.env.EMBEDDING_MODEL_ID || 'amazon.titan-embed-text-v2:0';
const MODEL_REGION = process.env.MODEL_REGION as string;

/**
 * S3 Vectorsからドキュメントを検索するLambda関数
 */
exports.handler = async (
  event: lambda.APIGatewayProxyEvent
): Promise<lambda.APIGatewayProxyResult> => {
  try {
    const req = JSON.parse(event.body!) as RetrieveS3VectorsRequest;
    const query = req.query;

    if (!query) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'クエリが指定されていません' }),
      };
    }

    if (!VECTOR_BUCKET_NAME || !VECTOR_INDEX_NAME) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'S3 Vectorsの設定が不完全です' }),
      };
    }

    // 1. クエリテキストをベクトル埋め込みに変換
    const bedrockClient = await initBedrockRuntimeClient({ region: MODEL_REGION });
    
    const embeddingCommand = new InvokeModelCommand({
      modelId: EMBEDDING_MODEL_ID,
      body: JSON.stringify({
        inputText: query,
      }),
    });

    const embeddingResponse = await bedrockClient.send(embeddingCommand);
    const embeddingResult = JSON.parse(new TextDecoder().decode(embeddingResponse.body));
    const queryVector = embeddingResult.embedding;

    // 2. S3 Vectorsクライアントを初期化（注意: 実際のSDKが利用可能になるまでモックアップ）
    // 注意: 現在S3 Vectors用のJavaScript SDKはプレビュー段階のため、
    // 実際の実装では適切なSDKクライアントを使用してください
    
    // モックアップ実装 - 実際のS3 Vectors SDKが利用可能になったら置き換えてください
    const mockS3VectorsResponse = {
      vectors: [
        {
          key: 'document1.pdf',
          distance: 0.85,
          metadata: {
            title: 'Amazon S3 Vectorsドキュメント',
            category: 'AWS',
            year: 2025,
            language: 'ja'
          }
        },
        {
          key: 'document2.pdf', 
          distance: 0.78,
          metadata: {
            title: 'ベクトル検索の基礎',
            category: 'AI',
            year: 2024,
            language: 'ja'
          }
        }
      ],
      distanceMetric: 'cosine'
    };

    // TODO: 実際のS3 Vectors APIコールに置き換える
    // 注意: Amazon S3 VectorsはGA（一般提供）になりました
    // 実際のS3 Vectors SDKを使用してください
    // const s3VectorsClient = new S3VectorsClient({ region: MODEL_REGION });
    // const queryCommand = new QueryVectorsCommand({
    //   vectorBucketName: VECTOR_BUCKET_NAME,
    //   indexName: VECTOR_INDEX_NAME,
    //   queryVector: queryVector,
    //   topK: req.topK || 10,
    //   returnDistance: true,
    //   returnMetadata: true,
    //   filter: req.filter
    // });
    // const queryResult = await s3VectorsClient.send(queryCommand);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(mockS3VectorsResponse),
    };

  } catch (error) {
    console.error('S3 Vectors検索エラー:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        error: 'S3 Vectors検索中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      }),
    };
  }
};