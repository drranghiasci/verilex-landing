export type FirmPlan = 'free' | 'pro' | 'enterprise';

export const PLAN_LIMITS: Record<FirmPlan, { maxCases: number; maxMembers: number; maxDocuments: number } | null> = {
  free: {
    maxCases: 25,
    maxMembers: 3,
    maxDocuments: 200,
  },
  pro: null,
  enterprise: null,
};

export function isUnlimited(plan: FirmPlan) {
  return PLAN_LIMITS[plan] === null;
}

export function canCreateCase(params: { plan: FirmPlan; currentCaseCount: number }) {
  if (isUnlimited(params.plan)) return { ok: true };
  if (params.currentCaseCount >= PLAN_LIMITS[params.plan]!.maxCases) {
    return { ok: false, reason: `Case limit reached for Free plan (${PLAN_LIMITS[params.plan]!.maxCases}).` };
  }
  return { ok: true };
}

export function canInviteMember(params: { plan: FirmPlan; currentMemberCount: number }) {
  if (isUnlimited(params.plan)) return { ok: true };
  if (params.currentMemberCount >= PLAN_LIMITS[params.plan]!.maxMembers) {
    return { ok: false, reason: `Member limit reached for Free plan (${PLAN_LIMITS[params.plan]!.maxMembers}).` };
  }
  return { ok: true };
}

export function canUploadDocument(params: { plan: FirmPlan; currentDocumentCount: number }) {
  if (isUnlimited(params.plan)) return { ok: true };
  if (params.currentDocumentCount >= PLAN_LIMITS[params.plan]!.maxDocuments) {
    return { ok: false, reason: `Document limit reached for Free plan (${PLAN_LIMITS[params.plan]!.maxDocuments}).` };
  }
  return { ok: true };
}
