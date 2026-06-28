import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { VoiceInput } from "@/components/VoiceInput";
import { TextToSpeechButton } from "@/components/TextToSpeechButton";
import { useLocation } from "wouter";
import { complaintsApi, assetsApi, type Complaint, type PublicAsset } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { User, LogOut, Plus, Search, FileText, MapPin, Clock, CheckCircle, Star, AlertCircle, RefreshCw, QrCode, Camera, X, Activity } from "lucide-react";
import { toast } from "sonner";

// Issue 2: Added "pending_admin_review" status to tracker steps and info map
const STATUS_STEPS = ["submitted","ai_processing","assigned","dispatched","in_progress","pending_admin_review","resolved","closed"];

const STATUS_INFO: Record<string, { label: string; color: string; description: string }> = {
  submitted: { label: "Submitted", color: "text-blue-400", description: "Your complaint has been received" },
  ai_processing: { label: "AI Analyzing", color: "text-purple-400", description: "AI is analyzing your complaint" },
  assigned: { label: "Assigned", color: "text-yellow-400", description: "Department assigned" },
  dispatched: { label: "Officer Dispatched", color: "text-orange-400", description: "Officer accepted and heading to location" },
  in_progress: { label: "In Progress", color: "text-blue-400", description: "Officer is working on the issue" },
  // Issue 2: New status — officer submitted evidence, admin is reviewing
  pending_admin_review: { label: "Under Review", color: "text-orange-400", description: "Officer submitted evidence — admin is reviewing" },
  resolved: { label: "Resolved", color: "text-green-400", description: "Issue has been resolved" },
  failed_verification: { label: "Verification Failed", color: "text-red-400", description: "AI verification failed — reopening" },
  reopened: { label: "Reopened", color: "text-red-400", description: "Complaint reopened for re-investigation" },
  closed: { label: "Closed", color: "text-gray-400", description: "Issue fully resolved and closed" },
};

const ASSET_TYPE_LABELS: Record<string, string> = {
  public_toilet: "Public Toilet",
  dustbin: "Dustbin",
  park: "Park",
  bus_stop: "Bus Stop",
  street_light: "Street Light",
  water_atm: "Water ATM",
  drinking_water_point: "Drinking Water Point",
  government_building: "Government Building",
  community_hall: "Community Hall",
  other: "Other",
};

const ASSET_TYPE_ICONS: Record<string, string> = {
  public_toilet: "🚻",
  dustbin: "🗑️",
  park: "🌳",
  bus_stop: "🚌",
  street_light: "💡",
  water_atm: "💧",
  drinking_water_point: "🚰",
  government_building: "🏛️",
  community_hall: "🏢",
  other: "📍",
};

function healthColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

