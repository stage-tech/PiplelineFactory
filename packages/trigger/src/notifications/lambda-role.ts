import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export default class NotificationsLambdaRole extends Construct {
  lambdaRole: iam.Role;
  constructor(scope: Construct, id: string) {
    super(scope, id);
    // role to run the lambda function
    const lambdaRole = new iam.Role(this, 'Role_LambdaFunction', {
      roleName: `${cdk.Stack.of(this).stackName}-Notifications-Lambda`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));

    this.lambdaRole = lambdaRole;
  }
}
