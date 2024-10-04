import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction, SfnStateMachine } from 'aws-cdk-lib/aws-events-targets';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';

export interface EventBridgeScheduleProps {
  readonly target: NodejsFunction | StateMachine;
  readonly schedule: Schedule;
}

export class EventBridgeSchedule extends Construct {
  public rule: Rule;

  constructor(scope: Construct, id: string, props: EventBridgeScheduleProps) {
    super(scope, id);

    const { target, schedule } = props;

    this.rule = new Rule(this, 'InvokeFunctionEveryXMinutes', {
      schedule,
    });

    if (isFunction(target)) {
      this.rule.addTarget(
        new LambdaFunction(target),
      );
    } else {
      this.rule.addTarget(
        new SfnStateMachine(target),
      );
    }
  }
}

function isFunction(target: any): target is NodejsFunction {
  return target instanceof NodejsFunction;
}
