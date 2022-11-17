import { Construct } from 'constructs';

import ApiEntryPoint from './apiEntryPoint';
import BranchHandlers from './branchHandlers';

export interface ApiProps {
  lambdaCodeEntryPoint: string;
  githubToken: string;
  triggerCodeS3Key: string;
  triggerCodeS3Bucket: string;
  apiDomainName: string | undefined;
  apiDomainCertificateArn: string | undefined;
  PipelineFactoryBuildProjectName: string;
}

export default class Api extends Construct {
  public readonly buildProjectArn: string;
  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);

    const handlers = new BranchHandlers(this, 'handlers', {
      factoryBuilderProjectName: props.PipelineFactoryBuildProjectName,
      triggerCodeS3Bucket: props.triggerCodeS3Bucket,
      triggerCodeS3Key: props.triggerCodeS3Key,
      githubToken: props.githubToken,
      lambdaCodeEntryPoint: props.lambdaCodeEntryPoint,
    });

    new ApiEntryPoint(this, 'Api', {
      apiBranchCreated: handlers.apiBranchCreated,
      apiBranchDeleted: handlers.apiBranchDeleted,
      apiDomainCertificateArn: props.apiDomainCertificateArn,
      apiDomainName: props.apiDomainName,
    });
  }
}
