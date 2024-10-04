import * as fs from 'fs';
import * as path from 'path';
import { Duration, aws_logs as logs } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { SessionRequirements } from './SessionRunner';

export interface FetchLambdaProps {
  readonly sessionInitializationUrl: string; // Sessuib Initialization URL
  readonly hostName: string; // Host name of the MediaTailor endpoint
  readonly indexOfRenditions: number; // N-th rendition to fetch
  readonly sessionRequirements: SessionRequirements;
  readonly eventStartTime: Date; // Start time of the event
  readonly topicArn: string; // SNS Topic ARN
}

export class FetchLambda extends Construct {
  public readonly func: NodejsFunction;

  constructor(scope: Construct, id: string, props: FetchLambdaProps) {
    super(scope, id);

    const { sessionInitializationUrl, hostName, indexOfRenditions, sessionRequirements, eventStartTime, topicArn } = props;

    const TS_ENTRY = path.resolve(__dirname, 'func', 'index.ts');
    const JS_ENTRY = path.resolve(__dirname, 'func', 'index.js');

    this.func = new NodejsFunction(scope, `NodejsFunction${id}`, {
      runtime: Runtime.NODEJS_18_X,
      entry: fs.existsSync(TS_ENTRY) ? TS_ENTRY : JS_ENTRY,
      handler: 'handler',
      timeout: Duration.seconds(30),
      environment: {
        NODE_ENV: process.env.NODE_ENV as string,
        REGION: process.env.CDK_DEFAULT_REGION as string,
        SESSION_INITIALIZATION_URL: sessionInitializationUrl,
        HOST_NAME: hostName,
        INDEX_OF_RENDITIONS: indexOfRenditions.toString(10),
        SESSION_REQUIREMENTS: JSON.stringify(sessionRequirements),
        EVENT_START_TIME: eventStartTime.toISOString(),
        SNS_TOPIC_ARN: topicArn,
      },
      logRetention: logs.RetentionDays.TWO_WEEKS,
    });
    this.func.addToRolePolicy(
      PolicyStatement.fromJson({
        Effect: 'Allow',
        Action: 'sns:Publish',
        Resource: '*',
      }),
    );
  }
}