export default function CitizenPortal() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [myComplaints, setMyComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("report");

  // QR asset pre-fill
  const [scannedAsset, setScannedAsset] = useState<PublicAsset | null>(null);
  const [assetCodeInput, setAssetCodeInput] = useState("");
  const [loadingAsset, setLoadingAsset] = useState(false);

  // Submit form
  const [desc, setDesc] = useState("");
  const [address, setAddress] = useState("");
  const [ward, setWard] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track by ticket
  const [ticketSearch, setTicketSearch] = useState("");
  const [trackedComplaint, setTrackedComplaint] = useState<Complaint | null>(null);
  const [tracking, setTracking] = useState(false);

  // Feedback dialog
  const [feedbackComplaint, setFeedbackComplaint] = useState<Complaint | null>(null);
  const [rating, setRating] = useState(5);
  const [citizenVerified, setCitizenVerified] = useState<boolean | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Issue 2: Filter only the current user's own complaints (by email).
  // Removed the erroneous `|| !c.isAnonymous` which was showing ALL non-anonymous
  // complaints from every citizen, causing stale/wrong data to appear in the tracker.
  const fetchMyComplaints = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await complaintsApi.list({ limit: 50 });
      // Only show complaints belonging to the logged-in citizen
      setMyComplaints(data.items.filter(c => c.citizenEmail === user.email));
    } catch {
      setMyComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  // Check for ?asset= URL param on mount (QR scan entry point)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const assetCode = params.get("asset");
    if (assetCode) {
      loadAssetByCode(assetCode);
      setActiveTab("report");
    }
    fetchMyComplaints();
  }, []);

  // Issue 2: Re-fetch fresh data when citizen switches to "My Complaints" tab
  // to ensure they always see the latest status updates from the backend.
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "my") {
      fetchMyComplaints();
    }
  };

  const loadAssetByCode = async (code: string) => {
    setLoadingAsset(true);
    try {
      const asset = await assetsApi.getByCode(code.toUpperCase());
      setScannedAsset(asset);
      if (asset.address) setAddress(asset.address);
      if (asset.ward) setWard(asset.ward);
      toast.success(`Asset loaded: ${asset.name}`);
    } catch {
      toast.error(`Asset "${code}" not found. Please enter the issue manually.`);
    } finally {
      setLoadingAsset(false);
    }
  };

  if (!user || user.role !== "citizen") { setLocation("/login"); return null; }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim()) { toast.error("Please describe the issue"); return; }
    setSubmitting(true);
    try {
      let lat: number | undefined, lng: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch { /* GPS declined — ok */ }

      let imageBase64: string | undefined;
      if (imageFile) {
        imageBase64 = await new Promise<string>((resolve) => {
          const img = new Image();
          const objectUrl = URL.createObjectURL(imageFile);
          img.onload = () => {
            const MAX = 1024;
            const scale = Math.min(1, MAX / Math.max(img.width, img.height));
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
            URL.revokeObjectURL(objectUrl);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
            resolve(dataUrl.split(",")[1] ?? dataUrl);
          };
          img.src = objectUrl;
        });
      }

      await complaintsApi.submit({
        description: desc,
        address: scannedAsset?.address ?? (address || undefined),
        ward: scannedAsset?.ward ?? (ward || undefined),
        latitude: scannedAsset?.latitude ?? lat,
        longitude: scannedAsset?.longitude ?? lng,
        isAnonymous,
        citizenName: isAnonymous ? undefined : user.name,
        citizenEmail: isAnonymous ? undefined : user.email,
        publicAssetId: scannedAsset?.id ?? undefined,
        imageBase64,
      });

      toast.success("Complaint submitted! AI is analyzing it now.");
      setDesc("");
      setAddress("");
      setWard("");
      setIsAnonymous(false);
      setScannedAsset(null);
      setImageFile(null);
      setImagePreview(null);
      // Issue 2: Refresh list after submit so the new complaint appears with correct status
      fetchMyComplaints();
      setActiveTab("my");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrack = async () => {
    if (!ticketSearch.trim()) return;
    setTracking(true);
    try {
      // Issue 2: Always fetch fresh from backend — getByTicket returns current DB status
      const c = await complaintsApi.getByTicket(ticketSearch.trim().toUpperCase());
      setTrackedComplaint(c);
    } catch {
      toast.error("Ticket not found");
      setTrackedComplaint(null);
    } finally {
      setTracking(false);
    }
  };

  const handleFeedback = async () => {
    if (!feedbackComplaint || citizenVerified === null) return;
    setSubmittingFeedback(true);
    try {
      await complaintsApi.feedback(feedbackComplaint.id, {
        citizenVerified,
        citizenRating: rating,
        citizenComment: feedbackComment,
      });
      toast.success(citizenVerified ? "Thank you! Issue marked as resolved." : "Complaint reopened for re-investigation.");
      setFeedbackComplaint(null);
      // Issue 2: Re-fetch after feedback so list shows updated status
      fetchMyComplaints();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to submit feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const ComplaintCard = ({ c }: { c: Complaint }) => {
    const info = STATUS_INFO[c.status] ?? { label: c.status.replace(/_/g," "), color: "text-gray-400", description: "" };
    const stepIdx = STATUS_STEPS.indexOf(c.status);
    const progressPct = stepIdx >= 0 ? Math.round((stepIdx / (STATUS_STEPS.length - 1)) * 100) : 0;
    const canRate = c.status === "resolved" || c.status === "closed";

    return (
      <Card className="bg-card border-border">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="font-mono text-xs text-primary mb-0.5">{c.ticketId}</div>
              <div className="text-sm line-clamp-2 text-foreground">{c.description ?? "No description"}</div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.color} bg-muted ml-2 whitespace-nowrap`}>
              {info.label}
            </span>
          </div>

          <div className="mb-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{info.description}</span>
              <span>{progressPct}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          {c.address && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{c.address}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span>{new Date(c.createdAt).toLocaleDateString()}</span>
          </div>

          {canRate && (
            <Button size="sm" className="w-full" onClick={() => { setFeedbackComplaint(c); setCitizenVerified(null); setRating(5); setFeedbackComment(""); }}>
              <Star className="h-3.5 w-3.5 mr-1" /> Rate & Verify Resolution
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">Citizen Portal</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user.name}</span>
          <Button variant="outline" size="sm" onClick={() => { logout(); setLocation("/login"); }}>
            <LogOut className="h-4 w-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto">
        {/* Issue 2: Use controlled tab with onValueChange to trigger re-fetch on tab switch */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full mb-6">
            <TabsTrigger value="report" className="flex-1"><Plus className="h-4 w-4 mr-1.5" />Report Issue</TabsTrigger>
            <TabsTrigger value="my" className="flex-1"><FileText className="h-4 w-4 mr-1.5" />My Complaints ({myComplaints.length})</TabsTrigger>
            <TabsTrigger value="track" className="flex-1"><Search className="h-4 w-4 mr-1.5" />Track</TabsTrigger>
          </TabsList>

          {/* ── Report Issue ── */}
          <TabsContent value="report">
            {/* QR Asset Code Entry */}
            {!scannedAsset && (
              <Card className="bg-slate-800/50 border-slate-700 mb-4">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <QrCode className="h-5 w-5 text-blue-400" />
                    <div>
                      <p className="text-sm font-medium">Reporting about a public asset?</p>
                      <p className="text-xs text-muted-foreground">Enter the asset code from the QR sticker to auto-fill location and department</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. PT-001 or DB-003"
                      value={assetCodeInput}
                      onChange={e => setAssetCodeInput(e.target.value.toUpperCase())}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); loadAssetByCode(assetCodeInput); } }}
                      className="bg-slate-900 border-slate-600 font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={() => loadAssetByCode(assetCodeInput)}
                      disabled={!assetCodeInput.trim() || loadingAsset}
                      className="bg-blue-600 hover:bg-blue-700 shrink-0"
                    >
                      {loadingAsset ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Load"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Asset Info Banner */}
            {scannedAsset && (
              <Card className="bg-blue-900/30 border-blue-500/40 mb-4">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{ASSET_TYPE_ICONS[scannedAsset.type] ?? "📍"}</span>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-sm">{scannedAsset.name}</p>
                          <Badge variant="outline" className="text-[10px] font-mono border-blue-400/50 text-blue-300">
                            {scannedAsset.assetCode}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400">{ASSET_TYPE_LABELS[scannedAsset.type] ?? scannedAsset.type} • {scannedAsset.ward ?? "Unknown ward"}</p>
                        {scannedAsset.address && <p className="text-xs text-slate-500 mt-0.5">{scannedAsset.address}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          <Activity className="h-3 w-3 text-slate-400" />
                          <span className={`text-xs font-bold ${healthColor(scannedAsset.healthScore)}`}>
                            Health: {Math.round(scannedAsset.healthScore)}%
                          </span>
                          <span className="text-xs text-slate-500">• {scannedAsset.totalComplaints} prior complaints</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setScannedAsset(null)} className="text-slate-400 hover:text-white p-1">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-blue-300 mt-2 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    GPS location, department, and ward auto-filled from asset record
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Submit Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label>Describe the issue *</Label>
                  <VoiceInput onTranscript={t => setDesc(prev => prev ? prev + " " + t : t)} />
                </div>
                <Textarea
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder={scannedAsset
                    ? `Describe the issue with ${scannedAsset.name}… or use Voice button`
                    : "Describe the problem in detail… or use Voice button"
                  }
                  rows={4}
                  className="bg-card border-border resize-none"
                  aria-label="Complaint description"
                />
              </div>

              {/* Photo Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Camera className="h-4 w-4" />
                  Photo
                  <span className="text-xs text-muted-foreground">(strongly recommended)</span>
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImageChange}
                />
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover rounded-lg border border-border" />
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" className="w-full border-dashed border-border" onClick={() => fileInputRef.current?.click()}>
                    <Camera className="h-4 w-4 mr-2" /> Attach Photo
                  </Button>
                )}
              </div>

              {!scannedAsset && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Street / area" className="bg-card border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>Ward</Label>
                    <Input value={ward} onChange={e => setWard(e.target.value)} placeholder="Ward number" className="bg-card border-border" />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Switch id="anon" checked={isAnonymous} onCheckedChange={setIsAnonymous} />
                <Label htmlFor="anon" className="cursor-pointer text-sm">Submit anonymously</Label>
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Submitting…</> : <><AlertCircle className="h-4 w-4 mr-2" /> Submit Complaint</>}
              </Button>
            </form>
          </TabsContent>

          {/* ── My Complaints ── */}
          <TabsContent value="my">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">My Complaints</h2>
              <Button size="sm" variant="outline" onClick={fetchMyComplaints} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading…</p>
            ) : myComplaints.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No complaints yet.</p>
                <Button className="mt-3" onClick={() => setActiveTab("report")}>Report an issue</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {myComplaints.map(c => <ComplaintCard key={c.id} c={c} />)}
              </div>
            )}
          </TabsContent>

          {/* ── Track ── */}
          <TabsContent value="track">
            <Card className="bg-card border-border mb-4">
              <CardHeader><CardTitle className="text-base">Track by Ticket ID</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    value={ticketSearch}
                    onChange={e => setTicketSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleTrack(); }}
                    placeholder="CH-12345"
                    className="font-mono bg-card border-border"
                  />
                  <Button onClick={handleTrack} disabled={tracking || !ticketSearch.trim()}>
                    {tracking ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {trackedComplaint && (
              <>
                <ComplaintCard c={trackedComplaint} />
                {/* Issue 2: Refresh tracked complaint to get latest status from backend */}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-2"
                  onClick={handleTrack}
                  disabled={tracking}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${tracking ? "animate-spin" : ""}`} />
                  Refresh Status
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Feedback Dialog */}
      {feedbackComplaint && (
        <Dialog open onOpenChange={() => setFeedbackComplaint(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rate Resolution — {feedbackComplaint.ticketId}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Was the issue resolved?</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={citizenVerified === true ? "default" : "outline"}
                    onClick={() => setCitizenVerified(true)}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> Yes, resolved
                  </Button>
                  <Button
                    size="sm"
                    variant={citizenVerified === false ? "destructive" : "outline"}
                    onClick={() => setCitizenVerified(false)}
                    className="flex-1"
                  >
                    Not resolved
                  </Button>
                </div>
              </div>

              {citizenVerified === true && (
                <div>
                  <Label className="mb-2 block">Rating ({rating}/5)</Label>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setRating(n)} className="text-2xl">
                        {n <= rating ? "⭐" : "☆"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label className="mb-1 block">Comment (optional)</Label>
                <Textarea
                  value={feedbackComment}
                  onChange={e => setFeedbackComment(e.target.value)}
                  placeholder="Any additional comments…"
                  rows={2}
                  className="bg-card border-border resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFeedbackComplaint(null)}>Cancel</Button>
              <Button
                onClick={handleFeedback}
                disabled={citizenVerified === null || submittingFeedback}
              >
                {submittingFeedback ? <><RefreshCw className="h-4 w-4 mr-1 animate-spin" />Submitting…</> : "Submit Feedback"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
