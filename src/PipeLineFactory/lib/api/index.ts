import * as cdk from "@aws-cdk/core";
import ApiEntryPoint from "./apiEntryPoint";
import BranchHandlers from "./branchHandlers";

export interface ApiProps {
  triggerCodeS3Key: string;
  triggerCodeS3Bucket: string;
  defaultArtifactsBucketName: string;
  defaultGithubTokenSecretName: string;
  apiDomainName: string | undefined;
  apiDomainCertificateArn: string | undefined;
  PipelineFactoryBuildProjectName: string;
  buildAsRoleArn: string;
}

export default class Api extends cdk.Construct {
  public readonly buildProjectArn: string;
  constructor(scope: cdk.Construct, id: string, props: ApiProps) {
    super(scope, id);

    const handlers = new BranchHandlers(this, "handlers", {
      factoryBuilderRoleArn: props.buildAsRoleArn,
      factoryBuilderProjectName: props.PipelineFactoryBuildProjectName,
      default_github_token_secret_name: props.defaultGithubTokenSecretName,
      defaultBuildArtifactsBucketName: props.defaultArtifactsBucketName,
      triggerCodeS3Bucket: props.triggerCodeS3Bucket,
      triggerCodeS3Key: props.triggerCodeS3Key,
    });

    new ApiEntryPoint(this, "Api", {
      apiBranchCreated: handlers.apiBranchCreated,
      apiBranchDeleted: handlers.apiBranchDeleted,
      apiDomainCertificateArn: props.apiDomainCertificateArn,
      apiDomainName: props.apiDomainName,
    });
  }
}
