'use client'

// The two "who can join" switches shared by Create and Edit session.
// Invite only makes approval redundant (the link IS the approval), so it greys it out.

interface JoinRulesProps {
  requiresApproval: boolean
  inviteOnly: boolean
  onRequiresApprovalChange: (v: boolean) => void
  onInviteOnlyChange: (v: boolean) => void
}

export default function JoinRules({ requiresApproval, inviteOnly, onRequiresApprovalChange, onInviteOnlyChange }: JoinRulesProps) {
  return (
    <div className="space-y-2 rounded-lg border border-gray-200 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Who can join</p>

      <label className={`flex items-start gap-2 ${inviteOnly ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
        <input
          type="checkbox"
          checked={requiresApproval && !inviteOnly}
          disabled={inviteOnly}
          onChange={(e) => onRequiresApprovalChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
        />
        <span className="text-sm text-gray-700">
          <span className="font-medium">Requires approval</span>
          <span className="block text-xs text-gray-500">Players request a spot; you approve or decline.</span>
        </span>
      </label>

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={inviteOnly}
          onChange={(e) => onInviteOnlyChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
        />
        <span className="text-sm text-gray-700">
          <span className="font-medium">Invite only</span>
          <span className="block text-xs text-gray-500">Only people who open your invite link can join.</span>
        </span>
      </label>
    </div>
  )
}
