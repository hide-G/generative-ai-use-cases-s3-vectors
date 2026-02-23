import React, { useCallback, useEffect, useMemo, useState } from 'react';
import InputChatContent from '../components/InputChatContent';
import { create } from 'zustand';
import useChat from '../hooks/useChat';
import { useLocation } from 'react-router-dom';
import ChatMessage from '../components/ChatMessage';
import Select from '../components/Select';
import useFollow from '../hooks/useFollow';
import ScrollTopBottom from '../components/ScrollTopBottom';
import BedrockIcon from '../assets/bedrock.svg?react';
import { RagPageQueryParams } from '../@types/navigate';
import { MODELS } from '../hooks/useModel';
import queryString from 'query-string';
import { getPrompter } from '../prompts';
import ExpandableField from '../components/ExpandableField';
import { userDefinedS3VectorFilters } from '@generative-ai-use-cases/common';
import {
  S3VectorFilterConfiguration,
  ExtraData,
} from 'generative-ai-use-cases';
import { Option, SelectValue } from '../components/FilterSelect';
import ModalDialog from '../components/ModalDialog';
import Button from '../components/Button';
import { useTranslation } from 'react-i18next';
import KbFilter, { RetrievalFilterLabel } from '../components/KbFilter';

// SVG component for S3 Vectors icon (temporary)
const S3VectorsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 64 64" fill="currentColor">
    <rect
      x="8"
      y="16"
      width="48"
      height="32"
      rx="4"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    <circle cx="20" cy="28" r="3" fill="currentColor" />
    <circle cx="32" cy="36" r="3" fill="currentColor" />
    <circle cx="44" cy="28" r="3" fill="currentColor" />
    <path
      d="M20 28 L32 36 L44 28"
      stroke="currentColor"
      strokeWidth="1"
      fill="none"
    />
  </svg>
);

type StateType = {
  sessionId: string | undefined;
  content: string;
  filters: (RetrievalFilterLabel | null)[];
  setSessionId: (c: string | undefined) => void;
  setContent: (c: string) => void;
  setFilters: (f: (RetrievalFilterLabel | null)[]) => void;
};

const useRagS3VectorsPageState = create<StateType>((set) => {
  return {
    sessionId: undefined,
    content: '',
    filters: userDefinedS3VectorFilters.map(() => null),
    setSessionId: (s: string | undefined) => {
      set(() => ({
        sessionId: s,
      }));
    },
    setContent: (s: string) => {
      set(() => ({
        content: s,
      }));
    },
    setFilters: (f: (RetrievalFilterLabel | null)[]) => {
      set(() => ({
        filters: f,
      }));
    },
  };
});

/**
 * S3 Vectors RAG chat page component
 */
