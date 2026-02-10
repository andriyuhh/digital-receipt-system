'use client'

import type { AuditLog } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AuditLogViewerProps {
  logs: AuditLog[]
}

export function AuditLogViewer({ logs }: AuditLogViewerProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATED':
        return 'bg-green-100 text-green-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      case 'REFUNDED':
        return 'bg-amber-100 text-amber-800'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  if (logs.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        No audit logs found
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg"
        >
          <div className="flex-shrink-0">
            <span className={cn(
              'inline-block px-2 py-1 rounded text-xs font-medium',
              getActionColor(log.action)
            )}>
              {log.action}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{log.performed_by_name}</span>
              <span className="text-muted-foreground">({log.performed_by_role})</span>
            </div>
            {log.reason && (
              <p className="text-sm text-muted-foreground mt-1">
                Reason: {log.reason}
              </p>
            )}
            {log.old_status && log.new_status && (
              <p className="text-xs text-muted-foreground mt-1">
                Status changed: {log.old_status} → {log.new_status}
              </p>
            )}
          </div>
          <div className="flex-shrink-0 text-xs text-muted-foreground">
            {formatDate(log.created_at)}
          </div>
        </div>
      ))}
    </div>
  )
}
