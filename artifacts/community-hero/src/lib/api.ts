const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = `${BASE}/api`;

function getToken(): string | null {
  return localStorage.getItem("ch_token");
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

// ─── Auth ──────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "admin" | "officer" | "citizen";
  workerId?: number;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export const authApi = {
  login: (email: string, password: string) => api.post<LoginResponse>("/auth/login", { email, password }),
  register: (name: string, email: string, password: string, phone?: string) =>
    api.post<LoginResponse>("/auth/register", { name, email, password, phone }),
  me: () => api.get<AuthUser>("/auth/me"),
};

// ─── Complaints ────────────────────────────────────────────────────────────

export interface Complaint {
  id: number;
  ticketId: string;
  publicAssetId?: number | null;
  citizenName?: string | null;
  citizenPhone?: string | null;
  citizenEmail?: string | null;
  isAnonymous: boolean;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  ward?: string | null;
  status: string;
  priority?: string | null;
  priorityScore?: number | null;
  departmentId?: number | null;
  assignedWorkerId?: number | null;
  estimatedResolutionHours?: number | null;
  resolvedAt?: string | null;
  // Issue 1: geo-tagged completion evidence fields (nullable — absent on older complaints)
  completionPhotoPath?: string | null;
  completionLatitude?: number | null;
  completionLongitude?: number | null;
  completionTimestamp?: string | null;
  adminRejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintList { items: Complaint[]; total: number; }

export const complaintsApi = {
  list: (params?: Record<string, string | number>) => {
    const qs = params ? "?" + new URLSearchParams(Object.entries(params).map(([k,v]) => [k, String(v)])).toString() : "";
    return api.get<ComplaintList>(`/complaints${qs}`);
  },
  submit: (body: Record<string, unknown>) => api.post<Complaint>("/complaints", body),
  get: (id: number) => api.get<Complaint>(`/complaints/${id}`),
  getByTicket: (ticketId: string) => api.get<Complaint>(`/complaints/ticket/${ticketId}`),
  analyze: (id: number) => api.post(`/complaints/${id}/analyze`),
  assign: (id: number) => api.post(`/complaints/${id}/assign`),
  verify: (id: number, body: unknown) => api.post(`/complaints/${id}/verify`, body),
  feedback: (id: number, body: unknown) => api.post(`/complaints/${id}/citizen-feedback`, body),
  // Issue 1: admin approves or rejects officer's completion evidence
  adminReview: (id: number, body: { approved: boolean; reason?: string }) =>
    api.post<{ success: boolean; status: string }>(`/complaints/${id}/admin-review`, body),
};

// ─── Analytics ────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  totalComplaints: number;
  resolvedComplaints: number;
  resolutionRate: number;
  avgResolutionHours: number;
  activeWorkers: number;
  totalDepartments: number;
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
}

export const analyticsApi = {
  summary: () => api.get<AnalyticsSummary>("/analytics/summary"),
  heatmap: () => api.get<{ latitude: number; longitude: number; weight: number }[]>("/analytics/heatmap"),
};

// ─── Workers ─────────────────────────────────────────────────────────────

export interface Worker {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  departmentId: number;
  status: string;
  skills: string[];
  currentLatitude?: number | null;
  currentLongitude?: number | null;
  activeComplaintCount: number;
  totalResolved: number;
  avgRating?: number | null;
  isActive: boolean;
}

export const workersApi = {
  list: (params?: Record<string, string | number>) => {
    const qs = params ? "?" + new URLSearchParams(Object.entries(params).map(([k,v]) => [k, String(v)])).toString() : "";
    return api.get<Worker[]>(`/workers${qs}`);
  },
  create: (body: unknown) => api.post<Worker>("/workers", body),
  updateLocation: (id: number, body: unknown) => api.patch(`/workers/${id}/location`, body),
};

// ─── Departments ──────────────────────────────────────────────────────────

export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  headName?: string | null;
  headPhone?: string | null;
  isActive: boolean;
  issueTypes: string[];
  createdAt: string;
}

export const departmentsApi = {
  list: () => api.get<Department[]>("/departments"),
  create: (body: unknown) => api.post<Department>("/departments", body),
};

// ─── Assignments ──────────────────────────────────────────────────────────

export interface Assignment {
  id: number;
  complaintId: number;
  workerId: number;
  status: string;
  distanceKm?: number | null;
  estimatedArrivalMinutes?: number | null;
  acceptedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

export interface AssignmentWithComplaint {
  assignment: Assignment;
  complaint: Complaint;
}

export const assignmentsApi = {
  my: () => api.get<AssignmentWithComplaint[]>("/assignments/my"),
  accept: (id: number) => api.patch(`/assignments/${id}/accept`),
  updateStatus: (id: number, status: string, notes?: string) => api.patch(`/assignments/${id}/status`, { status, notes }),
};

// ─── Notifications ────────────────────────────────────────────────────────

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  complaintId?: number | null;
  isRead: boolean;
  createdAt: string;
}

export const notificationsApi = {
  list: () => api.get<Notification[]>("/notifications"),
  markRead: (id: number) => api.patch(`/notifications/${id}/read`),
};

// ─── Public Assets ────────────────────────────────────────────────────────

export interface PublicAsset {
  id: number;
  assetCode: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  ward?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  qrSignature?: string | null;
  healthScore: number;
  installedAt?: string | null;
  lastMaintainedAt?: string | null;
  totalComplaints: number;
  totalMaintenanceVisits: number;
  avgCitizenRating?: number | null;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  recentComplaints?: Complaint[];
}

export interface AssetList { items: PublicAsset[]; total: number; }

export interface AssetStats {
  totalAssets: number;
  activeAssets: number;
  avgHealthScore: number;
  criticalAssets: number;
  byType: { type: string; count: number; avgHealth: number }[];
  lowestHealthAssets: PublicAsset[];
}

export const assetsApi = {
  list: (params?: Record<string, string | number>) => {
    const qs = params ? "?" + new URLSearchParams(Object.entries(params).map(([k,v]) => [k, String(v)])).toString() : "";
    return api.get<AssetList>(`/assets${qs}`);
  },
  get: (id: number) => api.get<PublicAsset>(`/assets/${id}`),
  getByCode: (assetCode: string) => api.get<PublicAsset>(`/assets/qr/${assetCode}`),
  create: (body: unknown) => api.post<PublicAsset>("/assets", body),
  update: (id: number, body: unknown) => api.patch<PublicAsset>(`/assets/${id}`, body),
  complaints: (id: number, params?: Record<string, string | number>) => {
    const qs = params ? "?" + new URLSearchParams(Object.entries(params).map(([k,v]) => [k, String(v)])).toString() : "";
    return api.get<ComplaintList>(`/assets/${id}/complaints${qs}`);
  },
  verifyOfficer: (id: number, latitude: number, longitude: number) =>
    api.post<{ verified: boolean; distanceMeters: number; message: string }>(`/assets/${id}/verify-officer`, { latitude, longitude }),
  stats: () => api.get<AssetStats>("/assets/summary/stats"),
};

// ─── Users ────────────────────────────────────────────────────────────────

export const usersApi = {
  list: () => api.get<{ id: number; name: string; email: string; role: string; isActive: boolean }[]>("/users"),
  createOfficer: (body: unknown) => api.post("/users/officers", body),
  setStatus: (id: number, isActive: boolean) => api.patch(`/users/${id}/status`, { isActive }),
};
