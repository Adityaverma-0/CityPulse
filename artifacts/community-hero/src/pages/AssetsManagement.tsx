import { useState, useEffect, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { assetsApi, departmentsApi, type PublicAsset, type AssetStats, type Department } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  QrCode, Plus, RefreshCw, AlertTriangle, CheckCircle, Activity,
  MapPin, Calendar, Star, Wrench, Search, Building2, Trash2, Filter
} from "lucide-react";
import { toast } from "sonner";

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

function healthBarColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

interface QrModalProps {
  asset: PublicAsset;
  onClose: () => void;
}

function QrModal({ asset, onClose }: QrModalProps) {
  const qrUrl = `${window.location.origin}/citizen?asset=${encodeURIComponent(asset.assetCode)}`;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qr-${asset.assetCode}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-blue-400" />
            QR Code — {asset.assetCode}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="bg-white rounded-xl p-3 shadow-lg">
              <QRCodeCanvas
                ref={canvasRef}
                value={qrUrl}
                size={240}
                marginSize={2}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="M"
              />
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="font-semibold text-sm">{asset.name}</p>
            <p className="text-xs text-slate-400">{ASSET_TYPE_LABELS[asset.type] ?? asset.type} • {asset.ward ?? "–"}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 space-y-1">
            <p className="text-xs text-slate-400 font-medium">Scan URL</p>
            <p className="text-xs text-blue-400 break-all font-mono">{qrUrl}</p>
          </div>
          <div className="text-xs text-slate-500 space-y-1">
            <p>• GPS: {asset.latitude.toFixed(4)}, {asset.longitude.toFixed(4)}</p>
            <p>• Sig: <span className="font-mono text-slate-300">{asset.qrSignature?.slice(0, 8) ?? "–"}…</span></p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="outline" onClick={() => { navigator.clipboard.writeText(qrUrl); toast.success("URL copied!"); }}>
            Copy URL
          </Button>
          <Button onClick={handleDownload}>
            Download PNG
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CreateAssetForm {
  name: string;
  type: string;
  latitude: string;
  longitude: string;
  address: string;
  ward: string;
  departmentId: string;
  notes: string;
}

const INITIAL_FORM: CreateAssetForm = {
  name: "", type: "public_toilet", latitude: "", longitude: "", address: "", ward: "", departmentId: "", notes: ""
};

interface Props {
  departments: Department[];
}

export default function AssetsManagement({ departments }: Props) {
  const [assets, setAssets] = useState<PublicAsset[]>([]);
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<PublicAsset | null>(null);
  const [qrAsset, setQrAsset] = useState<PublicAsset | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateAssetForm>(INITIAL_FORM);
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 100 };
      if (filterType !== "all") params.type = filterType;
      const [assetsData, statsData] = await Promise.all([
        assetsApi.list(params),
        assetsApi.stats(),
      ]);
      setAssets(assetsData.items);
      setStats(statsData);
    } catch {
      toast.error("Failed to load assets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterType]);

  const filtered = assets.filter(a =>
    searchTerm === "" ||
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.assetCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.ward ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.type || !form.latitude || !form.longitude) {
      toast.error("Name, type, latitude, and longitude are required");
      return;
    }
    setCreating(true);
    try {
      await assetsApi.create({
        name: form.name,
        type: form.type,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        address: form.address || undefined,
        ward: form.ward || undefined,
        departmentId: form.departmentId ? parseInt(form.departmentId) : undefined,
        notes: form.notes || undefined,
      });
      toast.success("Asset registered!");
      setCreateOpen(false);
      setForm(INITIAL_FORM);
      fetchData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (asset: PublicAsset) => {
    try {
      await assetsApi.update(asset.id, { isActive: !asset.isActive });
      toast.success(`Asset ${asset.isActive ? "deactivated" : "activated"}`);
      fetchData();
    } catch {
      toast.error("Failed to update asset");
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalAssets}</p>
                  <p className="text-xs text-slate-400">Total Assets</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Activity className="h-8 w-8 text-green-400" />
                <div>
                  <p className="text-2xl font-bold">{stats.avgHealthScore}%</p>
                  <p className="text-xs text-slate-400">Avg Health Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-red-400" />
                <div>
                  <p className="text-2xl font-bold">{stats.criticalAssets}</p>
                  <p className="text-xs text-slate-400">Critical (&lt;40%)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-emerald-400" />
                <div>
                  <p className="text-2xl font-bold">{stats.activeAssets}</p>
                  <p className="text-xs text-slate-400">Active Assets</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* By Type breakdown */}
      {stats?.byType && stats.byType.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Assets by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.byType.map(t => (
                <div key={t.type} className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-1.5">
                  <span>{ASSET_TYPE_ICONS[t.type] ?? "📍"}</span>
                  <span className="text-xs font-medium">{ASSET_TYPE_LABELS[t.type] ?? t.type}</span>
                  <Badge variant="secondary" className="text-xs">{t.count}</Badge>
                  <span className={`text-xs font-mono ${healthColor(t.avgHealth)}`}>{t.avgHealth}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search assets..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-800 border-slate-700 w-56"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="bg-slate-800 border-slate-700 w-40">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Filter type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(ASSET_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchData} className="border-slate-700">
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-1" /> Register Asset
        </Button>
      </div>

      {/* Asset Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading assets…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No assets found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(asset => (
            <Card
              key={asset.id}
              className={`bg-slate-800/50 border-slate-700 hover:border-blue-500/50 transition-colors cursor-pointer ${!asset.isActive ? "opacity-50" : ""}`}
              onClick={() => setSelectedAsset(asset)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{ASSET_TYPE_ICONS[asset.type] ?? "📍"}</span>
                    <div>
                      <p className="font-semibold text-sm leading-tight">{asset.name}</p>
                      <p className="text-xs text-blue-400 font-mono">{asset.assetCode}</p>
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setQrAsset(asset); }}
                    className="text-slate-400 hover:text-blue-400 transition-colors p-1"
                    title="View QR Code"
                  >
                    <QrCode className="h-5 w-5" />
                  </button>
                </div>

                {/* Health Score */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Health Score</span>
                    <span className={`font-bold font-mono ${healthColor(asset.healthScore)}`}>{Math.round(asset.healthScore)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${healthBarColor(asset.healthScore)}`}
                      style={{ width: `${Math.max(2, asset.healthScore)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-700/50 rounded-lg p-1.5">
                    <p className="text-xs font-bold">{asset.totalComplaints}</p>
                    <p className="text-[10px] text-slate-400">Complaints</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-1.5">
                    <p className="text-xs font-bold">{asset.totalMaintenanceVisits}</p>
                    <p className="text-[10px] text-slate-400">Visits</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-1.5">
                    <p className="text-xs font-bold">
                      {asset.avgCitizenRating != null ? asset.avgCitizenRating.toFixed(1) : "–"}
                    </p>
                    <p className="text-[10px] text-slate-400">Rating</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{asset.address ?? `${asset.latitude.toFixed(3)}, ${asset.longitude.toFixed(3)}`}</span>
                </div>

                {asset.ward && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] border-slate-600">{asset.ward}</Badge>
                    {asset.departmentName && <Badge variant="outline" className="text-[10px] border-slate-600">{asset.departmentName}</Badge>}
                  </div>
                )}

                {asset.lastMaintainedAt && (
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Wrench className="h-3 w-3" />
                    <span>Last maintained: {new Date(asset.lastMaintainedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Asset Detail Dialog */}
      {selectedAsset && (
        <Dialog open onOpenChange={() => setSelectedAsset(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="text-2xl">{ASSET_TYPE_ICONS[selectedAsset.type] ?? "📍"}</span>
                {selectedAsset.name}
                <Badge variant="outline" className="text-xs font-mono ml-1">{selectedAsset.assetCode}</Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Health */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Asset Health Score</span>
                    <span className={`text-2xl font-bold font-mono ${healthColor(selectedAsset.healthScore)}`}>
                      {Math.round(selectedAsset.healthScore)}%
                    </span>
                  </div>
                  <Progress value={selectedAsset.healthScore} className="h-3" />
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedAsset.healthScore >= 80 ? "Good condition" :
                     selectedAsset.healthScore >= 60 ? "Needs attention soon" :
                     selectedAsset.healthScore >= 40 ? "Maintenance required" :
                     "Critical — immediate action needed"}
                  </p>
                </CardContent>
              </Card>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{selectedAsset.totalComplaints}</p>
                  <p className="text-xs text-slate-400">Total Complaints</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{selectedAsset.totalMaintenanceVisits}</p>
                  <p className="text-xs text-slate-400">Maintenance Visits</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center flex flex-col items-center">
                  <div className="flex items-center gap-1">
                    <p className="text-2xl font-bold">{selectedAsset.avgCitizenRating?.toFixed(1) ?? "–"}</p>
                    {selectedAsset.avgCitizenRating && <Star className="h-4 w-4 text-yellow-400" />}
                  </div>
                  <p className="text-xs text-slate-400">Citizen Rating</p>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-2 text-sm">
                <div className="flex gap-2"><span className="text-slate-400 w-28">Type:</span><span>{ASSET_TYPE_LABELS[selectedAsset.type] ?? selectedAsset.type}</span></div>
                <div className="flex gap-2"><span className="text-slate-400 w-28">Address:</span><span>{selectedAsset.address ?? "–"}</span></div>
                <div className="flex gap-2"><span className="text-slate-400 w-28">Ward:</span><span>{selectedAsset.ward ?? "–"}</span></div>
                <div className="flex gap-2"><span className="text-slate-400 w-28">Department:</span><span>{selectedAsset.departmentName ?? "–"}</span></div>
                <div className="flex gap-2"><span className="text-slate-400 w-28">GPS:</span><span className="font-mono text-xs">{selectedAsset.latitude.toFixed(5)}, {selectedAsset.longitude.toFixed(5)}</span></div>
                {selectedAsset.installedAt && <div className="flex gap-2"><span className="text-slate-400 w-28">Installed:</span><span>{new Date(selectedAsset.installedAt).toLocaleDateString()}</span></div>}
                {selectedAsset.lastMaintainedAt && <div className="flex gap-2"><span className="text-slate-400 w-28">Last Maintained:</span><span>{new Date(selectedAsset.lastMaintainedAt).toLocaleDateString()}</span></div>}
                {selectedAsset.notes && <div className="flex gap-2"><span className="text-slate-400 w-28">Notes:</span><span className="text-slate-300">{selectedAsset.notes}</span></div>}
              </div>

              {/* QR info */}
              <div className="bg-slate-800/80 rounded-lg p-3 text-xs space-y-1">
                <p className="font-medium text-slate-300">QR / Anti-Fraud Info</p>
                <p className="text-slate-400">Signature: <span className="font-mono text-blue-400">{selectedAsset.qrSignature ?? "Not generated"}</span></p>
                <p className="text-slate-400">Scan URL: <span className="font-mono text-blue-400 break-all">{`${window.location.origin}/citizen?asset=${selectedAsset.assetCode}`}</span></p>
              </div>

              {/* Recent complaints */}
              {selectedAsset.recentComplaints && selectedAsset.recentComplaints.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Recent Complaints</p>
                  <div className="space-y-2">
                    {selectedAsset.recentComplaints.map(c => (
                      <div key={c.id} className="bg-slate-800/50 rounded-lg p-2 flex justify-between items-center text-xs">
                        <span className="font-mono text-blue-400">{c.ticketId}</span>
                        <span className="text-slate-300 truncate max-w-32">{c.description?.slice(0, 40) ?? "–"}</span>
                        <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                        <span className="text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleActive(selectedAsset)}
                className={selectedAsset.isActive ? "text-red-400 border-red-400/30" : "text-green-400 border-green-400/30"}
              >
                {selectedAsset.isActive ? <><Trash2 className="h-4 w-4 mr-1" /> Deactivate</> : <><CheckCircle className="h-4 w-4 mr-1" /> Activate</>}
              </Button>
              <Button size="sm" onClick={() => { setQrAsset(selectedAsset); setSelectedAsset(null); }}>
                <QrCode className="h-4 w-4 mr-1" /> View QR Code
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* QR Code Modal */}
      {qrAsset && <QrModal asset={qrAsset} onClose={() => setQrAsset(null)} />}

      {/* Create Asset Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Register New Public Asset</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Asset Name *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Public Toilet - City Center"
                  className="bg-slate-800 border-slate-700"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Asset Type *</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ASSET_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{ASSET_TYPE_ICONS[k]} {v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Department</Label>
                <Select value={form.departmentId} onValueChange={v => setForm(f => ({ ...f, departmentId: v }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Latitude *</Label>
                <Input
                  value={form.latitude}
                  onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))}
                  placeholder="18.5204"
                  type="number"
                  step="any"
                  className="bg-slate-800 border-slate-700"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Longitude *</Label>
                <Input
                  value={form.longitude}
                  onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))}
                  placeholder="73.8567"
                  type="number"
                  step="any"
                  className="bg-slate-800 border-slate-700"
                  required
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Address</Label>
                <Input
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Street address"
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div className="space-y-1">
                <Label>Ward</Label>
                <Input
                  value={form.ward}
                  onChange={e => setForm(f => ({ ...f, ward: e.target.value }))}
                  placeholder="Ward 1"
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Additional notes…"
                  className="bg-slate-800 border-slate-700 resize-none"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={creating} className="bg-blue-600 hover:bg-blue-700">
                {creating ? "Registering…" : "Register Asset"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
