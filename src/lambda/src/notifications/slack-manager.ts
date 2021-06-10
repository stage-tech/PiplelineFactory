import { WebClient } from '@slack/web-api';

import { PipelineData } from '../models';

export class SlackManager {
  public static publishMessageToSlack = async (data: PipelineData, channel: string): Promise<void> => {
    try {
      const token = process.env.SLACK_TOKEN;
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

  private static formatSlackMessage = (data: PipelineData): string => {
    return Object.keys(data)
      .map((key) => {
        return `${key}: ${data[key]}`;
      })
      .join('\n');
  };
}
