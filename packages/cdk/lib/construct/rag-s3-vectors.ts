import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { ISecurityGroup, IVpc } from 'aws-cdk-lib/aws-ec2';

export interface RagS3VectorsProps {
  // Context parameters
  readonly modelRegion: string;
  readonly crossAccountBedrockRoleArn?: string | null;

  // Knowledge Base ID for S3 Vectors
  readonly s3VectorsKnowledgeBaseId: string;

  // S3 bucket name for Knowledge Base data source (optional, for PDF download access)
  readonly s3VectorsDataSourceBucketName?: string;

  // Existing predictStreamFunction to add environment variables and permissions
  readonly predictStreamFunction: NodejsFunction;

  // Closed network configuration
  readonly vpc?: IVpc;
  readonly securityGroups?: ISecurityGroup[];
}

/**
 * RAG chat configuration for Amazon S3 Vectors via Knowledge Base
 * This construct adds S3 Vectors Knowledge Base support to the existing predictStreamFunction
 */
export class RagS3Vectors extends Construct {
  constructor(scope: Construct, id: string, props: RagS3VectorsProps) {
    super(scope, id);

    const { modelRegion, s3VectorsKnowledgeBaseId, predictStreamFunction } =
      props;

    // Add S3_VECTORS_KNOWLEDGE_BASE_ID environment variable to predictStreamFunction
    predictStreamFunction.addEnvironment(
      'S3_VECTORS_KNOWLEDGE_BASE_ID',
      s3VectorsKnowledgeBaseId
    );

    // Add IAM permissions for S3 Vectors Knowledge Base access
    if (!props.crossAccountBedrockRoleArn) {
      // Grant permission to retrieve from S3 Vectors Knowledge Base
      predictStreamFunction.role?.addToPrincipalPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [
            `arn:aws:bedrock:${modelRegion}:${cdk.Stack.of(this).account}:knowledge-base/${s3VectorsKnowledgeBaseId}`,
          ],
          actions: ['bedrock:Retrieve', 'bedrock:RetrieveAndGenerate'],
        })
      );
    } else {
      // Cross-account role usage
      const assumeRolePolicy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['sts:AssumeRole'],
        resources: [props.crossAccountBedrockRoleArn],
      });
      predictStreamFunction.role?.addToPrincipalPolicy(assumeRolePolicy);
    }
  }
}
