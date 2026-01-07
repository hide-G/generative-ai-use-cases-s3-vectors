import {
  RetrieveS3VectorsRequest,
  RetrieveS3VectorsResponse,
} from 'generative-ai-use-cases';
import useHttp from './useHttp';

/**
 * S3 Vectors RAG API用のカスタムフック
 */
const useRagS3VectorsApi = () => {
  const http = useHttp();
  
  return {
    /**
     * S3 Vectorsからドキュメントを検索する
     * @param query 検索クエリ
     * @returns 検索結果
     */
    retrieve: (query: string) => {
      return http.post<
        RetrieveS3VectorsResponse,
        RetrieveS3VectorsRequest
      >('/rag-s3-vectors/retrieve', {
        query,
      });
    },
  };
};

export default useRagS3VectorsApi;