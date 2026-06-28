import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { complaintsApi, analyticsApi, workersApi, departmentsApi, usersApi, type Complaint, type AnalyticsSummary, type Worker, type Department } from "@/lib/api";
import AssetsManagement from "@/pages/AssetsManagement";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Shield, LogOut, AlertTriangle, CheckCircle, Clock, Users, Building2, BarChart3, FileText, RefreshCw, Search, Zap, TrendingUp, MapPin, QrCode, ThumbsUp, ThumbsDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-gray-500",
  ai_processing: "bg-blue-500",
  assigned: "bg-yellow-500",
  dispatched: "bg-orange-500",
  in_progress: "bg-purple-500",
  // Issue 1: officer submitted evidence — admin must review
  pending_admin_review: "bg-orange-400",
  resolved: "bg-green-500",
  failed_verification: "bg-red-500",
  reopened: "bg-red-400",
  closed: "bg-gray-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-green-600",
  medium: "bg-yellow-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
  emergency: "bg-red-700",
};

const PIE_COLORS = ["#3b82f6", "#f59e0b", "#8b5cf6", "#10b981", "#ef4444", "#6b7280"];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [totalComplaints, setTotalComplaints] = useState(0);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Issue 1: Admin review state — complaints awaiting admin approval
  const [activeTab, setActiveTab] = useState("dashboard");
  const [pendingReviews, setPendingReviews] = useState<Complaint[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewingComplaint, setReviewingComplaint] = useState<Complaint | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 50 };
      if (filterStatus !== "all") params.status = filterStatus;
      if (filterPriority !== "all") params.priority = filterPriority;

      const [summaryData, complaintsData, workersData, deptsData] = await Promise.all([
        analyticsApi.summary(),
        complaintsApi.list(params),
        workersApi.list(),
        departmentsApi.list(),
      ]);
      setSummary(summaryData);
      setComplaints(complaintsData.items);
      setTotalComplaints(complaintsData.total);
      setWorkers(workersData);
      setDepartments(deptsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Issue 1: Fetch complaints currently pending admin review
  const fetchPendingReviews = async () => {
    setReviewLoading(true);
    try {
      const data = await complaintsApi.list({ status: "pending_admin_review", limit: 50 });
      setPendingReviews(data.items);
    } catch (e) {
      console.error(e);
    } finally {
      setReviewLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterStatus, filterPriority]);

  if (!user || user.role !== "admin") { setLocation("/login"); return null; }

  // Issue 1: When switching to Reviews tab, fetch fresh pending reviews
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "reviews") fetchPendingReviews();
  };

  const filteredComplaints = complaints.filter(c =>
    !searchTerm || c.ticketId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDeptName = (id?: number | null) => departments.find(d => d.id === id)?.name ?? "—";
  const getWorkerName = (id?: number | null) => workers.find(w => w.id === id)?.name ?? "—";

  // Issue 1: Admin approves officer's completion evidence → complaint becomes "resolved"
  const handleAdminApprove = async (complaint: Complaint) => {
    setReviewSubmitting(true);
    try {
      await complaintsApi.adminReview(complaint.id, { approved: true });
      toast.success(`${complaint.ticketId} approved — marked as Resolved.`);
      fetchPendingReviews();
      fetchData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Issue 1: Admin rejects → complaint returns to officer with reason
  const handleAdminReject = async () => {
    if (!reviewingComplaint || !rejectionReason.trim()) return;
    setReviewSubmitting(true);
    try {
      await complaintsApi.adminReview(reviewingComplaint.id, { approved: false, reason: rejectionReason });
      toast.info(`${reviewingComplaint.ticketId} rejected — returned to officer.`);
      setReviewDialogOpen(false);
      setReviewingComplaint(null);
      setRejectionReason("");
      fetchPendingReviews();
      fetchData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to reject");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const statCards = summary ? [
    { label: "Total Complaints", value: summary.totalComplaints, icon: FileText, color: "text-blue-400" },
    { label: "Resolved", value: summary.resolvedComplaints, icon: CheckCircle, color: "text-green-400" },
    { label: "Resolution Rate", value: `${Math.round(summary.resolutionRate * 100)}%`, icon: TrendingUp, color: "text-emerald-400" },
    { label: "Avg Resolution", value: `${Math.round(summary.avgResolutionHours)}h`, icon: Clock, color: "text-yellow-400" },
    { label: "Active Workers", value: summary.activeWorkers, icon: Users, color: "text-purple-400" },
    { label: "Departments", value: summary.totalDepartments, icon: Building2, color: "text-orange-400" },
  ] : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">Community Hero — Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user.name}</span>
          <Button variant="outline" size="sm" onClick={() => { logout(); setLocation("/login"); }}>
            <LogOut className="h-4 w-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-1.5" />Dashboard</TabsTrigger>
            <TabsTrigger value="complaints"><FileText className="h-4 w-4 mr-1.5" />Complaints</TabsTrigger>
            {/* Issue 1: Reviews tab for approving/rejecting officer completion evidence */}
            <TabsTrigger value="reviews" className="relative">
              <Zap className="h-4 w-4 mr-1.5" />Reviews
              {pendingReviews.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-orange-500 text-white rounded-full">
                  {pendingReviews.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="workers"><Users className="h-4 w-4 mr-1.5" />Officers</TabsTrigger>
            <TabsTrigger value="departments"><Building2 className="h-4 w-4 mr-1.5" />Departments</TabsTrigger>
            <TabsTrigger value="assets"><QrCode className="h-4 w-4 mr-1.5" />Public Assets</TabsTrigger>
          </TabsList>

          {/* ── Dashboard ── */}
          <TabsContent value="dashboard">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Live Dashboard</h2>
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              {statCards.map(card => (
                <Card key={card.label} className="bg-card border-border">
                  <CardContent className="pt-4 pb-3">
                    <card.icon className={`h-5 w-5 mb-2 ${card.color}`} />
                    <div className="text-2xl font-bold">{card.value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{card.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts */}
            {summary && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-card border-border">
                  <CardHeader><CardTitle className="text-sm">Complaints by Status</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={summary.byStatus}>
                        <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardHeader><CardTitle className="text-sm">Complaints by Priority</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={summary.byPriority} dataKey="count" nameKey="priority" cx="50%" cy="50%" outerRadius={80} label={({ priority, count }) => `${priority}: ${count}`}>
                          {summary.byPriority.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ── Complaints ── */}
          <TabsContent value="complaints">
            <div className="flex flex-wrap gap-3 mb-4 items-center">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by ticket, description, address…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8" />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {["submitted","ai_processing","assigned","dispatched","in_progress","pending_admin_review","resolved","reopened","closed"].map(s => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {["low","medium","high","critical","emergency"].map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">{totalComplaints} total</span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {["Ticket","Description","Status","Priority","Department","Officer","Location","Date"].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredComplaints.map(c => (
                    <tr key={c.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-xs text-primary">{c.ticketId}</td>
                      <td className="px-3 py-2.5 max-w-48 truncate text-muted-foreground">{c.description ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-white text-xs ${STATUS_COLORS[c.status] ?? "bg-gray-500"}`}>
                          {c.status.replace(/_/g," ")}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {c.priority ? <span className={`inline-block px-2 py-0.5 rounded text-white text-xs ${PRIORITY_COLORS[c.priority] ?? "bg-gray-500"}`}>{c.priority}</span> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">{getDeptName(c.departmentId)}</td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">{getWorkerName(c.assignedWorkerId)}</td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-32 truncate">{c.address ?? (c.latitude ? `${c.latitude?.toFixed(4)},${c.longitude?.toFixed(4)}` : "—")}</td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {filteredComplaints.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No complaints found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ── Issue 1: Reviews Tab — Admin approves or rejects officer evidence ── */}
          <TabsContent value="reviews">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Pending Reviews</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Officer-submitted completion evidence awaiting your approval
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchPendingReviews} disabled={reviewLoading}>
                <RefreshCw className={`h-4 w-4 mr-1.5 ${reviewLoading ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>

            {reviewLoading ? (
              <p className="text-center text-muted-foreground py-8">Loading…</p>
            ) : pendingReviews.length === 0 ? (
              <div className="text-center py-16">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="font-medium">No pending reviews</p>
                <p className="text-sm text-muted-foreground mt-1">All officer submissions have been reviewed.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingReviews.map(c => (
                  <Card key={c.id} className="bg-card border-orange-500/30 border">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-xs text-primary mb-1">{c.ticketId}</div>
                          <div className="text-sm text-foreground line-clamp-2">{c.description ?? "No description"}</div>
                        </div>
                        <span className="ml-3 text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 whitespace-nowrap">
                          Pending Review
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
                        <span>Officer: <strong className="text-foreground">{getWorkerName(c.assignedWorkerId)}</strong></span>
                        <span>Dept: <strong className="text-foreground">{getDeptName(c.departmentId)}</strong></span>
                        {c.priority && (
                          <span>Priority: <span className={`font-medium ${
                            c.priority === "emergency" || c.priority === "critical" ? "text-red-400" :
                            c.priority === "high" ? "text-orange-400" : "text-foreground"
                          }`}>{c.priority}</span></span>
                        )}
                        {c.completionTimestamp && (
                          <span>Submitted: <strong className="text-foreground">{new Date(c.completionTimestamp).toLocaleString()}</strong></span>
                        )}
                        {c.completionLatitude != null && (
                          <span className="col-span-2 flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-green-400" />
                            <span className="text-green-400">GPS verified at: {c.completionLatitude.toFixed(5)}, {c.completionLongitude?.toFixed(5)}</span>
                          </span>
                        )}
                        {!c.completionLatitude && (
                          <span className="col-span-2 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-yellow-400" />
                            <span className="text-yellow-400">No GPS coordinates in submission</span>
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleAdminApprove(c)}
                          disabled={reviewSubmitting}
                        >
                          <ThumbsUp className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => { setReviewingComplaint(c); setRejectionReason(""); setReviewDialogOpen(true); }}
                          disabled={reviewSubmitting}
                        >
                          <ThumbsDown className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Officers ── */}
          <TabsContent value="workers">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Field Officers</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workers.map(w => (
                <Card key={w.id} className="bg-card border-border">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{w.name}</div>
                        <div className="text-xs text-muted-foreground">{w.phone}</div>
                        <div className="text-xs text-muted-foreground">{getDeptName(w.departmentId)}</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full text-white ${w.status === "available" ? "bg-green-600" : w.status === "busy" ? "bg-orange-500" : "bg-gray-500"}`}>
                        {w.status}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                      <span>Active: <strong className="text-foreground">{w.activeComplaintCount}</strong></span>
                      <span>Resolved: <strong className="text-foreground">{w.totalResolved}</strong></span>
                      {w.avgRating && <span>Rating: <strong className="text-foreground">⭐ {w.avgRating.toFixed(1)}</strong></span>}
                    </div>
                    {w.skills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {w.skills.slice(0,3).map(s => <span key={s} className="text-xs bg-muted rounded px-1.5 py-0.5">{s}</span>)}
                      </div>
                    )}
                    {w.currentLatitude && (
                      <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {w.currentLatitude.toFixed(4)}, {w.currentLongitude?.toFixed(4)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Departments ── */}
          <TabsContent value="departments">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {departments.map(d => (
                <Card key={d.id} className="bg-card border-border">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{d.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{d.code}</div>
                        {d.description && <div className="text-xs text-muted-foreground mt-1">{d.description}</div>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${d.isActive ? "bg-green-600/20 text-green-400" : "bg-red-600/20 text-red-400"}`}>
                        {d.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {d.issueTypes.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs text-muted-foreground mb-1">Handles:</div>
                        <div className="flex flex-wrap gap-1">
                          {d.issueTypes.map(t => <span key={t} className="text-xs bg-muted rounded px-1.5 py-0.5">{t.replace(/_/g," ")}</span>)}
                        </div>
                      </div>
                    )}
                    {d.headName && <div className="mt-2 text-xs text-muted-foreground">Head: {d.headName}</div>}
                    <div className="mt-2 text-xs text-muted-foreground">
                      Officers: <strong className="text-foreground">{workers.filter(w => w.departmentId === d.id).length}</strong>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Public Assets ── */}
          <TabsContent value="assets">
            <AssetsManagement departments={departments} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Issue 1: Rejection reason dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ThumbsDown className="h-5 w-5 text-red-400" />
              Reject Submission — {reviewingComplaint?.ticketId}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Rejection Reason <span className="text-red-400">*</span></Label>
            <Textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Explain why the submission was rejected (officer will see this)…"
              rows={3}
              className="bg-card border-border resize-none"
            />
            <p className="text-xs text-muted-foreground">
              The complaint will be returned to the officer as "In Progress" with this reason displayed.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleAdminReject}
              disabled={!rejectionReason.trim() || reviewSubmitting}
            >
              {reviewSubmitting ? (
                <><RefreshCw className="h-4 w-4 mr-1 animate-spin" />Rejecting…</>
              ) : (
                "Reject & Return to Officer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
