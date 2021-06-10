import * as lambda from 'aws-lambda';

import { AWSClient } from '../clients/aws-client';
import { GithubClient } from '../clients/github-client';
import { NotificationPayload, PipelineExecutionEvent } from '../models';
import { OrganizationManager } from '../monitor/organization-manager';
import { NotificationTargetsManager } from './notification-targets-manager';
import { NotificationsPayloadBuilder } from './notifications-payload-builder';
import { SlackManager } from './slack-manager';

export class PipelineNotificationsHandler {
  public handler = async (event: lambda.SNSEvent) => {
    const payload = JSON.parse(event.Records[0].Sns.Message || '') as PipelineExecutionEvent;
    const token = await new OrganizationManager().get('stage-tech');
    const githubClient = new GithubClient(token.githubToken);
    const awsClient = new AWSClient();
    const notificationsPayloadBuilder = new NotificationsPayloadBuilder(awsClient, githubClient);
    const eventDetails = notificationsPayloadBuilder.getEventDetails(payload);
    const factorySettingsManager = new NotificationTargetsManager(awsClient, githubClient);
    console.log(payload);

    const notificationTargets = await factorySettingsManager.getRequiredNotificationTargets(
      eventDetails.pipeline,
      eventDetails.executionId,
      eventDetails.state,
    );

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
      body: JSON.stringify(JSON.stringify('notification')),
    };
  };
}

export const handler = new PipelineNotificationsHandler().handler;
