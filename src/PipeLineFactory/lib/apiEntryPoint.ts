import * as cdk from "@aws-cdk/core";
import * as apigateway from "@aws-cdk/aws-apigateway";
import BranchHandlers from "./branchHandlers";
import FactoryProperties from "./factoryProperties";
import { ApiKeySourceType } from "@aws-cdk/aws-apigateway";

export default class ApiEntryPoint extends cdk.Construct {
  public readonly buildProjectArn: string;
  constructor(
    scope: cdk.Construct,
    id: string,
    props: FactoryProperties,
    handlers: BranchHandlers
  ) {
    super(scope, id);

    const entryPointApi = new apigateway.RestApi(this, "APIGateway", {
      restApiName: props.projectName,
      apiKeySourceType: ApiKeySourceType.HEADER,
    });

    const creationLambda = new apigateway.LambdaIntegration(
      handlers.apiBranchCreated,
      {
        requestTemplates: { "application/json": '{ "statusCode": "200" }' },
      }
    );

    const branchCreation = entryPointApi.root.addResource("branch-created");
    branchCreation.addMethod("POST", creationLambda);

    const deletionLambda = new apigateway.LambdaIntegration(
      handlers.apiBranchDeleted,
      {
        requestTemplates: { "application/json": '{ "statusCode": "200" }' },
      }
    );

    const branchDeletion = entryPointApi.root.addResource("branch-deleted");
    branchDeletion.addMethod("POST", deletionLambda);

    const apiKey = new apigateway.ApiKey(this, `ApiGatewayKey`, {
      apiKeyName: `${props.projectName}-access-key`,
      description: `APIKey used to access PLF API`,
      enabled: true,
    });

    
  }
}
