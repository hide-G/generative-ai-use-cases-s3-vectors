import {
  ApiInterface,
  Model,
  UnrecordedMessage,
} from 'generative-ai-use-cases';
import {
  getDynamicS3VectorFilters,
  hiddenStaticS3VectorFilters,
} from '@generative-ai-use-cases/common';
import { streamingChunk } from './streamingChunk';
import { verifyToken } from './auth';
import { initBedrockRuntimeClient } from './bedrockClient';
import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const MODEL_REGION = process.env.MODEL_REGION as string;
const VECTOR_BUCKET_NAME = process.env.VECTOR_BUCKET_NAME;
const VECTOR_INDEX_NAME = process.env.VECTOR_INDEX_NAME;
const EMBEDDING_MODEL_ID = process.env.EMBEDDING_MODEL_ID || 'amazon.titan-embed-text-v2:0';

/**
 * S3 VectorsのAPIインターフェース実装
 */
const s3VectorsApi: ApiInterface = {
  invoke: async () => {
    throw new Error('未実装');
  },
  
  invokeStream: async function* (
    model: Model,
    messages: UnrecordedMessage[],
    id: string,
    idToken?: string
  ) {
    try {
      // 明示的フィルターを取得（idTokenの検証が必要な場合があるため非同期）
      const explicitFilters = await getExplicitS3VectorFilters(messages, idToken);

      // 最後のメッセージからクエリを取得
      const query = messages[messages.length - 1].content;

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

      // 2. S3 Vectorsで類似ベクトルを検索
      // 注意: Amazon S3 VectorsはGA（一般提供）になりました
      // 実際のS3 Vectors SDKを使用してください
      // const s3VectorsClient = new S3VectorsClient({ region: MODEL_REGION });
      // const queryCommand = new QueryVectorsCommand({
      //   vectorBucketName: VECTOR_BUCKET_NAME,
      //   indexName: VECTOR_INDEX_NAME,
      //   queryVector: queryVector,
      //   topK: 10,
      //   returnDistance: true,
      //   returnMetadata: true,
      //   filter: explicitFilters
      // });
      // const searchResults = await s3VectorsClient.send(queryCommand);

      // モックアップ検索結果
      const searchResults = {
        vectors: [
          {
            key: 'document1.pdf',
            distance: 0.85,
            metadata: {
              title: 'Amazon S3 Vectorsドキュメント',
              content: 'Amazon S3 Vectorsは、ベクトルデータを格納し、セマンティック検索を実行するための専用ストレージサービスです。',
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
              content: 'ベクトル検索は、高次元ベクトル空間での類似性に基づいてドキュメントを検索する手法です。',
              category: 'AI',
              year: 2024,
              language: 'ja'
            }
          }
        ]
      };

      // 3. 検索結果を使用してLLMで回答を生成
      const contextPrompt = buildContextPrompt(searchResults.vectors, query);
      
      // LLMストリーミング応答の生成（既存のBedrockクライアントを使用）
      const llmCommand = new InvokeModelCommand({
        modelId: model.modelId,
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: contextPrompt
            }
          ]
        }),
      });

      const llmResponse = await bedrockClient.send(llmCommand);
      const result = JSON.parse(new TextDecoder().decode(llmResponse.body));
      
      // レスポンスをストリーミング形式で返す
      yield streamingChunk({ text: result.content[0].text });

      // 参考文献を追加
      const references = searchResults.vectors
        .map((vector, idx) => {
          return `\n[^${idx}]: [${vector.metadata?.title || vector.key}](s3://${VECTOR_BUCKET_NAME}/${vector.key})`;
        })
        .join('');

      yield streamingChunk({ text: references });

    } catch (error) {
      console.error('S3 Vectors API エラー:', error);
      yield streamingChunk({
        text: 'S3 Vectorsでの検索中にエラーが発生しました。管理者に以下のエラーを報告してください。\n' + error,
        stopReason: 'error',
      });
    }
  },

  generateImage: async () => {
    throw new Error('未実装');
  },

  generateVideo: async () => {
    throw new Error('未実装');
  },
};

/**
 * 明示的フィルターを取得する関数
 */
const getExplicitS3VectorFilters = async (
  messages: UnrecordedMessage[],
  idToken?: string
): Promise<Record<string, any> | undefined> => {
  // IDトークンの検証
  const payload = await verifyToken(idToken || '');
  if (!payload) {
    return undefined;
  }

  // 動的フィルターを取得
  const dynamicFilters: Record<string, any>[] = getDynamicS3VectorFilters(payload);

  // ユーザー定義明示的フィルターを取得
  let userDefinedFilters: Record<string, any>[] = [];
  const lastMessage = messages[messages.length - 1];
  if (lastMessage && lastMessage.extraData) {
    userDefinedFilters = lastMessage.extraData
      .filter((extra) => extra.type === 'json')
      .map((extra) => JSON.parse(extra.source.data) as Record<string, any>);
  }

  // フィルターを統合
  const aggregatedFilters: Record<string, any>[] = [
    ...hiddenStaticS3VectorFilters,
    ...dynamicFilters,
    ...userDefinedFilters,
  ];

  if (aggregatedFilters.length === 0) {
    return undefined;
  } else if (aggregatedFilters.length === 1) {
    return aggregatedFilters[0];
  } else {
    // 複数のフィルターをAND条件で結合
    return {
      and: aggregatedFilters,
    };
  }
};

/**
 * 検索結果からコンテキストプロンプトを構築する関数
 */
const buildContextPrompt = (vectors: any[], query: string): string => {
  const context = vectors
    .map((vector, idx) => {
      return `[参考文献${idx}] ${vector.metadata?.title || vector.key}\n${vector.metadata?.content || ''}`;
    })
    .join('\n\n');

  return `以下の参考文献を基に、ユーザーの質問に答えてください。

参考文献:
${context}

質問: ${query}

回答の際は、参考文献の番号を[^0]、[^1]のような形式で引用してください。
参考文献に基づいて回答できない場合は、「提供された情報では回答できません」と答えてください。`;
};

export default s3VectorsApi;