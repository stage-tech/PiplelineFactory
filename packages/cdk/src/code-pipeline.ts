import { IProject } from 'aws-cdk-lib/aws-codebuild';
import * as codePipeline from 'aws-cdk-lib/aws-codepipeline';
import { IPipeline } from 'aws-cdk-lib/aws-codepipeline';
import * as codePipelineActions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export interface CodePipelineProps {
  artifactsBucketName: string;
  githubRepositoryBranch: string;
  githubRepositoryOwner: string;
  githubRepositoryName: string;
  gitHubTokenSecretArn: string;
  gitHubConnectionArn: string;
  envName: string;
  buildAsRoleArn: string;
  projectName: string;
  buildProject: IProject;
}

export class CodePipeline extends Construct {
  public readonly pipeline: IPipeline;
  constructor(scope: Construct, id: string, props: CodePipelineProps) {
    super(scope, id);

    const buildAsRole = iam.Role.fromRoleArn(this, 'BuildAsRole', props.buildAsRoleArn);

    const defaultTransientArtifactsBucketName = ssm.StringParameter.fromStringParameterName(
      this,
      'transientArtifactsBucket',
      '/pipeline-factory/transientArtifactsBucket',
    ).stringValue;

    const transientArtifactsBucket = s3.Bucket.fromBucketName(
      this,
      'TransientBucket',
      defaultTransientArtifactsBucketName,
    );

    const pipeline = new codePipeline.Pipeline(this, 'Pipeline', {
      pipelineName: `${props.projectName}`,
      role: buildAsRole,
      artifactBucket: transientArtifactsBucket,
      crossAccountKeys: false,
    });

    if (!props.gitHubConnectionArn) {
      throw new Error(`props.gitHubConnectionArn is empty`);
    }

    console.log(props.gitHubConnectionArn);
    const sourceCodeOutput = new codePipeline.Artifact('SourceCode');
    const fetchSourceAction = new codePipelineActions.CodeStarConnectionsSourceAction({
      actionName: `GitHub-${props.projectName}`,
      repo: props.githubRepositoryName,
      owner: props.githubRepositoryOwner,
      branch: props.githubRepositoryBranch,
      output: sourceCodeOutput,
      connectionArn: props.gitHubConnectionArn,
    });

    pipeline.addStage({
      stageName: 'Fetch',
      actions: [fetchSourceAction],
    });

    const buildOutput = new codePipeline.Artifact('BuildOutput');

    const buildAction = new codePipelineActions.CodeBuildAction({
      actionName: 'RunBuildSpec',
      input: sourceCodeOutput,
      role: buildAsRole,
      project: props.buildProject,
      outputs: [buildOutput],
    });

    pipeline.addStage({
      stageName: 'Build',
      actions: [buildAction],
    });

    if (!props.artifactsBucketName) {
      throw new Error(`props.artifactsBucket is empty`);
    }

    const artifactsBucket = s3.Bucket.fromBucketName(
      this,
      'PipeLineDeploymentArtifactsBucket',
      props.artifactsBucketName,
    );

    const objectPrefix = `${props.githubRepositoryName}/${props.envName}`;

    const publishAction = new codePipelineActions.S3DeployAction({
      actionName: 'S3Deploy',
      role: buildAsRole,
      bucket: artifactsBucket,
      input: buildOutput,
      objectKey: objectPrefix,
    });

    pipeline.addStage({
      stageName: 'Deploy',
      actions: [publishAction],
    });

    this.pipeline = pipeline;
  }
}
