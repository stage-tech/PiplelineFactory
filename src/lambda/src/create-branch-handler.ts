import * as lambda from 'aws-lambda';

import { PipelineManager } from './api/codebuild-manager';
import { PipeLinePropertiesBuilder } from './api/pipeline-properties-builder';
class CreateBranchHandler {
  public handler = async (event: lambda.APIGatewayEvent, context: any) => {
    const payload = JSON.parse(event.body || '');

    const pipelineProps = new PipeLinePropertiesBuilder().build(payload);
    console.log(JSON.stringify(pipelineProps, null, 4));
    const codeBuildManager = new PipelineManager();
    const result = await codeBuildManager.createPipeLine(pipelineProps);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  };
}

export const handler = new CreateBranchHandler().handler;
