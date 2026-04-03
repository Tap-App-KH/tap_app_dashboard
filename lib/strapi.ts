const STRAPI_URL = "http://localhost:1337"

export interface StrapiResponse<T> {
  data: T
  meta: {
    pagination?: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

export interface StrapiError {
  data: null
  error: {
    status: number
    name: string
    message: string
  }
}

export interface RequesterDetails {
  fullname: string
  phone: string
  phoneCode?: { flag: string; label: string; value: string }
  wishes: string
  sex?: "male" | "female"
  nationality?: "cambodian" | "non-cambodian"
  age?: string
  email?: string
  whatsapp?: string
  telegram?: string
  hasPet?: boolean
  needsBabySeat?: boolean
}

export interface LabelValue {
  label: string
  value: string
}

export interface PickupDropoffDetails {
  pickup: string
  dropoff: string
  pickupTime: string | LabelValue | null
  pickupDate: string | LabelValue | null
}

/** Safely extract a display string from a plain string or {label,value} object */
export function resolveField(
  field: string | LabelValue | null | undefined
): string {
  if (!field) return "—"
  if (typeof field === "string") return field || "—"
  return field.value || field.label || "—"
}

export interface TransferDetails {
  price?: number | null
  costPrice?: number | null
  type?: "private" | "shared" | null
}

export interface RequestAttributes {
  ref_id: string | null
  accepted: boolean | null
  cancelled: boolean | null
  paid: boolean | null
  requester_details: RequesterDetails | null
  pickup_dropoff_details: PickupDropoffDetails | null
  transfer_details: TransferDetails | null
  date: string | null
  temp_user_id: string | null
  createdAt: string
  updatedAt: string
}

export interface Request {
  id: number
  attributes: RequestAttributes
}

export interface AuthResponse {
  jwt: string
  user: {
    id: number
    username: string
    email: string
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err: StrapiError = await res.json()
    throw new Error(err.error?.message ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function strapiLogin(
  identifier: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch(`${STRAPI_URL}/api/auth/local`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  })
  return handleResponse<AuthResponse>(res)
}

export async function strapiGet<T>(path: string, jwt?: string): Promise<T> {
  const res = await fetch(`${STRAPI_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
  })
  return handleResponse<T>(res)
}

export async function strapiPost<T>(
  path: string,
  body: unknown,
  jwt?: string
): Promise<T> {
  const res = await fetch(`${STRAPI_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify(body),
  })
  return handleResponse<T>(res)
}

export async function strapiPut<T>(
  path: string,
  body: unknown,
  jwt: string
): Promise<T> {
  const res = await fetch(`${STRAPI_URL}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(body),
  })
  return handleResponse<T>(res)
}
