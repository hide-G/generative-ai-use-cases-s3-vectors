import bedrockApi from './bedrockApi';
import bedrockAgentApi from './bedrockAgentApi';
import bedrockKbApi from './bedrockKbApi';
import s3VectorsApi from './s3VectorsApi';
import sagemakerApi from './sagemakerApi';

const api = {
  bedrock: bedrockApi,
  bedrockAgent: bedrockAgentApi,
  bedrockKb: bedrockKbApi,
  s3Vectors: s3VectorsApi,
  sagemaker: sagemakerApi,
};

export default api;
