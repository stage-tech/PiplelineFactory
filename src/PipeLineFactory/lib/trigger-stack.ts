import * as cdk from "@aws-cdk/core";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";
import FactoryProperties from "./factoryProperties";
import Factory from "./factory";
import Notifications from "./notifications/notifications";
import Api from "./api";
import DefaultBuildAsRole from "./default-build-as-role";
import DefaultBuckets from "./default-buckets";
import * as iam from "@aws-cdk/aws-iam";
import { Monitor } from "./monitor/monitor";

export class TriggerStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: FactoryProperties) {
    super(scope, id, props);

    cdk.Tags.of(this).add("service", "pipeline-factory");

    new secretsmanager.Secret(this, "defaultGitHubSecret", {
      secretName: `/${this.stackName.toLowerCase()}/default-github-token`,
    });

    const buildAsRole = new DefaultBuildAsRole(this, "DefaultBuildAdAsRole").role;

    new DefaultBuckets(this, "defaultBuckets");

    const factory = new Factory(this, "factoryBuilder", props);

    new Api(this, "Api", {
      PipelineFactoryBuildProjectName: factory.buildProjectName,
      apiDomainCertificateArn: props.apiDomainCertificateArn,
      apiDomainName: props.apiDomainName,
      triggerCodeS3Bucket: props.triggerCodeS3Bucket,
      triggerCodeS3Key: props.triggerCodeS3Key,
    });

    new Notifications(this, "PipelineNotifications", {
      triggerCodeS3Bucket: props.triggerCodeS3Bucket,
      triggerCodeS3Key: props.triggerCodeS3Key,
    });
  
 
    const monitor = new Monitor(this , "Monitor", {
      buildAsRoleArn : buildAsRole.roleArn,
      defaultBuildArtifactsBucketName : props.triggerCodeS3Bucket,
      
    })
  }
}
