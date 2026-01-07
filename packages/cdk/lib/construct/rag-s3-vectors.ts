import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  LambdaIntegration,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LAMBDA_RUNTIME_NODEJS } from '../../consts';
import { ISecurityGroup, IVpc } from 'aws-cdk-lib/aws-ec2';

export interface RagS3VectorsProps {
  // コンテキストパラメータ
  readonly modelRegion: string;
  readonly crossAccountBedrockRoleArn?: string | null;
  readonly embeddingModelId: string;

  // リソース
  readonly vectorBucketName: string;
  readonly vectorIndexName: string;
  readonly userPool: UserPool;
  readonly api: RestApi;

  // クローズドネットワーク
  readonly vpc?: IVpc;
  readonly securityGroups?: ISecurityGroup[];
}

/**
 * Amazon S3 Vectors用のRAGチャット構成
 */
export class RagS3Vectors extends Construct {
  constructor(scope: Construct, id: string, props: RagS3VectorsProps) {
    super(scope, id);

    const { modelRegion, embeddingModelId } = props;

    // S3 Vectorsからドキュメントを検索するLambda関数
    const retrieveFunction = new NodejsFunction(this, 'RetrieveS3Vectors', {
      runtime: LAMBDA_RUNTIME_NODEJS,
      entry: './lambda/retrieveS3Vectors.ts',
      timeout: cdk.Duration.minutes(15),
      environment: {
        VECTOR_BUCKET_NAME: props.vectorBucketName,
        VECTOR_INDEX_NAME: props.vectorIndexName,
        EMBEDDING_MODEL_ID: embeddingModelId,
        MODEL_REGION: modelRegion,
        CROSS_ACCOUNT_BEDROCK_ROLE_ARN: props.crossAccountBedrockRoleArn ?? '',
      },
      vpc: props.vpc,
      securityGroups: props.securityGroups,
    });

    // IAM権限の設定
    if (!props.crossAccountBedrockRoleArn) {
      // S3 Vectorsへのアクセス権限（GA版）
      retrieveFunction.role?.addToPrincipalPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [
            `arn:aws:s3vectors:${modelRegion}:${cdk.Stack.of(this).account}:vector-bucket/${props.vectorBucketName}`,
            `arn:aws:s3vectors:${modelRegion}:${cdk.Stack.of(this).account}:vector-bucket/${props.vectorBucketName}/vector-index/${props.vectorIndexName}`,
          ],
          actions: [
            's3vectors:QueryVectors',
            's3vectors:GetVectors',
            's3vectors:ListVectors',
          ],
        })
      );

      // Bedrockへのアクセス権限（埋め込みモデル用）
      retrieveFunction.role?.addToPrincipalPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [
            `arn:aws:bedrock:${modelRegion}::foundation-model/${embeddingModelId}`,
            `arn:aws:bedrock:${modelRegion}::foundation-model/*`,
          ],
          actions: ['bedrock:InvokeModel'],
        })
      );
    } else {
      // クロスアカウントロールの使用
      const assumeRolePolicy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['sts:AssumeRole'],
        resources: [props.crossAccountBedrockRoleArn],
      });
      retrieveFunction.role?.addToPrincipalPolicy(assumeRolePolicy);
    }

    // API Gateway認証の設定
    const authorizer = new CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [props.userPool],
    });

    const commonAuthorizerProps = {
      authorizationType: AuthorizationType.COGNITO,
      authorizer,
    };

    // API Gatewayリソースの作成
    const ragS3VectorsResource = props.api.root.addResource('rag-s3-vectors');

    // POST: /rag-s3-vectors/retrieve
    const retrieveResource = ragS3VectorsResource.addResource('retrieve');
    retrieveResource.addMethod(
      'POST',
      new LambdaIntegration(retrieveFunction),
      commonAuthorizerProps
    );
  }
}