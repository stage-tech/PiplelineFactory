import * as lambda from 'aws-lambda';

import { AWSDevToolsClient } from '../clients/aws-dev-tools-client';
import { GithubClient } from '../clients/github-client';
import { PipelineEventDetail, PipelineExecutionEvent } from '../models';
import { OrganizationManager } from '../monitor/organization-manager';
import { NotificationTargetsManager } from './notification-targets-manager';
import { NotificationsPayloadBuilder } from './notifications-payload-builder';
import { SlackNotificationDeliveryClient } from './slack-manager';

export class PipelineNotificationsHandler {
  constructor(private organizationName: string) {}

  private getEventDetails(event: PipelineExecutionEvent): PipelineEventDetail | undefined {
    const DETAIL_TYPE = 'CodePipeline Pipeline Execution State Change';
    if (event['detail-type'] == DETAIL_TYPE) {
      return {
        pipelineName: event.detail.pipeline,
        executionId: event.detail['execution-id'],
        state: event.detail.state,
      } as PipelineEventDetail;
    }
    return undefined;
  }
  public handler = async (event: lambda.SNSEvent) => {
    const payload = JSON.parse(event.Records[0].Sns.Message || '') as PipelineExecutionEvent;
    const eventDetails = this.getEventDetails(payload);
    if (!eventDetails) {
      console.log('Received event is not Pipeline Execution event and will be ignored');
      return;
    }

    const token = await new OrganizationManager().get(this.organizationName);
    const githubClient = new GithubClient(token.githubToken);
    const awsClient = new AWSDevToolsClient();
    const notificationPayloadBuilder = new NotificationsPayloadBuilder(awsClient, githubClient);
    const slackNotificationClient = new SlackNotificationDeliveryClient();
    const notificationTargetsManager = new NotificationTargetsManager(awsClient, githubClient);

    const notificationTargets = await notificationTargetsManager.getNotificationTargets(
      eventDetails.pipelineName,
      eventDetails.state,
    );

    if (!notificationTargets.length) {
      console.log('No applicable notifications configurations found');
      return;
    }

    const notificationPayload = await notificationPayloadBuilder.buildNotificationPayload(eventDetails);
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
