'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ServiceLineItem, ServiceType, ServiceConfig } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: 'workspace', label: 'Workspace Package' },
  { value: 'meeting_room', label: 'Meeting Room' },
  { value: 'conference_room', label: 'Conference Room' },
  { value: 'printing', label: 'Printing & Copying' },
  { value: 'custom', label: 'Custom Service' },
]

const DURATIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

interface ServiceLineItemsProps {
  onChange: (items: ServiceLineItem[], subtotal: number) => void
  initialItems?: ServiceLineItem[]
}

export function ServiceLineItems({ onChange, initialItems }: ServiceLineItemsProps) {
  const [lineItems, setLineItems] = useState<ServiceLineItem[]>(initialItems || [])
  const [configs, setConfigs] = useState<ServiceConfig[]>([])
  const [adding, setAdding] = useState(false)

  // Current item being added
  const [serviceType, setServiceType] = useState<ServiceType | ''>('')
  const [duration, setDuration] = useState('')
  const [packageName, setPackageName] = useState('')
  const [memberType, setMemberType] = useState('')
  const [hours, setHours] = useState('')
  const [pages, setPages] = useState('')
  const [customDesc, setCustomDesc] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [isMember, setIsMember] = useState(false)
  const [freeHoursAvailable, setFreeHoursAvailable] = useState(0)

  useEffect(() => {
    async function loadConfigs() {
      const supabase = createClient()
      const { data } = await supabase
        .from('service_config')
        .select('*')
        .eq('is_active', true)
      if (data) setConfigs(data as ServiceConfig[])
    }
    loadConfigs()
  }, [])

  const notifyParent = useCallback((items: ServiceLineItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
    onChange(items, subtotal)
  }, [onChange])

  useEffect(() => {
    notifyParent(lineItems)
  }, [lineItems, notifyParent])

  const getWorkspacePackages = (dur: string) => {
    return configs.filter(c => c.service_type === 'workspace' && c.duration === dur)
  }

  const getMeetingRoomConfig = () => {
    return configs.find(c => c.service_type === 'meeting_room')
  }

  const getConferenceConfig = (memType: string) => {
    return configs.find(c => c.service_type === 'conference_room' && c.member_type === memType)
  }

  const getPrintingConfig = (memType: string) => {
    return configs.find(c => c.service_type === 'printing' && c.member_type === memType)
  }

  const resetForm = () => {
    setServiceType('')
    setDuration('')
    setPackageName('')
    setMemberType('')
    setHours('')
    setPages('')
    setCustomDesc('')
    setCustomPrice('')
    setIsMember(false)
    setFreeHoursAvailable(0)
    setAdding(false)
  }

  const addWorkspaceItem = () => {
    const config = configs.find(
      c => c.service_type === 'workspace' && c.duration === duration && c.package_name === packageName
    )
    if (!config) return

    const item: ServiceLineItem = {
      service_type: 'workspace',
      description: `${packageName} - ${duration.charAt(0).toUpperCase() + duration.slice(1)}`,
      duration,
      package_name: packageName,
      unit_price: config.base_price,
      subtotal: config.base_price,
    }
    setLineItems(prev => [...prev, item])
    resetForm()
  }

  const addMeetingRoomItem = () => {
    const config = getMeetingRoomConfig()
    if (!config || !hours) return

    const numHours = Number(hours)
    let freeUsed = 0
    let extraHours = numHours
    let subtotal = 0

    if (isMember && freeHoursAvailable > 0) {
      freeUsed = Math.min(numHours, freeHoursAvailable)
      extraHours = numHours - freeUsed
    }

    subtotal = extraHours * config.extra_rate

    const item: ServiceLineItem = {
      service_type: 'meeting_room',
      description: `Meeting Room - ${numHours} hour${numHours > 1 ? 's' : ''}`,
      quantity: numHours,
      free_allowance: isMember ? freeHoursAvailable : 0,
      free_used: freeUsed,
      extra_units: extraHours,
      unit_price: config.extra_rate,
      subtotal,
    }
    setLineItems(prev => [...prev, item])
    resetForm()
  }

  const addConferenceRoomItem = () => {
    const config = getConferenceConfig(memberType)
    if (!config || !hours) return

    const numHours = Number(hours)
    const freeAllowance = config.free_allowance || 0
    const freeUsed = Math.min(numHours, freeAllowance)
    const extraHours = Math.max(0, numHours - freeAllowance)
    const subtotal = extraHours * config.extra_rate

    const item: ServiceLineItem = {
      service_type: 'conference_room',
      description: `Conference Room - ${memberType} (${numHours}h)`,
      member_type: memberType,
      quantity: numHours,
      free_allowance: freeAllowance,
      free_used: freeUsed,
      extra_units: extraHours,
      unit_price: config.extra_rate,
      subtotal,
    }
    setLineItems(prev => [...prev, item])
    resetForm()
  }

  const addPrintingItem = () => {
    const config = getPrintingConfig(memberType)
    if (!config || !pages) return

    const numPages = Number(pages)
    const freeAllowance = config.free_allowance || 0
    const freeUsed = Math.min(numPages, freeAllowance)
    const extraPages = Math.max(0, numPages - freeAllowance)
    const subtotal = extraPages * config.extra_rate

    const item: ServiceLineItem = {
      service_type: 'printing',
      description: `Printing - ${memberType} (${numPages} pages)`,
      member_type: memberType,
      quantity: numPages,
      free_allowance: freeAllowance,
      free_used: freeUsed,
      extra_units: extraPages,
      unit_price: config.extra_rate,
      subtotal,
    }
    setLineItems(prev => [...prev, item])
    resetForm()
  }

  const addCustomItem = () => {
    if (!customDesc.trim() || !customPrice) return

    const item: ServiceLineItem = {
      service_type: 'custom',
      description: customDesc.trim(),
      unit_price: Number(customPrice),
      subtotal: Number(customPrice),
    }
    setLineItems(prev => [...prev, item])
    resetForm()
  }

  const removeItem = (index: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== index))
  }

  const formatAmount = (amount: number) => {
    return `NLe ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0)

  return (
    <div className="space-y-4">
      {/* Existing line items */}
      {lineItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Service Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lineItems.map((item, idx) => (
              <div key={idx} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs shrink-0">
                      {SERVICE_TYPES.find(s => s.value === item.service_type)?.label}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium mt-1">{item.description}</p>
                  {(item.free_used !== undefined && item.free_used > 0) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Free: {item.free_used} | Extra: {item.extra_units} x {formatAmount(item.unit_price)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-sm">{formatAmount(item.subtotal)}</span>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removeItem(idx)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t">
              <span className="font-medium">Subtotal</span>
              <span className="font-bold">{formatAmount(subtotal)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add service form */}
      {adding ? (
        <Card className="border-dashed border-2">
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-2">
              <Label>Select Service Type</Label>
              <Select value={serviceType} onValueChange={(v) => { setServiceType(v as ServiceType); setDuration(''); setPackageName(''); setMemberType(''); setHours(''); setPages(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a service..." />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map(st => (
                    <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Workspace Package Steps */}
            {serviceType === 'workspace' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Step 1: Duration</Label>
                  <Select value={duration} onValueChange={(v) => { setDuration(v); setPackageName('') }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map(d => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {duration && (
                  <div className="space-y-2">
                    <Label>Step 2: Package Type</Label>
                    <Select value={packageName} onValueChange={setPackageName}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select package" />
                      </SelectTrigger>
                      <SelectContent>
                        {getWorkspacePackages(duration).map((p, idx) => (
                          <SelectItem key={p.id || `ws-${idx}`} value={p.package_name || `pkg-${idx}`}>
                            {p.package_name} - {formatAmount(p.base_price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {packageName && (
                  <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                    <span className="text-sm">Auto-filled price:</span>
                    <span className="font-bold">
                      {formatAmount(configs.find(c => c.service_type === 'workspace' && c.duration === duration && c.package_name === packageName)?.base_price || 0)}
                    </span>
                  </div>
                )}
                {packageName && (
                  <Button onClick={addWorkspaceItem} className="w-full">Add Workspace Package</Button>
                )}
              </div>
            )}

            {/* Meeting Room */}
            {serviceType === 'meeting_room' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="meeting-hours">Number of Hours</Label>
                  <Input
                    id="meeting-hours"
                    type="number"
                    min="1"
                    placeholder="Enter hours"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is-member"
                    checked={isMember}
                    onChange={(e) => setIsMember(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="is-member">Is a member (has free hours)?</Label>
                </div>
                {isMember && (
                  <div className="space-y-2">
                    <Label htmlFor="free-hours">Free Hours Available This Month</Label>
                    <Input
                      id="free-hours"
                      type="number"
                      min="0"
                      placeholder="Enter remaining free hours"
                      value={freeHoursAvailable}
                      onChange={(e) => setFreeHoursAvailable(Number(e.target.value))}
                    />
                  </div>
                )}
                {hours && Number(hours) > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Hours requested:</span>
                      <span>{hours}</span>
                    </div>
                    {isMember && freeHoursAvailable > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Free hours deducted:</span>
                        <span>-{Math.min(Number(hours), freeHoursAvailable)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Extra hours charged:</span>
                      <span>{Math.max(0, Number(hours) - (isMember ? freeHoursAvailable : 0))}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-1 mt-1">
                      <span>Total:</span>
                      <span>{formatAmount(Math.max(0, Number(hours) - (isMember ? freeHoursAvailable : 0)) * (getMeetingRoomConfig()?.extra_rate || 300))}</span>
                    </div>
                  </div>
                )}
                {hours && Number(hours) > 0 && (
                  <Button onClick={addMeetingRoomItem} className="w-full">Add Meeting Room</Button>
                )}
              </div>
            )}

            {/* Conference Room */}
            {serviceType === 'conference_room' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Choose Member Type</Label>
                  <Select value={memberType} onValueChange={setMemberType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select member type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hot Desk">Hot Desk (4 free hrs/mo)</SelectItem>
                      <SelectItem value="Office Booth">Office Booth (8 free hrs/mo)</SelectItem>
                      <SelectItem value="Private Office">Private Office (15 free hrs/mo)</SelectItem>
                      <SelectItem value="Non-Member">Non-Member (no free hours)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {memberType && (
                  <div className="space-y-2">
                    <Label htmlFor="conf-hours">Number of Hours</Label>
                    <Input
                      id="conf-hours"
                      type="number"
                      min="1"
                      placeholder="Enter hours"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                    />
                  </div>
                )}
                {memberType && hours && Number(hours) > 0 && (() => {
                  const config = getConferenceConfig(memberType)
                  const numHours = Number(hours)
                  const freeAllowance = config?.free_allowance || 0
                  const freeUsed = Math.min(numHours, freeAllowance)
                  const extraHours = Math.max(0, numHours - freeAllowance)
                  const total = extraHours * (config?.extra_rate || 300)
                  return (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Hours requested:</span>
                        <span>{numHours}</span>
                      </div>
                      {freeAllowance > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span>Free hours deducted:</span>
                          <span>-{freeUsed}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Extra hours charged @ {formatAmount(config?.extra_rate || 300)}/hr:</span>
                        <span>{extraHours}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-1 mt-1">
                        <span>Total:</span>
                        <span>{formatAmount(total)}</span>
                      </div>
                    </div>
                  )
                })()}
                {memberType && hours && Number(hours) > 0 && (
                  <Button onClick={addConferenceRoomItem} className="w-full">Add Conference Room</Button>
                )}
              </div>
            )}

            {/* Printing & Copying */}
            {serviceType === 'printing' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Choose Member Type</Label>
                  <Select value={memberType} onValueChange={setMemberType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select member type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Private Office">Private Office (60 free pages)</SelectItem>
                      <SelectItem value="Hot Desk">Hot Desk (20 free pages)</SelectItem>
                      <SelectItem value="Non-member">Non-member (no free pages)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {memberType && (
                  <div className="space-y-2">
                    <Label htmlFor="bw-pages">Number of B&W Pages</Label>
                    <Input
                      id="bw-pages"
                      type="number"
                      min="1"
                      placeholder="Enter number of pages"
                      value={pages}
                      onChange={(e) => setPages(e.target.value)}
                    />
                  </div>
                )}
                {memberType && pages && Number(pages) > 0 && (() => {
                  const config = getPrintingConfig(memberType)
                  const numPages = Number(pages)
                  const freeAllowance = config?.free_allowance || 0
                  const freeUsed = Math.min(numPages, freeAllowance)
                  const extraPages = Math.max(0, numPages - freeAllowance)
                  const total = extraPages * (config?.extra_rate || 2)
                  return (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Total pages:</span>
                        <span>{numPages}</span>
                      </div>
                      {freeAllowance > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span>Free pages deducted:</span>
                          <span>-{freeUsed}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Extra pages @ {formatAmount(config?.extra_rate || 2)}/page:</span>
                        <span>{extraPages}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-1 mt-1">
                        <span>Total:</span>
                        <span>{formatAmount(total)}</span>
                      </div>
                    </div>
                  )
                })()}
                {memberType && pages && Number(pages) > 0 && (
                  <Button onClick={addPrintingItem} className="w-full">Add Printing</Button>
                )}
              </div>
            )}

            {/* Custom Service */}
            {serviceType === 'custom' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="custom-desc">Service Description</Label>
                  <Input
                    id="custom-desc"
                    placeholder="Describe the service..."
                    value={customDesc}
                    onChange={(e) => setCustomDesc(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-price">Price (NLe)</Label>
                  <Input
                    id="custom-price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                  />
                </div>
                {customDesc && customPrice && Number(customPrice) > 0 && (
                  <Button onClick={addCustomItem} className="w-full">Add Custom Service</Button>
                )}
              </div>
            )}

            <Button variant="outline" onClick={resetForm} className="w-full">
              Cancel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          onClick={() => setAdding(true)}
          className="w-full border-dashed border-2 py-6"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Add Service Item
        </Button>
      )}
    </div>
  )
}
