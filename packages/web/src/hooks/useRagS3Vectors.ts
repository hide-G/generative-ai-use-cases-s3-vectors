import { useMemo } from 'react';
import useChat from './useChat';
import useChatApi from './useChatApi';
import useRagS3VectorsApi from './useRagS3VectorsApi';
import { ShownMessage } from 'generative-ai-use-cases';
import { findModelByModelId } from './useModel';
import { getPrompter } from '../prompts';
import { cleanEncode } from '../utils/URLUtils';
import { useTranslation } from 'react-i18next';

// ベクトル検索結果のアイテムを整理する関数
export const arrangeS3VectorItems = (
  items: Array<{
    key: string;
    distance?: number;
    metadata?: Record<string, any>;
  }>
): Array<{
  key: string;
  distance?: number;
  metadata?: Record<string, any>;
  title?: string;
  content?: string;
}> => {
  return items.map((item) => ({
    ...item,
    title: item.metadata?.title || item.key,
    content: item.metadata?.content || '',
  }));
};

/**
 * S3 Vectors RAG用のカスタムフック
 */
const useRagS3Vectors = (id: string) => {
  const { t } = useTranslation();

  const {
    getModelId,
    messages,
    postChat,
    clear,
    loading,
    writing,
    setLoading,
    updateSystemContext,
    popMessage,
    pushMessage,
    isEmpty,
  } = useChat(id);

  const modelId = getModelId();
  const { retrieve } = useRagS3VectorsApi();
  const { predict } = useChatApi();
  const prompter = useMemo(() => {
    return getPrompter(modelId);
  }, [modelId]);

  return {
    isEmpty,
    clear,
    loading,
    writing,
    messages,
    postMessage: async (content: string) => {
      const model = findModelByModelId(modelId);

      if (!model) {
        console.error(`モデルが見つかりません: ${modelId}`);
        return;
      }

      const prevQueries = messages
        .filter((m) => m.role === 'user')
        .map((m) => m.content);

      // S3 Vectorsから検索する際にローディングを表示
      setLoading(true);
      pushMessage('user', content);
      pushMessage('assistant', t('rag.retrieving'));

      // 検索クエリを生成
      const query = await predict({
        model: model,
        messages: [
          {
            role: 'user',
            content: prompter.ragPrompt({
              promptType: 'RETRIEVE',
              retrieveQueries: [...prevQueries, content],
            }),
          },
        ],
        id: id,
      });

      // S3 Vectorsから参考ドキュメントを検索してシステムプロンプトに設定
      let items: Array<{
        key: string;
        distance?: number;
        metadata?: Record<string, any>;
        title?: string;
        content?: string;
      }> = [];

      try {
        const retrievedItems = await retrieve(query);
        items = arrangeS3VectorItems(retrievedItems.data.vectors ?? []);
      } catch (error) {
        popMessage();
        pushMessage('assistant', t('rag.errorRetrieval'));
        setLoading(false);
        return;
      }

      if (items.length === 0) {
        popMessage();
        pushMessage('assistant', t('rag.noDocuments'));
        setLoading(false);
        return;
      }

      // システムコンテキストを更新（S3 Vectors用のプロンプトを使用）
      updateSystemContext(
        prompter.ragPrompt({
          promptType: 'SYSTEM_CONTEXT',
          referenceItems: items.map((item) => ({
            DocumentId: item.key,
            DocumentTitle: item.title || item.key,
            Content: item.content || '',
            DocumentURI: `s3://${process.env.VITE_APP_S3_VECTORS_BUCKET_NAME}/${item.key}`,
          })),
        })
      );

      // ローディングを非表示にして、通常のチャットのPOST処理を実行
      popMessage();
      popMessage();
      postChat(
        content,
        false,
        (messages: ShownMessage[]) => {
          // 前処理: Few-shotを使用するため、過去のログから脚注を削除
          return messages.map((message) => ({
            ...message,
            content: message.content
              .replace(/\[\^0\]:[\s\S]*/s, '') // 文末の脚注を削除
              .replace(/\[\^(\d+)\]/g, '') // 文中の脚注アンカーを削除
              .trim(), // 前後の空白を削除
          }));
        },
        (message: string) => {
          // 後処理: 脚注を追加
          const footnote = items
            .map((item, idx) => {
              return message.includes(`[^${idx}]`)
                ? `[^${idx}]: [${item.title}](s3://${process.env.VITE_APP_S3_VECTORS_BUCKET_NAME}/${cleanEncode(item.key)})`
                : '';
            })
            .filter((x) => x)
            .join('\n');
          return message + '\n' + footnote;
        }
      );
    },
  };
};

export default useRagS3Vectors;