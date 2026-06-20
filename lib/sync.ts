import type { TrackingStatus } from "./tracker";
import { saveTracking, loadTracking } from "./tracker";
import type { InterviewStatus, InterviewRound } from "./interviews";
import { loadInterviews, updateInterview } from "./interviews";

export function trackingToInterviewStatus(ts: TrackingStatus): InterviewStatus | null {
  switch (ts) {
    case "interview":
    case "hr":
    case "written":
      return "进行中";
    case "offer":
      return "已拿offer";
    case "rejected":
      return "已拒";
    case "withdrawn":
      return "已放弃";
    case "applied":
      return "已投递";
    default:
      return null;
  }
}

export function interviewToTrackingStatus(is: InterviewStatus, rounds?: InterviewRound[]): TrackingStatus {
  switch (is) {
    case "进行中": {
      if (rounds && rounds.length > 0) {
        const lastRound = rounds[rounds.length - 1].round;
        if (lastRound === "笔试") return "written";
        if (lastRound === "HR面") return "hr";
      }
      return "interview";
    }
    case "已拿offer":
      return "offer";
    case "已拒":
      return "rejected";
    case "已放弃":
      return "withdrawn";
    case "已投递":
      return "applied";
  }
}

export async function syncTrackingToInterview(jobId: string, trackingStatus: TrackingStatus) {
  const interviewStatus = trackingToInterviewStatus(trackingStatus);
  if (!interviewStatus) return;

  const interviews = await loadInterviews();
  const linked = interviews.find((r) => r.relatedJobId === jobId);
  if (linked && linked.status !== interviewStatus) {
    await updateInterview(linked.id, { status: interviewStatus });
  }
}

export async function syncInterviewToTracking(relatedJobId: string | undefined, interviewStatus: InterviewStatus, rounds?: InterviewRound[]) {
  if (!relatedJobId) return;

  const trackingStatus = interviewToTrackingStatus(interviewStatus, rounds);
  const tracking = await loadTracking();
  const entry = tracking[relatedJobId];
  if (entry && entry.status !== trackingStatus) {
    await saveTracking(relatedJobId, trackingStatus, entry);
  }
}
