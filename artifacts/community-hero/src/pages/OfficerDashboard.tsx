import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { assignmentsApi, complaintsApi, assetsApi, type AssignmentWithComplaint } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Briefcase, LogOut, CheckCircle, Clock, AlertTriangle, MapPin, Phone,
  FileText, RefreshCw, Navigation, Play, Flag, QrCode, ShieldCheck, ShieldX,
  Activity, Camera, X
} from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  accepted: "bg-blue-500/20 text-blue-400",
  in_progress: "bg-purple-500/20 text-purple-400",
  completed: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
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

interface ProximityResult {
  verified: boolean;
  distanceMeters: number;
  message: string;
}

export default function OfficerDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [assignments, setAssignments] = useState<AssignmentWithComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithComplaint | null>(null);
  const [completeNotes, setCompleteNotes] = useState("");
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // GPS proximity verification
  const [gpsCheckStep, setGpsCheckStep] = useState<"idle" | "checking" | "done">("idle");
  const [proximityResult, setProximityResult] = useState<ProximityResult | null>(null);
  const [assetCode, setAssetCode] = useState<string | null>(null);

  // Issue 1: geo-tagged completion photo state
  const [completionPhotoBase64, setCompletionPhotoBase64] = useState<string | null>(null);
  const [completionPhotoPreview, setCompletionPhotoPreview] = useState<string | null>(null);
  const [photoLat, setPhotoLat] = useState<number | null>(null);
  const [photoLng, setPhotoLng] = useState<number | null>(null);
  const [photoCapturing, setPhotoCapturing] = useState(false);
  const photoFileInputRef = useRef<HTMLInputElement>(null);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const data = await assignmentsApi.my();
      setAssignments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAssignments(); }, []);

  if (!user || user.role !== "officer") { setLocation("/login"); return null; }

  const activeAssignments = assignments.filter(a => ["pending","accepted","in_progress"].includes(a.assignment.status));
  const completedAssignments = assignments.filter(a => ["completed","rejected"].includes(a.assignment.status));

  const handleAccept = async (a: AssignmentWithComplaint) => {
    setActionLoading(a.assignment.id);
    try {
      await assignmentsApi.accept(a.assignment.id);
      toast.success("Task accepted! Navigation ready.");
      fetchAssignments();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartWork = async (a: AssignmentWithComplaint) => {
    setActionLoading(a.assignment.id);
    try {
      await assignmentsApi.updateStatus(a.assignment.id, "in_progress");
      toast.success("Work started! Good luck!");
      fetchAssignments();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setActionLoading(null);
    }
  };

  const openCompleteDialog = (a: AssignmentWithComplaint) => {
    setSelectedAssignment(a);
    setGpsCheckStep("idle");
    setProximityResult(null);
    setAssetCode(null);
    setCompleteNotes("");
    // Reset photo state for each new dialog open
    setCompletionPhotoBase64(null);
    setCompletionPhotoPreview(null);
    setPhotoLat(null);
    setPhotoLng(null);
    setCompleteDialogOpen(true);
  };

  const handleVerifyGPS = async () => {
    if (!selectedAssignment) return;
    const complaint = selectedAssignment.complaint;

    if (!complaint.publicAssetId) {
      toast.info("No asset linked — GPS check skipped.");
      setProximityResult({ verified: true, distanceMeters: 0, message: "No asset linked" });
      setGpsCheckStep("done");
      return;
    }

    setGpsCheckStep("checking");
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000, enableHighAccuracy: true })
      );

      const result = await assetsApi.verifyOfficer(
        complaint.publicAssetId,
        pos.coords.latitude,
        pos.coords.longitude
      );

      setProximityResult(result);
      setGpsCheckStep("done");

      try {
        const asset = await assetsApi.get(complaint.publicAssetId);
        setAssetCode(asset.assetCode);
      } catch { /* non-critical */ }

      if (result.verified) {
        toast.success(`GPS verified! You are ${Math.round(result.distanceMeters)}m from the asset.`);
      } else {
        toast.error(result.message);
      }
    } catch (e: unknown) {
      if (e instanceof GeolocationPositionError || (e as { code?: number }).code !== undefined) {
        toast.error("GPS access denied. Please enable location.");
      } else {
        toast.error("GPS check failed");
      }
      setGpsCheckStep("idle");
    }
  };

  // Issue 1: Capture geo-tagged completion photo — records GPS at time of capture
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoCapturing(true);
    try {
      // Capture GPS at the moment of photo
      let lat: number | undefined, lng: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000, enableHighAccuracy: true })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        toast.warning("GPS unavailable — photo captured without location tag.");
      }

      // Compress and convert to base64
      const dataUrl = await new Promise<string>((resolve) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
          const MAX = 1024;
          const scale = Math.min(1, MAX / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(objectUrl);
          resolve(canvas.toDataURL("image/jpeg", 0.75));
        };
        img.src = objectUrl;
      });

      const base64 = dataUrl.split(",")[1] ?? dataUrl;
      setCompletionPhotoBase64(base64);
      setCompletionPhotoPreview(dataUrl);
      setPhotoLat(lat ?? null);
      setPhotoLng(lng ?? null);
      toast.success(lat ? "Photo captured with GPS coordinates!" : "Photo captured (no GPS tag).");
    } catch {
      toast.error("Failed to process photo. Please try again.");
    } finally {
      setPhotoCapturing(false);
      // Reset so same file can be re-selected if needed
      if (photoFileInputRef.current) photoFileInputRef.current.value = "";
    }
  };

  // Issue 1: handleComplete now passes geo-tagged photo to verify endpoint.
  // Assignment stays in_progress until admin approves — no separate updateStatus("completed") call.
  const handleComplete = async () => {
    if (!selectedAssignment) return;

    const needsGpsCheck = !!selectedAssignment.complaint.publicAssetId;
    if (needsGpsCheck && (!proximityResult || !proximityResult.verified)) {
      toast.error("GPS verification required. You must be within 20m of the asset.");
      return;
    }

    if (!completionPhotoBase64) {
      toast.error("Please capture a completion photo before submitting.");
      return;
    }

    setActionLoading(selectedAssignment.assignment.id);
    try {
      // Submit photo evidence for AI verification + admin review
      await complaintsApi.verify(selectedAssignment.complaint.id, {
        workerNotes: completeNotes,
        completionPhotoBase64,
        completionLatitude: photoLat ?? undefined,
        completionLongitude: photoLng ?? undefined,
      });
      toast.success("Evidence submitted! Awaiting admin review.");
      setCompleteDialogOpen(false);
      setCompleteNotes("");
      setSelectedAssignment(null);
      setCompletionPhotoBase64(null);
      setCompletionPhotoPreview(null);
      setPhotoLat(null);
      setPhotoLng(null);
      fetchAssignments();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (a: AssignmentWithComplaint) => {
    setActionLoading(a.assignment.id);
    try {
      await assignmentsApi.updateStatus(a.assignment.id, "rejected", "Unable to complete");
      toast.info("Task rejected. Returned to queue.");
      fetchAssignments();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setActionLoading(null);
    }
  };

  const openMaps = (lat?: number | null, lng?: number | null) => {
    if (!lat || !lng) return;
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  const AssignmentCard = ({ a }: { a: AssignmentWithComplaint }) => (
    <Card className="bg-card border-border">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="font-mono text-xs text-primary mb-1">{a.complaint.ticketId}</div>
            <div className="text-sm text-muted-foreground line-clamp-2">{a.complaint.description ?? "No description"}</div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[a.assignment.status] ?? "bg-gray-500/20 text-gray-400"}`}>
            {a.assignment.status.replace(/_/g," ")}
          </span>
        </div>

        {(a.complaint as {publicAssetId?: number | null}).publicAssetId && (
          <div className="flex items-center gap-1.5 mb-2">
            <QrCode className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs text-blue-400">Asset-linked complaint</span>
            <Badge variant="outline" className="text-[10px] border-blue-400/30 text-blue-300">GPS Check Required</Badge>
          </div>
        )}

        {a.complaint.address && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{a.complaint.address}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-3">
          {a.complaint.priority && (
            <span className={`px-2 py-0.5 rounded text-white text-xs font-medium ${
              a.complaint.priority === "emergency" ? "bg-red-700" :
              a.complaint.priority === "critical" ? "bg-red-500" :
              a.complaint.priority === "high" ? "bg-orange-500" :
              a.complaint.priority === "medium" ? "bg-yellow-500" : "bg-green-600"
            }`}>{a.complaint.priority}</span>
          )}
          {a.assignment.distanceKm && <span>📍 {a.assignment.distanceKm.toFixed(1)} km away</span>}
          {a.assignment.estimatedArrivalMinutes && <span>⏱ {a.assignment.estimatedArrivalMinutes} min ETA</span>}
        </div>

        <div className="flex flex-wrap gap-2">
          {a.assignment.status === "pending" && (
            <>
              <Button size="sm" onClick={() => handleAccept(a)} disabled={actionLoading === a.assignment.id} className="flex-1">
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Accept
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleReject(a)} disabled={actionLoading === a.assignment.id}>
                Reject
              </Button>
            </>
          )}
          {a.assignment.status === "accepted" && (
            <>
              {a.complaint.latitude && (
                <Button size="sm" variant="outline" onClick={() => openMaps(a.complaint.latitude, a.complaint.longitude)}>
                  <Navigation className="h-3.5 w-3.5 mr-1" /> Navigate
                </Button>
              )}
              <Button size="sm" onClick={() => handleStartWork(a)} disabled={actionLoading === a.assignment.id} className="flex-1">
                <Play className="h-3.5 w-3.5 mr-1" /> Start Work
              </Button>
            </>
          )}
          {a.assignment.status === "in_progress" && (
            <>
              {/* Issue 1: If complaint is pending admin review, show waiting state instead of complete button */}
              {a.complaint.status === "pending_admin_review" ? (
                <div className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-900/20 rounded-lg p-2.5 border border-yellow-500/30 w-full">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  Evidence submitted — awaiting admin review
                </div>
              ) : (
                <>
                  {/* Issue 1: Show admin rejection reason if complaint was rejected back */}
                  {a.complaint.adminRejectionReason && (
                    <div className="flex items-start gap-1.5 text-xs text-red-400 bg-red-900/20 rounded-lg p-2.5 border border-red-500/30 w-full mb-1">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span><strong>Rejected:</strong> {a.complaint.adminRejectionReason}</span>
                    </div>
                  )}
                  {a.complaint.latitude && (
                    <Button size="sm" variant="outline" onClick={() => openMaps(a.complaint.latitude, a.complaint.longitude)}>
                      <Navigation className="h-3.5 w-3.5 mr-1" /> Map
                    </Button>
                  )}
                  <Button size="sm" onClick={() => openCompleteDialog(a)} disabled={actionLoading === a.assignment.id} className="flex-1 bg-green-600 hover:bg-green-700">
                    <Flag className="h-3.5 w-3.5 mr-1" /> Mark Complete
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const stats = [
    { label: "Active Tasks", value: activeAssignments.length, icon: Clock, color: "text-yellow-400" },
    { label: "Completed", value: completedAssignments.filter(a => a.assignment.status === "completed").length, icon: CheckCircle, color: "text-green-400" },
    { label: "Total Assigned", value: assignments.length, icon: Briefcase, color: "text-blue-400" },
  ];

  const needsGpsCheck = !!(selectedAssignment?.complaint as {publicAssetId?: number | null})?.publicAssetId;
  // Photo step number depends on whether GPS check is shown
  const photoStepNum = needsGpsCheck ? "Step 2: " : "Step 1: ";
  const notesStepNum = needsGpsCheck ? "Step 3: " : "Step 2: ";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 bg-card border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Briefcase className="h-6 w-6 text-blue-400" />
          <div>
            <span className="font-bold text-lg">Officer Dashboard</span>
            <span className="ml-2 text-xs text-muted-foreground">{user.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAssignments} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => { logout(); setLocation("/login"); }}>
            <LogOut className="h-4 w-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {stats.map(s => (
            <Card key={s.label} className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`h-8 w-8 ${s.color}`} />
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="active">
          <TabsList className="mb-4">
            <TabsTrigger value="active">
              <Clock className="h-4 w-4 mr-1.5" />Active ({activeAssignments.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              <CheckCircle className="h-4 w-4 mr-1.5" />Completed ({completedAssignments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading…</p>
            ) : activeAssignments.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No active tasks at the moment.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeAssignments.map(a => <AssignmentCard key={a.assignment.id} a={a} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {completedAssignments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No completed tasks.</p>
            ) : (
              <div className="space-y-4">
                {completedAssignments.map(a => <AssignmentCard key={a.assignment.id} a={a} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Complete Task Dialog */}
      {selectedAssignment && (
        <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-green-400" />
                Complete Task — {selectedAssignment.complaint.ticketId}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Step 1: GPS Check (only for asset-linked complaints) */}
              {needsGpsCheck && (
                <Card className={`border ${
                  proximityResult?.verified ? "bg-green-900/20 border-green-500/30" :
                  proximityResult && !proximityResult.verified ? "bg-red-900/20 border-red-500/30" :
                  "bg-slate-800/50 border-slate-700"
                }`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      {proximityResult?.verified ? (
                        <ShieldCheck className="h-5 w-5 text-green-400" />
                      ) : proximityResult && !proximityResult.verified ? (
                        <ShieldX className="h-5 w-5 text-red-400" />
                      ) : (
                        <QrCode className="h-5 w-5 text-blue-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium">Step 1: GPS Proximity Check</p>
                        <p className="text-xs text-slate-400">You must be within 20m of the asset to complete this task</p>
                      </div>
                    </div>

                    {assetCode && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">Asset:</span>
                        <Badge variant="outline" className="text-xs font-mono border-blue-400/40 text-blue-300">
                          {ASSET_TYPE_ICONS[(selectedAssignment.complaint as {type?: string}).type ?? "other"] ?? "📍"} {assetCode}
                        </Badge>
                      </div>
                    )}

                    {proximityResult ? (
                      <div className={`rounded-lg p-2.5 text-sm font-medium ${
                        proximityResult.verified ? "bg-green-800/40 text-green-300" : "bg-red-800/40 text-red-300"
                      }`}>
                        <div className="flex items-center gap-1.5">
                          {proximityResult.verified ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                          {proximityResult.message}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-xs opacity-70">
                          <Activity className="h-3 w-3" />
                          Distance: {proximityResult.distanceMeters.toFixed(1)}m
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handleVerifyGPS}
                        disabled={gpsCheckStep === "checking"}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        {gpsCheckStep === "checking" ? (
                          <><RefreshCw className="h-4 w-4 mr-1 animate-spin" /> Checking GPS…</>
                        ) : (
                          <><MapPin className="h-4 w-4 mr-1" /> Verify My Location</>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Issue 1: Geo-tagged Completion Photo — always required */}
              <Card className={`border ${
                completionPhotoBase64 ? "bg-green-900/20 border-green-500/30" : "bg-slate-800/50 border-slate-700"
              }`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    {completionPhotoBase64 ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : (
                      <Camera className="h-5 w-5 text-blue-400" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{photoStepNum}Geo-tagged Completion Photo</p>
                      <p className="text-xs text-slate-400">Required — GPS coordinates captured at time of photo</p>
                    </div>
                  </div>

                  {completionPhotoBase64 ? (
                    <div className="space-y-2">
                      <img
                        src={completionPhotoPreview!}
                        alt="Completion evidence"
                        className="w-full max-h-36 object-cover rounded-lg border border-border"
                      />
                      {photoLat != null && (
                        <div className="flex items-center gap-1 text-xs text-green-400">
                          <MapPin className="h-3 w-3" />
                          GPS: {photoLat.toFixed(5)}, {photoLng?.toFixed(5)}
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setCompletionPhotoBase64(null);
                          setCompletionPhotoPreview(null);
                          setPhotoLat(null);
                          setPhotoLng(null);
                        }}
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Retake Photo
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => photoFileInputRef.current?.click()}
                      disabled={photoCapturing}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {photoCapturing ? (
                        <><RefreshCw className="h-4 w-4 mr-1 animate-spin" /> Capturing…</>
                      ) : (
                        <><Camera className="h-4 w-4 mr-1" /> Capture Completion Photo</>
                      )}
                    </Button>
                  )}

                  {/* Hidden file input for camera capture */}
                  <input
                    ref={photoFileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoCapture}
                  />
                </CardContent>
              </Card>

              {/* Completion Notes */}
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  {notesStepNum}Work Notes
                </Label>
                <Textarea
                  value={completeNotes}
                  onChange={e => setCompleteNotes(e.target.value)}
                  placeholder="Describe what was done, materials used, time taken…"
                  rows={3}
                  className="bg-slate-800 border-slate-700 resize-none"
                />
              </div>

              {/* Blocking warnings */}
              {needsGpsCheck && !proximityResult?.verified && (
                <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-900/20 rounded-lg p-2.5 border border-yellow-500/30">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  GPS verification is required to complete this task. Reach the asset location first.
                </div>
              )}
              {!completionPhotoBase64 && (
                <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-900/20 rounded-lg p-2.5 border border-yellow-500/30">
                  <Camera className="h-4 w-4 shrink-0" />
                  Geo-tagged completion photo is required before submitting.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleComplete}
                disabled={
                  actionLoading === selectedAssignment.assignment.id ||
                  !completionPhotoBase64 ||
                  (needsGpsCheck && (!proximityResult || !proximityResult.verified))
                }
                className="bg-green-600 hover:bg-green-700"
              >
                {actionLoading === selectedAssignment.assignment.id ? (
                  <><RefreshCw className="h-4 w-4 mr-1 animate-spin" /> Submitting…</>
                ) : (
                  <><CheckCircle className="h-4 w-4 mr-1" /> Submit for Review</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
