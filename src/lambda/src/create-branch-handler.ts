import * as lambda from 'aws-lambda';

import { PipelineManager } from './codebuild-manager';
import { PipeLinePropertiesBuilder } from './pipeline-properties-builder';
class CreateBranchHandler {
  public handler = async (event: lambda.APIGatewayEvent, context: any) => {
    const payload = JSON.parse(event.body || '');

    const pipelineProps = new PipeLinePropertiesBuilder().build(payload);

    const codeBuildManager = new PipelineManager();
    return codeBuildManager.createPipeLine(pipelineProps);
  };
}

export const handler = new CreateBranchHandler().handler;
