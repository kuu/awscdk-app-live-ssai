import * as ecs from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { Distribution, OriginProtocolPolicy, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { LoadBalancerV2Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export interface Endpoint {
  readonly id: string;
  readonly type: 'hls' | 'dash';
  readonly name: string;
  readonly url: string | (() => Promise<string>);
}

export interface PlayerAppProps {
  readonly endpoints: Endpoint[]; // List of endpoints
}

export class PlayerApp extends Construct {
  public readonly url: string; // URL of the app

  constructor(scope: Construct, id: string, {
    endpoints,
  }: PlayerAppProps) {
    super(scope, id);

    // Create a load balancer + ECS from the Docker image
    const alb = new ApplicationLoadBalancedFargateService(this, 'PlayerApp', {
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry('kuuu/nextjs-video-playback-app'),
        environment: {
          NEXT_PUBLIC_ENDPOINT_LIST: JSON.stringify(endpoints),
        },
      },
      publicLoadBalancer: true,
    });

    // Create a CloudFront distribution
    const distribution = new Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new LoadBalancerV2Origin(alb.loadBalancer, {
          protocolPolicy: OriginProtocolPolicy.HTTP_ONLY,
        }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    this.url = `https:${distribution.distributionDomainName}`;
  }
}