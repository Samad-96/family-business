export type PropertyType = 'land' | 'flat' | 'shop' | 'building'
export type PropertyStatus = 'owned' | 'rented_out' | 'for_sale' | 'sold'

export interface Property {
  property_id: string
  label: string
  type: PropertyType
  city: string | null
  address: string | null
  size_sqm: number | null
  status: PropertyStatus
  purchase_date: string | null
  purchase_price_usd: number | null
  notes: string | null
  created_by: string | null
  created_at: string
  changed_by: string | null
  changed_at: string | null
}

export interface AcquisitionCost {
  cost_id: string
  property_id: string
  type: 'notary' | 'registration' | 'agent_fee' | 'renovation' | 'other'
  amount_usd: number
  amount_syp: number | null
  cost_date: string
  description: string | null
  created_by: string | null
  created_at: string
  changed_by: string | null
  changed_at: string | null
}

export interface MaintenanceCost {
  maintenance_id: string
  property_id: string
  category: 'repair' | 'cleaning' | 'tax' | 'utilities' | 'insurance' | 'other'
  amount_usd: number
  amount_syp: number | null
  cost_date: string
  description: string | null
  created_by: string | null
  created_at: string
  changed_by: string | null
  changed_at: string | null
}

export interface Lease {
  lease_id: string
  property_id: string
  tenant_name: string
  tenant_phone: string | null
  start_date: string
  end_date: string | null
  monthly_rent_usd: number
  monthly_rent_syp: number | null
  furnished: boolean
  furnishing_cost_usd: number | null
  status: 'active' | 'ended' | 'pending'
  notes: string | null
  created_by: string | null
  created_at: string
  changed_by: string | null
  changed_at: string | null
}

export interface RentPayment {
  payment_id: string
  lease_id: string
  due_date: string
  paid_date: string | null
  amount_usd: number
  amount_syp: number | null
  status: 'paid' | 'pending' | 'late' | 'partial'
  notes: string | null
  created_by: string | null
  created_at: string
  changed_by: string | null
  changed_at: string | null
}

export interface Sale {
  sale_id: string
  property_id: string
  sale_date: string
  sale_price_usd: number
  sale_price_syp: number | null
  notary_fee_usd: number
  agent_fee_usd: number
  buyer_name: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  changed_by: string | null
  changed_at: string | null
}