const RagS3VectorsPage: React.FC = () => {
  const { t } = useTranslation();
  const { sessionId, content, filters, setContent, setFilters, setSessionId } =
    useRagS3VectorsPageState();
  const { pathname, search } = useLocation();
  const {
    getModelId,
    setModelId,
    loading,
    writing,
    isEmpty,
    messages,
    clear,
    postChat,
    editChat,
    updateSystemContextByModel,
    retryGeneration,
    forceToStop,
  } = useChat(pathname);
  const { scrollableContainer, setFollowing } = useFollow();
  const { modelIdsInModelRegion: availableModels, modelDisplayName } = MODELS;
  const modelId = getModelId();
  const prompter = useMemo(() => {
    return getPrompter(modelId);
  }, [modelId]);

  const [showSetting, setShowSetting] = useState(false);

  // Function to convert filters to S3 Vectors format
  const convertFilterToS3VectorFormat = (
    f: RetrievalFilterLabel | null,
    filterConfig: S3VectorFilterConfiguration
  ): Record<string, unknown> | null => {
    if (f === null) return null;

    const selectValueToValue = (
      selectValue: SelectValue,
      filterConfig: S3VectorFilterConfiguration
    ): string[] | string | number | boolean | null => {
      if (selectValue === null) return null;
      if (filterConfig.type === 'STRING_LIST' || Array.isArray(selectValue)) {
        return (selectValue as Option[]).map((v) => v.value);
      } else if (selectValue.value === null) {
        return null;
      } else if (filterConfig.type === 'STRING') {
        return (selectValue as Option).value;
      } else if (filterConfig.type === 'BOOLEAN') {
        return (selectValue as Option).value === 'true';
      } else if (filterConfig.type === 'NUMBER') {
        return (selectValue as Option).value === '' ||
          isNaN(Number((selectValue as Option).value))
          ? null
          : Number((selectValue as Option).value);
      }
      return null;
    };

    // Get the first non-null filter operator and its value
    const activeOperator = Object.keys(f).find(
      (key) => f[key as keyof RetrievalFilterLabel]?.value !== null
    ) as keyof RetrievalFilterLabel;

    if (!activeOperator) return null;

    const filterAttributeLabel = f[activeOperator];
    if (!filterAttributeLabel) return null;

    return {
      [activeOperator]: {
        key: filterAttributeLabel.key,
        value: selectValueToValue(filterAttributeLabel.value, filterConfig),
      },
    };
  };

  useEffect(() => {
    updateSystemContextByModel();
    // eslint-disable-next-line  react-hooks/exhaustive-deps
  }, [prompter]);

  useEffect(() => {
    const _modelId = !modelId ? availableModels[0] : modelId;
    if (search !== '') {
      const params = queryString.parse(search) as RagPageQueryParams;
      setContent(params.content ?? '');
      setModelId(
        availableModels.includes(params.modelId ?? '')
          ? params.modelId!
          : _modelId
      );
    } else {
      setModelId(_modelId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableModels, modelId, search, setContent]);

  const getExtraDataFromFilters = useCallback(() => {
    return filters
      .map((f, index) =>
        convertFilterToS3VectorFormat(f, userDefinedS3VectorFilters[index])
      )
      .filter(
        (f: Record<string, unknown> | null) =>
          f !== null &&
          Object.values(f).filter(
            (v) => (v as Record<string, unknown>).value != null
          ).length > 0
      )
      .map(
        (f) =>
          ({
            type: 'json',
            name: 'filter',
            source: {
              type: 'json',
              mediaType: 'application/json',
              data: JSON.stringify(f),
            },
          }) as ExtraData
      );
  }, [filters]);

  const onSend = useCallback(() => {
    setFollowing(true);
    // Add extraData if filters exist
    const extraData: ExtraData[] = getExtraDataFromFilters();
    postChat(
      content,
      false,
      undefined,
      undefined,
      sessionId,
      undefined,
      extraData,
      's3Vectors', // API type for S3 Vectors
      setSessionId
    );
    setContent('');
  }, [
    content,
    sessionId,
    postChat,
    getExtraDataFromFilters,
    setContent,
    setFollowing,
    setSessionId,
  ]);

  const onRetry = useCallback(() => {
    const extraData: ExtraData[] = getExtraDataFromFilters();
    retryGeneration(
      false,
      undefined,
      undefined,
      sessionId,
      undefined,
      extraData,
      's3Vectors',
      setSessionId
    );
  }, [sessionId, getExtraDataFromFilters, retryGeneration, setSessionId]);

  const onReset = useCallback(() => {
    clear();
    setContent('');
    setFilters(userDefinedS3VectorFilters.map(() => null));
    setSessionId(undefined);
  }, [clear, setContent, setFilters, setSessionId]);

  const onEdit = useCallback(
    (modifiedPrompt: string) => {
      const extraData: ExtraData[] = getExtraDataFromFilters();
      editChat(
        modifiedPrompt,
        false,
        undefined,
        undefined,
        sessionId,
        undefined,
        extraData,
        's3Vectors',
        setSessionId
      );
    },
    [sessionId, getExtraDataFromFilters, editChat, setSessionId]
  );

  const onStop = useCallback(() => {
    forceToStop();
    setSessionId(undefined);
  }, [forceToStop, setSessionId]);

  return (
    <>
      <div className={`${!isEmpty ? 'screen:pb-48' : ''} relative`}>
        <div className="invisible my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min print:visible print:my-5 print:h-min">
          {t('rag.s3vectors.title')}
        </div>

        <div className="mt-2 flex w-full items-end justify-center lg:mt-0">
          <Select
            value={modelId}
            onChange={setModelId}
            options={availableModels.map((m) => {
              return { value: m, label: modelDisplayName(m) };
            })}
          />
        </div>

        {isEmpty && (
          <div className="relative flex h-[calc(100vh-9rem)] flex-col items-center justify-center">
            <div className="flex items-center gap-x-3">
              <S3VectorsIcon className="size-[64px] fill-gray-400" />
              <span className="text-2xl text-gray-400">{t('common.plus')}</span>
              <BedrockIcon className="fill-gray-400" />
            </div>
            <div className="mt-4 text-center text-gray-500">
              <p>{t('rag.s3vectors.description')}</p>
              <p className="text-sm">{t('rag.s3vectors.performance')}</p>
            </div>
          </div>
        )}

        <div ref={scrollableContainer}>
          {messages.map((chat, idx) => (
            <div key={idx}>
              <ChatMessage
                idx={idx}
                chatContent={chat}
                loading={loading && idx === messages.length - 1}
                allowRetry={idx === messages.length - 1}
                retryGeneration={onRetry}
                editable={idx === messages.length - 2 && !loading}
                onCommitEdit={
                  idx === messages.length - 2 && !loading ? onEdit : undefined
                }
              />
              <div className="w-full border-b border-gray-300"></div>
            </div>
          ))}
        </div>

        <div className={`fixed right-4 top-[calc(50vh-2rem)] z-0 lg:right-8`}>
          <ScrollTopBottom />
        </div>

        <div
          className={`fixed bottom-0 z-0 flex w-full flex-col items-center justify-center lg:pr-64 print:hidden`}>
          <InputChatContent
            content={content}
            disabled={loading && !writing}
            onChangeContent={setContent}
            onSend={() => {
              if (!loading) {
                onSend();
              } else {
                onStop();
              }
            }}
            onReset={onReset}
            setting={true}
            onSetting={() => {
              setShowSetting(true);
            }}
            canStop={writing}
          />
        </div>
      </div>

      <ModalDialog
        isOpen={showSetting}
        onClose={() => {
          setShowSetting(false);
        }}
        title={t('chat.advanced_options')}>
        {userDefinedS3VectorFilters.length > 0 && (
          <ExpandableField
            label={t('rag.s3vectors.filter')}
            className="relative w-full"
            defaultOpened={true}>
            <div className="flex justify-end">
              <div>
                {t('rag.s3vectors.filter_config_reference')}{' '}
                <a
                  className="text-aws-smile underline"
                  href="https://github.com/aws-samples/generative-ai-use-cases/blob/main/packages/common/src/custom/rag-s3-vectors.ts"
                  target="_blank">
                  {t('rag.s3vectors.here')}
                </a>{' '}
                {t('rag.s3vectors.please_refer')}
              </div>
            </div>

            <KbFilter
              filterConfigs={userDefinedS3VectorFilters}
              filters={filters}
              setFilters={setFilters}
            />
          </ExpandableField>
        )}
        {userDefinedS3VectorFilters.length === 0 && (
          <p>
            {t('rag.s3vectors.no_config_found')}{' '}
            <a
              className="text-aws-smile underline"
              href="https://github.com/aws-samples/generative-ai-use-cases/blob/main/packages/common/src/custom/rag-s3-vectors.ts"
              target="_blank">
              {t('rag.s3vectors.config_file_path')}
            </a>{' '}
            {t('rag.s3vectors.can_add_filters')}
          </p>
        )}
        <div className="mt-4 flex justify-end">
          <Button
            onClick={() => {
              setShowSetting(false);
            }}>
            {t('chat.settings')}
          </Button>
        </div>
      </ModalDialog>
    </>
  );
};

export default RagS3VectorsPage;
