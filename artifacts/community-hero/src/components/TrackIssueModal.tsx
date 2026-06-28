import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  Search,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  User,
  Wrench,
  Building2,
  AlertCircle,
  ChevronRight,
  Zap,
  Navigation,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

interface StatusStep {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  time?: string;
}

const ALL_STEPS: StatusStep[] = [
  { id: "submitted",   label: "Report Submitted",     description: "Your complaint has been received by the system.",               icon: CheckCircle2 },
  { id: "ai",          label: "AI Processing",         description: "AI is classifying the issue and determining priority.",          icon: Zap },
  { id: "assigned",    label: "Department Assigned",   description: "Issue forwarded to the relevant municipal department.",         icon: Building2 },
  { id: "dispatched",  label: "Worker Dispatched",     description: "A field worker has been assigned and is en route.",             icon: Navigation },
  { id: "inprogress",  label: "Work In Progress",      description: "The worker is actively resolving the issue on-site.",          icon: Wrench },
  { id: "resolved",    label: "Issue Resolved",        description: "Work has been completed and verified by the system.",           icon: ShieldCheck },
];

type IssueStatus = "submitted" | "ai" | "assigned" | "dispatched" | "inprogress" | "resolved";

interface MockIssue {
  ticketId: string;
  category: string;
  location: string;
  ward: string;
  priority: "High" | "Medium" | "Low";
  priorityColor: string;
  department: string;
  workerName: string;
  workerPhone: string;
  eta: string;
  reportedAt: string;
  status: IssueStatus;
  statusIndex: number;
  completedAt?: string;
}

function getMockIssue(id: string): MockIssue | null {
  const upper = id.toUpperCase().replace(/\s/g, "");
  if (!upper.startsWith("CH-") || upper.length < 8) return null;

  const seed = upper.charCodeAt(3) + upper.charCodeAt(4);
  const statuses: IssueStatus[] = ["submitted", "ai", "assigned", "dispatched", "inprogress", "resolved"];
  const statusIdx = seed % statuses.length;
  const status = statuses[statusIdx];

  const categories = ["Pothole / Road Damage", "Water Leakage", "Street Light Out", "Garbage Overflow", "Broken Footpath", "Drainage Blocked"];
  const departments = ["Public Works Department", "Water & Sewage Board", "Electricity Board", "Sanitation Department", "Urban Development"];
  const workers = ["Ramesh Kumar", "Priya Singh", "Suresh Nair", "Anita Desai", "Mohan Rao"];
  const locations = ["MG Road, Near City Bank", "Sector 12, Nehru Nagar", "Gandhi Chowk, Old Market", "Sadar Bazaar, Block C", "Station Road, Ward 7"];
  const wards = ["Ward 14", "Ward 07", "Ward 22", "Ward 03", "Ward 18"];
  const priorities: Array<"High" | "Medium" | "Low"> = ["High", "Medium", "Low"];
  const priorityColors = ["text-red-400", "text-yellow-400", "text-green-400"];

  const i = seed % 5;
  const now = new Date();
  const reported = new Date(now.getTime() - (seed * 3600000 + 7200000));

  return {
    ticketId: upper,
    category: categories[i],
    location: locations[i],
    ward: wards[i],
    priority: priorities[seed % 3],
    priorityColor: priorityColors[seed % 3],
    department: departments[i],
    workerName: workers[i],
    workerPhone: "+91 9" + (81000000 + seed * 13).toString().slice(0, 9),
    eta: statusIdx >= 5 ? "Completed" : statusIdx >= 3 ? "~45 mins" : "~2 hrs",
    reportedAt: reported.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    status,
    statusIndex: statusIdx,
    completedAt: statusIdx === 5 ? new Date(reported.getTime() + seed * 900000 + 3600000).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : undefined,
  };
}

