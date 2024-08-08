import * as cdk from 'aws-cdk-lib';
import * as conn from 'aws-cdk-lib/aws-codeconnections';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export class CodeConnections extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const connectionName = 'GitHub';
    const connection = new conn.CfnConnection(this, 'GitHub', {
      connectionName: connectionName,
      providerType: 'GitHub',
      tags: [{ key: 'parent-stack', value: cdk.Stack.of(this).stackName }],
    });

    new ssm.StringParameter(this, 'GitHubArnSSM', {
      parameterName: '/pipeline-factory/default-github-connection',
      description: `ARN for ${connectionName} CodeConnection - the connection needs to be activated via console before being used for the first time`,
      stringValue: connection.attrConnectionArn,
    });
  }
}
