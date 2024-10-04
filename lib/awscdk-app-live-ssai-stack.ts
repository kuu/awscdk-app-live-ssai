import { Aws, Stack, StackProps, CfnOutput, Fn } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LiveChannelFromMp4 } from 'awscdk-construct-live-channel-from-mp4-file';
import { ScteScheduler } from 'awscdk-construct-scte-scheduler';
import { MediaTailorWithCloudFront } from 'awscdk-mediatailor-cloudfront-construct';
import { FilePublisher } from 'awscdk-construct-file-publisher';
import { AdDecisionServer } from 'awscdk-construct-ad-decision-server';
// import { SessionRunner } from './SessionRunner';
// import { PlayerApp, Endpoint } from './PlayerApp';

/*
const baseTime = new Date();
const EVENT_START_DELAY_IN_MINUTES = 15;
const EVENT_DURATION_IN_MINUTES = 1440;
const eventStartTime = new Date(baseTime.getTime() + EVENT_START_DELAY_IN_MINUTES * 60 * 1000);
const eventEndTime = new Date(baseTime.getTime() + (EVENT_START_DELAY_IN_MINUTES + EVENT_DURATION_IN_MINUTES) * 60 * 1000);
const audienceGraph = [
  { pointInSeconds: 1 * 60, sessionVolume: 1 },
  { pointInSeconds: 120 * 60, sessionVolume: 1 },
];*/

export class AwscdkAppLiveSsaiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Make the files in the local folder publicly accessible
    const publicFolder = new FilePublisher(this, 'FilePublisher', {
      path: './upload',
    });

    // Build live channel
    const { eml, empv1: emp } = new LiveChannelFromMp4(this, 'LiveChannelFromMp4', {
      sourceUrl: `${publicFolder.url}/dog.mp4`,
      timecodeBurninPrefix: 'Ch1',
      autoStart: true,
      mediaPackageVersionSpec: 'V1_ONLY',
      startoverWindowSeconds: 1209600,
    });

    if (!emp) {
      return;
    }
    // Schedule a 60-sec ad break every 2 minutes
    new ScteScheduler(this, 'ScteScheduler1', {
      channelId: eml.channel.ref,
      scteDurationInSeconds: 60,
      intervalInMinutes: 2,
    });

    // Build Ad Decision Server (ADS)
    const ads = new AdDecisionServer(this, 'AdDecisionServer', {
      creatives: [
        {
          duration: 30,
          url: `${publicFolder.url}/30sec.mp4`,
          delivery: 'progressive',
          mimeType: 'video/mp4',
          width: 1280,
          height: 720,
        },
        {
          duration: 15,
          url: `${publicFolder.url}/15sec.mp4`,
          delivery: 'progressive',
          mimeType: 'video/mp4',
          width: 1280,
          height: 720,
        },
        {
          duration: 60,
          url: `${publicFolder.url}/60sec.mp4`,
          delivery: 'progressive',
          mimeType: 'video/mp4',
          width: 1280,
          height: 720,
        },
      ],
    });

    // Build MediaTailor with CloudFront
    const {emt, cf} = new MediaTailorWithCloudFront(this, 'MediaTailorWithCloudFront', {
      videoContentSourceUrl: emp?.endpoints.hls.attrUrl,
      adDecisionServerUrl: `${ads.url}?duration=[session.avail_duration_secs]`,
      slateAdUrl: `${publicFolder.url}/slate.mp4`,
      skipCloudFront: true,
    });

    const empArr = Fn.split('/', emp.endpoints.hls.attrUrl);
    const sessionInitializationUrl = `${emt.config.attrSessionInitializationEndpointPrefix}${Fn.select(5, empArr)}/${Fn.select(6, empArr)}`;

    // Create a session runner
    /*
    new SessionRunner(this, 'SessionRunner', {
      eventStartTime,
      eventEndTime,
      intervalInSeconds: 2,
      sessionRequirements: {
        growthPattern: 'LINEAR',
        graph: audienceGraph,
      },
      sessionInitializationUrl,
      hostName: '', // cf.distribution.distributionDomainName,
      concurrency: 1,
      emailAddr: 'miyazaqui@gmail.com',
    });
    */

    // Print MediaTialor Session Initialization cURL command
    const arr = Fn.split('/', emp.endpoints.hls.attrUrl);
    new CfnOutput(this, "MediaTailorSessionInitializationCommand", {
      value: `curl -X POST -H "Content-Type: application/json" -d '{ "logMode": "DEBUG"}' ${emt.config.attrSessionInitializationEndpointPrefix}${Fn.select(5, arr)}/${Fn.select(6, arr)}`,
      exportName: Aws.STACK_NAME + "MediaTailorSessionInitializationCommand",
      description: "MediaTailor Session Initialization Command",
    });

    if (!cf) {
      return;
    }

    new CfnOutput(this, "CloudFrontURL", {
      value: `https://${cf.distribution.distributionDomainName}`,
      exportName: Aws.STACK_NAME + "CloudFrontURL",
      description: "CloudFront URL",
    });

    new CfnOutput(this, "PrerollURL", {
      value: `${publicFolder.url}/30sec.mp4`,
      exportName: Aws.STACK_NAME + "PrerollURL",
      description: "Preroll URL",
    });

    // Build PlayerApp
    /*
    const app = new PlayerApp(this, 'PlayerApp', {
      endpoints: buildEndpoints(emp, emt, cf),
    });
    */

    // Print PlayerApp URL
    /*
    new CfnOutput(this, "PlayerAppUrl", {
      value: app.url,
      exportName: Aws.STACK_NAME + "PlayerAppUrl",
      description: "PlayerApp URL",
    });
    */
  }
}

/*
function buildEndpoints(emp: MediaPackageV1, emt: MediaTailor, cf: CloudFront): Endpoint[] {
  const hlsId = Fn.select(5, Fn.split('/', emp.endpoints.hls.attrUrl));
  const hlsFile = Fn.select(6, Fn.split('/', emp.endpoints.hls.attrUrl));
  const dashId = Fn.select(5, Fn.split('/', emp.endpoints.dash.attrUrl)); 
  const dashFile = Fn.select(6, Fn.split('/', emp.endpoints.dash.attrUrl));
  const hls = Fn.split('/', emt.config.attrHlsConfigurationManifestEndpointPrefix);
  const hlsPath = `${Fn.select(3, hls)}/${Fn.select(4, hls)}/${Fn.select(5, hls)}/${Fn.select(6, hls)}/${hlsId}/${hlsFile}`;
  const dash = Fn.split('/', emt.config.attrDashConfigurationManifestEndpointPrefix);
  const dashPath = `${Fn.select(3, dash)}/${Fn.select(4, dash)}/${Fn.select(5, dash)}/${Fn.select(6, dash)}/${dashId}/${dashFile}`;
  return [
    {
      id: hlsId,
      type: 'hls',
      name: 'V1 HLS endpoint',
      url: `https://${cf.distribution.distributionDomainName}/${hlsPath}?aws.logMode=DEBUG`,
    },
    {
      id: dashId,
      type: 'dash',
      name: 'V1 DASH endpoint',
      url: `https://${cf.distribution.distributionDomainName}/${dashPath}?aws.logMode=DEBUG`,
    },
  ];
}
*/