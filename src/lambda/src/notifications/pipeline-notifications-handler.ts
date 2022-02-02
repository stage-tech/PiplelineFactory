import * as lambda from 'aws-lambda';

import { AWSDevToolsClient } from '../clients/aws-dev-tools-client';
import { GithubClient } from '../clients/github-client';
import { BuildEventSource, PipelineEventDetail, ExecutionEvent } from '../models';
import { OrganizationManager } from '../monitor/organization-manager';
import { NotificationTargetsManager } from './notification-targets-manager';
import { CodeBuildNotificationsPayloadBuilder } from './payload-builder/code-build';
import { CodePipelineNotificationsPayloadBuilder } from './payload-builder/code-pipeline';
import { INotificationsPayloadBuilder } from './payload-builder/interface';
import { SlackNotificationDeliveryClient } from './slack-manager';

export class PipelineNotificationsHandler {
  constructor(private organizationName: string) {}

  private getEventDetails(event: ExecutionEvent): PipelineEventDetail | undefined {
    const CODEPIPELINE_DETAIL_TYPE = 'CodePipeline Pipeline Execution State Change';
    const CODEBUILD_DETAIL_TYPE = 'CodeBuild Build State Change';
    if (event['detail-type'] == CODEPIPELINE_DETAIL_TYPE) {
      return {
        name: event.detail.pipeline,
        executionId: event.detail['execution-id'],
        state: event.detail.state,
        source: BuildEventSource.AWS_CODE_PIPELINE,
      } as PipelineEventDetail;
    }
    if (event['detail-type'] == CODEBUILD_DETAIL_TYPE) {
      return {
        name: event.detail['project-name'],
        executionId: event.detail['build-id'],
        state: event.detail['build-status'],
        source: BuildEventSource.AWS_CODE_BUILD,
      } as PipelineEventDetail;
    }
    return undefined;
  }

  public handler = async (event: lambda.SNSEvent) => {
    const payload = JSON.parse(event.Records[0].Sns.Message || '') as ExecutionEvent;
    console.log(JSON.stringify(payload, null, 4));
    const eventDetails = this.getEventDetails(payload);
    if (!eventDetails) {
      console.log('Received event is not Pipeline Execution event and will be ignored');
      return;
    }

    const token = await new OrganizationManager().get(this.organizationName);
    const githubClient = new GithubClient(token.githubToken);
    const awsClient = new AWSDevToolsClient();
    let notificationPayloadBuilder: INotificationsPayloadBuilder;
    if (eventDetails.source === BuildEventSource.AWS_CODE_PIPELINE) {
      notificationPayloadBuilder = new CodePipelineNotificationsPayloadBuilder(awsClient, githubClient, eventDetails);
    } else if (eventDetails.source === BuildEventSource.AWS_CODE_BUILD) {
      notificationPayloadBuilder = new CodeBuildNotificationsPayloadBuilder(awsClient, githubClient, eventDetails);
    } else {
      throw new Error('No notification builder found ');
    }

    const slackNotificationClient = new SlackNotificationDeliveryClient();
    const notificationTargetsManager = new NotificationTargetsManager(awsClient, githubClient);

    const notificationTargets = await notificationTargetsManager.getNotificationTargets(
      eventDetails.name,
      eventDetails.state,
    );

    if (!notificationTargets.length) {
      console.log('No applicable notifications configurations found');
      return;
    }

    const notificationPayload = await notificationPayloadBuilder.buildNotificationPayload();
    if (notificationPayload) {
      for (let i = 0; i < notificationTargets.length; i++) {
        await slackNotificationClient.send(notificationPayload, notificationTargets[i]);
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notificationPayload),
    };
  };
}

if (!process.env.ORGANIZATION_NAME) {
  throw new Error(`process.env.ORGANIZATION_NAME is not provided`);
}

export const handler = new PipelineNotificationsHandler(process.env.ORGANIZATION_NAME).handler;
