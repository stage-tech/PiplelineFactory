import * as lambda from 'aws-lambda';

import { AWSClient } from '../clients/aws-client';
import { GithubClient } from '../clients/github-client';
import { NotificationPayload, PipelineExecutionEvent } from '../models';
import { OrganizationManager } from '../monitor/organization-manager';
import { NotificationTargetsManager } from './notification-targets-manager';
import { NotificationsPayloadBuilder } from './notifications-payload-builder';
import { SlackManager } from './slack-manager';

export class PipelineNotificationsHandler {
  constructor(private organizationName: string) {}
  public handler = async (event: lambda.SNSEvent) => {
    const payload = JSON.parse(event.Records[0].Sns.Message || '') as PipelineExecutionEvent;
    const token = await new OrganizationManager().get(this.organizationName);
    const githubClient = new GithubClient(token.githubToken);
    const awsClient = new AWSClient();
    const notificationsPayloadBuilder = new NotificationsPayloadBuilder(awsClient, githubClient);
    const eventDetails = notificationsPayloadBuilder.getEventDetails(payload);
    if (!eventDetails) {
      console.log('Received event is not Pipeline Execution event and will be ignored');
      return;
    }
    const factorySettingsManager = new NotificationTargetsManager(awsClient, githubClient);

    const notificationTargets = await factorySettingsManager.getRequiredNotificationTargets(
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
      | undefined = await notificationsPayloadBuilder.buildNotificationPayload(eventDetails);
    if (notificationPayload) {
      notificationTargets.forEach(async (settings) => {
        await SlackManager.publishMessageToSlack(notificationPayload, settings.channelId);
      });
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
