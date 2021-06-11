import dotenv from 'dotenv';

import { PipelineNotificationsHandler } from '../../src/notifications/pipeline-notifications-handler';
import AuthHelper from '../auth-helper';

dotenv.config();
const OLD_ENV = process.env;
const queueUrl = 'https://sqs.eu-west-1.amazonaws.com/928065939415/repository_discovery_jobs';
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

xdescribe('notification lambda Harness', () => {
  it('notification handler lambda', async () => {
    const handler = new PipelineNotificationsHandler('stage-tech');
    const notificationPayLoad = JSON.stringify({
      version: '0',
      id: '86577b36-74ff-149c-4de1-08920c3d9a21',
      'detail-type': 'CodePipeline Pipeline Execution State Change',
      source: 'aws.codepipeline',
      account: '928065939415',
      time: '2021-05-31T07:06:17Z',
      region: 'eu-west-1',
      resources: ['arn:aws:codepipeline:eu-west-1:928065939415:stage-door-datasync-execution-lambda-master'],
      detail: {
        pipeline: 'stage-door-events-old-master',
        'execution-id': '71d704eb-cb70-4b2a-98a2-2f80b97f6eaa',
        state: 'FAILED',
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
