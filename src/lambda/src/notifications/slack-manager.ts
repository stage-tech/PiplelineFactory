import { WebClient } from '@slack/web-api';
import AWS from 'aws-sdk';

import { NotificationPayload } from '../models';

export class SlackManager {
  public static publishMessageToSlack = async (data: NotificationPayload, channel: string): Promise<void> => {
    try {
      const ssm = new AWS.SSM();
      const parameterReadResponse = await ssm
        .getParameter({
          Name: `/pipeline-factory/notifications/slack/${channel}/webhook`,
        })
        .promise();
      const token = parameterReadResponse.Parameter?.Value;
      const slackClient = new WebClient(token);
      await slackClient.chat.postMessage({
        mrkdwn: true,
        text: typeof data === 'string' ? data : SlackManager.formatSlackMessage(data),
        channel: channel,
      });
    } catch (error) {
      console.error(`Error while publishing message to Slack: ${error}`);
    }
  };

  private static formatSlackMessage = (data: NotificationPayload): string => {
    return Object.keys(data)
      .map((key) => {
        return `${key}: ${data[key]}`;
      })
      .join('\n');
  };
}
