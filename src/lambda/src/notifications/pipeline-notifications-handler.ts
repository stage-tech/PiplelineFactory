import * as lambda from 'aws-lambda';

import { AWSCodePipelineClient } from '../clients/aws-client';
import { GithubClient } from '../clients/github-client';
import { NotificationPayload, PipelineExecutionEvent } from '../models';
import { OrganizationManager } from '../monitor/organization-manager';
import { NotificationTargetsManager } from './notification-targets-manager';
import { NotificationsPayloadBuilder } from './notifications-payload-builder';
import { SlackNotificationDeliveryClient } from './slack-manager';

export class PipelineNotificationsHandler {
  constructor(private organizationName: string) {}
  public handler = async (event: lambda.SNSEvent) => {
    const payload = JSON.parse(event.Records[0].Sns.Message || '') as PipelineExecutionEvent;
    const token = await new OrganizationManager().get(this.organizationName);
    const githubClient = new GithubClient(token.githubToken);
    const awsClient = new AWSCodePipelineClient();
    const notificationPayloadBuilder = new NotificationsPayloadBuilder(awsClient, githubClient);
    const eventDetails = notificationPayloadBuilder.getEventDetails(payload);
    const slackNotificationClient = new SlackNotificationDeliveryClient();
    if (!eventDetails) {
      console.log('Received event is not Pipeline Execution event and will be ignored');
      return;
    }
    const notificationTargetsManager = new NotificationTargetsManager(awsClient, githubClient);

    const notificationTargets = await notificationTargetsManager.getNotificationTargets(
      eventDetails.pipeline,
      eventDetails.executionId,
      eventDetails.state,
    );

    if (!notificationTargets.length) {
      console.log('No applicable notifications configurations found');
      return;
    }

    const notificationPayload:
      | NotificationPayload
      | undefined = await notificationPayloadBuilder.buildNotificationPayload(eventDetails);
    if (notificationPayload) {
      for (let i = 0; i < notificationTargets.length; i++) {
        slackNotificationClient.supportedChannel(notificationTargets[i].channelId, notificationTargets[i].channelType);
        await slackNotificationClient.send(notificationPayload);
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
