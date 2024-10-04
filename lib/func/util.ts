export interface SessionRequirement {
  pointInSeconds: number;
  sessionVolume: number;
}

export function getDesiredSessionVolume(eventStartTime: Date, requirements: SessionRequirement[]): number {
  const nowInSeconds = Math.max(0, Math.round((Date.now() - eventStartTime.getTime()) / 1000));
  let start: SessionRequirement = { pointInSeconds: 0, sessionVolume: 0 };
  let end: SessionRequirement = { pointInSeconds: nowInSeconds, sessionVolume: 0 };
  for (const [i, { pointInSeconds, sessionVolume }] of requirements.entries()) {
    // console.log(`nowInSeconds: ${nowInSeconds}, pointInSeconds: ${pointInSeconds}, sessionVolume: ${sessionVolume}`);
    if (nowInSeconds === pointInSeconds) {
      return sessionVolume;
    }
    if (nowInSeconds < pointInSeconds) {
      end = { pointInSeconds, sessionVolume };
      break;
    }
    if (i === requirements.length - 1) {
      return sessionVolume;
    }
    start = { pointInSeconds, sessionVolume };
  }
  return start.sessionVolume + Math.round(
    (end.sessionVolume - start.sessionVolume)
    * (nowInSeconds - start.pointInSeconds)
    / (end.pointInSeconds - start.pointInSeconds),
  );
}
