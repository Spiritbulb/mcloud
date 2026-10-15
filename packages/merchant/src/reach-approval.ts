// Who may sell on Reach. A store owner asks to be listed; the Reach admin decides. Pure so the
// dashboard (owner), the mobile admin API and the marketplace query all agree.

export type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended'

export interface VendorState {
  approval_status: ApprovalStatus
  listed: boolean
  active: boolean
  area_id: string | null
  /** Hand-made vendors that predate stores and areas (no store). They sell everywhere until placed. */
  legacy?: boolean
}

/** Whether buyers may see this vendor's products at all (the area match comes on top). */
export function isSellable(v: VendorState): boolean {
  return v.active && v.listed && v.approval_status === 'approved' && (v.area_id !== null || v.legacy === true)
}

/** What the owner's "List my store" does. A listing request needs a home area. */
export function ownerRequestListing(
  v: Pick<VendorState, 'approval_status' | 'area_id'>,
): { ok: true; status: ApprovalStatus } | { ok: false; error: string } {
  if (!v.area_id) return { ok: false, error: 'Choose the area your store delivers from first.' }
  switch (v.approval_status) {
    case 'draft':
    case 'rejected':
      return { ok: true, status: 'pending' }
    case 'pending':
    case 'approved':
      return { ok: true, status: v.approval_status }
    case 'suspended':
      return { ok: false, error: 'Reach has paused your store. Contact Reach support to be reinstated.' }
  }
}

export type AdminDecision = 'approve' | 'reject' | 'suspend' | 'reinstate'

/** An admin's move. Returns the next status, or why it is not allowed. */
export function adminDecide(
  v: Pick<VendorState, 'approval_status' | 'area_id'>,
  decision: AdminDecision,
  note?: string | null,
): { ok: true; status: ApprovalStatus } | { ok: false; error: string } {
  const has = (...s: ApprovalStatus[]) => s.includes(v.approval_status)
  switch (decision) {
    case 'approve':
      if (!has('pending', 'rejected')) return { ok: false, error: 'Only a pending or rejected store can be approved.' }
      if (!v.area_id) return { ok: false, error: 'Set the store’s delivery area before approving.' }
      return { ok: true, status: 'approved' }
    case 'reject':
      if (!has('pending')) return { ok: false, error: 'Only a pending request can be rejected.' }
      if (!note || note.trim().length < 3) return { ok: false, error: 'Say why, so the owner can fix it.' }
      return { ok: true, status: 'rejected' }
    case 'suspend':
      if (!has('approved')) return { ok: false, error: 'Only an approved store can be suspended.' }
      if (!note || note.trim().length < 3) return { ok: false, error: 'Say why the store is being suspended.' }
      return { ok: true, status: 'suspended' }
    case 'reinstate':
      if (!has('suspended')) return { ok: false, error: 'Only a suspended store can be reinstated.' }
      return { ok: true, status: 'approved' }
  }
}

export function approvalLabel(s: ApprovalStatus): string {
  return { draft: 'Not requested', pending: 'Waiting for review', approved: 'Approved', rejected: 'Changes needed', suspended: 'Paused by Reach' }[s]
}
