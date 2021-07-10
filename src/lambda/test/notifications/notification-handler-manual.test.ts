import dotenv from 'dotenv';

import { PipelineNotificationsHandler } from '../../src/notifications/pipeline-notifications-handler';
import AuthHelper from '../auth-helper';

dotenv.config();
const OLD_ENV = process.env;
jest.setTimeout(30 * 60 * 1000);
beforeEach(() => {
  jest.resetModules(); // this is important - it clears the cache
  process.env = {
    ...OLD_ENV,
    AWS_SDK_LOAD_CONFIG: '1',
  };

  const credentials = AuthHelper.LoadCredentials('salt-dev');
  console.log(credentials.accessKeyId);

  delete process.env.NODE_ENV;
});

afterEach(() => {
  process.env = OLD_ENV;
});

describe('notification lambda Harness', () => {
  it('notification handler lambda', async () => {
    const handler = new PipelineNotificationsHandler('stage-tech');
    const notificationPayLoad = JSON.stringify({
      version: '0',
      id: '19b64e2c-005d-4f1b-b0bd-0eca9227799e',
      'detail-type': 'CodePipeline Pipeline Execution State Change',
      source: 'aws.codepipeline',
      account: '928065939415',
      time: '2021-01-14T11:32:08Z',
      region: 'eu-west-1',
      resources: ['arn:aws:codepipeline:eu-west-1:928065939415:stage-door-cdk-master'],
      detail: {
        pipeline: 'stage-door-cdk-master',
        'execution-id': '19b64e2c-005d-4f1b-b0bd-0eca9227799e',
        state: 'SUCCEEDED',
        version: 1,
      },
    });
    await handler.handler({
      Records: [
        {
          EventSource: 'aws:sns',
          EventVersion: '1.0',
          EventSubscriptionArn: 'arn:aws:sns:eu-west-1:{{{accountId}}}:ExampleTopic',
          Sns: {
            Type: 'Notification',
            MessageId: '95df01b4-ee98-5cb9-9903-4c221d41eb5e',
            TopicArn: 'arn:aws:sns:eu-west-1:123456789012:ExampleTopic',
            Subject: 'example subject',
            Message: notificationPayLoad,
            Timestamp: '1970-01-01T00:00:00.000Z',
            SignatureVersion: '1',
            Signature: 'EXAMPLE',
            SigningCertUrl: 'EXAMPLE',
            UnsubscribeUrl: 'EXAMPLE',
            MessageAttributes: {
              Test: {
                Type: 'String',
                Value: 'TestString',
              },
              TestBinary: {
                Type: 'Binary',
                Value: 'TestBinary',
              },
            },
          },
        },
      ],
    });
  });
});