const stepTimes = ["Just now", "2 mins ago", "18 mins ago", "1 hr ago", "3 hrs ago", "Yesterday"];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function TrackIssueModal({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [issue, setIssue] = useState<MockIssue | null>(null);
  const [notFound, setNotFound] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setIssue(null);
    setNotFound(false);
    await new Promise((r) => setTimeout(r, 1400));
    const result = getMockIssue(query.trim());
    setLoading(false);
    if (result) {
      setIssue(result);
    } else {
      setNotFound(true);
    }
  }

  function handleClose() {
    onClose();
    setTimeout(() => {
      setQuery("");
      setIssue(null);
      setNotFound(false);
      setLoading(false);
    }, 300);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="max-w-2xl w-full p-0 border-0 bg-transparent shadow-none overflow-visible"
        aria-describedby={undefined}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: "rgba(10, 14, 30, 0.97)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 0 60px rgba(37,99,235,0.2), 0 25px 60px rgba(0,0,0,0.8)",
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />

          {/* Header */}
          <div className="px-8 pt-7 pb-6 border-b border-white/8 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white font-['Plus_Jakarta_Sans']">Track Your Issue</h2>
              <p className="text-sm text-white/50 mt-0.5">Enter your ticket ID to see real-time status updates</p>
            </div>
            <button
              onClick={handleClose}
              data-testid="button-close-track-modal"
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={16} />
            </button>
          </div>

          {/* Search */}
          <div className="px-8 pt-6 pb-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <Input
                  data-testid="input-ticket-id"
                  placeholder="e.g. CH-48291"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setNotFound(false); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-cyan-500/60 font-['Space_Grotesk'] tracking-wider text-sm h-11"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={loading || !query.trim()}
                data-testid="button-search-ticket"
                className="h-11 px-5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 gap-2 disabled:opacity-30"
                style={{ boxShadow: query.trim() ? "0 0 16px rgba(34,211,238,0.2)" : "none" }}
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                {loading ? "Looking up..." : "Track"}
              </Button>
            </div>
            <p className="text-xs text-white/25 mt-2 ml-1">Format: CH-XXXXX &nbsp;·&nbsp; Try CH-48291 or CH-73014</p>
          </div>

          {/* Content */}
          <div className="px-8 pb-8 min-h-[200px]">
            <AnimatePresence mode="wait">
              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-12 gap-4"
                >
                  <div className="relative w-14 h-14">
                    <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin" />
                    <Search size={20} className="absolute inset-0 m-auto text-cyan-400/60" />
                  </div>
                  <div className="text-center">
                    <p className="text-white/70 text-sm font-medium">Fetching issue details...</p>
                    <p className="text-white/30 text-xs mt-1">Querying municipal database</p>
                  </div>
                </motion.div>
              )}

              {notFound && !loading && (
                <motion.div
                  key="notfound"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-10 gap-3"
                >
                  <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <AlertCircle size={24} className="text-red-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-white/80 font-medium">Ticket not found</p>
                    <p className="text-white/40 text-sm mt-1">Double-check the ID from your confirmation SMS or email.</p>
                    <p className="text-white/25 text-xs mt-1">Format must be CH-XXXXX (5 digits after CH-)</p>
                  </div>
                </motion.div>
              )}

              {issue && !loading && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="space-y-5"
                >
                  {/* Issue summary card */}
                  <div className="bg-white/4 border border-white/8 rounded-xl p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-['Space_Grotesk'] text-cyan-400 font-bold text-sm tracking-wider">{issue.ticketId}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                            issue.priority === "High"   ? "text-red-400 border-red-400/30 bg-red-400/10" :
                            issue.priority === "Medium" ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" :
                                                          "text-green-400 border-green-400/30 bg-green-400/10"
                          }`}>
                            {issue.priority} Priority
                          </span>
                        </div>
                        <h3 className="text-white font-semibold font-['Plus_Jakarta_Sans']">{issue.category}</h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-white/45">
                          <span className="flex items-center gap-1"><MapPin size={11} />{issue.location}</span>
                          <span className="flex items-center gap-1"><Building2 size={11} />{issue.ward}</span>
                          <span className="flex items-center gap-1"><Clock size={11} />Reported {issue.reportedAt}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
                          issue.status === "resolved" ? "bg-green-500/15 text-green-400 border border-green-500/25" :
                          issue.status === "inprogress" || issue.status === "dispatched" ? "bg-blue-500/15 text-blue-400 border border-blue-500/25" :
                          "bg-yellow-500/15 text-yellow-400 border border-yellow-500/25"
                        }`}>
                          {issue.status === "resolved" ? "Resolved" :
                           issue.status === "inprogress" ? "In Progress" :
                           issue.status === "dispatched" ? "Worker En Route" :
                           issue.status === "assigned" ? "Assigned" :
                           issue.status === "ai" ? "AI Processing" : "Submitted"}
                        </div>
                        {issue.eta !== "Completed" && (
                          <div className="text-xs text-white/35 mt-1">ETA {issue.eta}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div>
                    <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Status Timeline</h4>
                    <div className="relative">
                      {/* Vertical connector line */}
                      <div className="absolute left-[15px] top-4 bottom-4 w-px bg-white/8" />
                      <div
                        className="absolute left-[15px] top-4 w-px bg-gradient-to-b from-cyan-500 to-blue-600 transition-all duration-1000"
                        style={{ height: `${Math.min(issue.statusIndex / (ALL_STEPS.length - 1), 1) * 100}%` }}
                      />

                      <div className="space-y-1">
                        {ALL_STEPS.map((step, idx) => {
                          const done = idx <= issue.statusIndex;
                          const active = idx === issue.statusIndex;
                          const Icon = step.icon;
                          return (
                            <motion.div
                              key={step.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.06 }}
                              className="relative flex items-start gap-4 pl-0"
                            >
                              {/* Dot */}
                              <div className="relative z-10 shrink-0 mt-0.5">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                                  active ? "bg-cyan-500/20 border-2 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.4)]" :
                                  done   ? "bg-primary/20 border-2 border-primary" :
                                           "bg-white/4 border border-white/10"
                                }`}>
                                  <Icon size={14} className={active ? "text-cyan-400" : done ? "text-primary" : "text-white/20"} />
                                </div>
                                {active && (
                                  <motion.div
                                    animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="absolute inset-0 rounded-full bg-cyan-400/30"
                                  />
                                )}
                              </div>

                              {/* Content */}
                              <div className={`flex-1 pb-5 ${idx === ALL_STEPS.length - 1 ? "pb-0" : ""}`}>
                                <div className="flex items-center justify-between">
                                  <span className={`text-sm font-semibold ${active ? "text-cyan-300" : done ? "text-white" : "text-white/30"}`}>
                                    {step.label}
                                  </span>
                                  {done && (
                                    <span className="text-xs text-white/30 font-['Space_Grotesk']">{stepTimes[idx]}</span>
                                  )}
                                </div>
                                <p className={`text-xs mt-0.5 leading-relaxed ${done ? "text-white/50" : "text-white/20"}`}>
                                  {step.description}
                                </p>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Worker + department info */}
                  {issue.statusIndex >= 2 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="grid grid-cols-2 gap-3"
                    >
                      <div className="bg-white/4 border border-white/8 rounded-xl p-4">
                        <p className="text-xs text-white/35 uppercase tracking-wider mb-2">Department</p>
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-blue-400 shrink-0" />
                          <span className="text-sm text-white font-medium leading-tight">{issue.department}</span>
                        </div>
                      </div>
                      {issue.statusIndex >= 3 && (
                        <div className="bg-white/4 border border-white/8 rounded-xl p-4">
                          <p className="text-xs text-white/35 uppercase tracking-wider mb-2">Assigned Worker</p>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                              <User size={11} className="text-primary" />
                            </div>
                            <div>
                              <div className="text-sm text-white font-medium">{issue.workerName}</div>
                              <div className="text-xs text-white/35">{issue.workerPhone}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Resolved banner */}
                  {issue.status === "resolved" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 }}
                      className="flex items-center gap-3 bg-green-500/10 border border-green-500/25 rounded-xl p-4"
                    >
                      <CheckCircle2 size={20} className="text-green-400 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-green-300">Issue successfully resolved</p>
                        <p className="text-xs text-green-400/60 mt-0.5">Completed on {issue.completedAt} &nbsp;·&nbsp; Please rate the service</p>
                      </div>
                      <div className="ml-auto flex gap-1">
                        {[1,2,3,4,5].map((s) => (
                          <button key={s} data-testid={`star-rating-${s}`} className="text-yellow-400/40 hover:text-yellow-400 transition-colors text-lg leading-none">★</button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      data-testid="button-search-again"
                      onClick={() => { setIssue(null); setQuery(""); }}
                      className="text-xs text-white/35 hover:text-white/60 flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw size={12} />
                      Track another issue
                    </button>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid="button-share-issue"
                        className="text-white/40 hover:text-white hover:bg-white/8 text-xs h-8"
                        onClick={() => navigator.clipboard?.writeText(issue.ticketId)}
                      >
                        Copy Ticket ID
                      </Button>
                      <Button
                        size="sm"
                        data-testid="button-escalate"
                        className="bg-white/8 hover:bg-white/14 text-white border border-white/10 text-xs h-8 gap-1.5"
                      >
                        Escalate <ChevronRight size={12} />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {!loading && !issue && !notFound && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-10 gap-3 text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-cyan-500/8 border border-cyan-500/15 flex items-center justify-center">
                    <Search size={22} className="text-cyan-500/50" />
                  </div>
                  <div>
                    <p className="text-white/50 text-sm">Enter your ticket ID above</p>
                    <p className="text-white/25 text-xs mt-1">You received it via SMS/email when you reported the issue</p>
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap justify-center">
                    {["CH-48291", "CH-73014", "CH-20561"].map((sample) => (
                      <button
                        key={sample}
                        data-testid={`sample-ticket-${sample}`}
                        onClick={() => { setQuery(sample); setNotFound(false); }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/8 transition-all font-['Space_Grotesk'] tracking-wider"
                      >
                        {sample}
                      </button>
                    ))}
                  </div>
                  <p className="text-white/18 text-xs">Click a sample ID to try it out</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
