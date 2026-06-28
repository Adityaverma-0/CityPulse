import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Droplets,
  Zap,
  Trash2,
  Volume2,
  TreePine,
  Building2,
  Car,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Upload,
  User,
  CheckCircle2,
  X,
  Camera,
  Phone,
  Mail,
  Loader2,
} from "lucide-react";

const CATEGORIES = [
  { id: "pothole", label: "Pothole / Road Damage", icon: Car, color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/30" },
  { id: "water", label: "Water / Drainage Issue", icon: Droplets, color: "text-cyan-400", bg: "bg-cyan-400/10 border-cyan-400/30" },
  { id: "electricity", label: "Electricity / Street Light", icon: Zap, color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/30" },
  { id: "garbage", label: "Garbage / Waste Collection", icon: Trash2, color: "text-green-400", bg: "bg-green-400/10 border-green-400/30" },
  { id: "noise", label: "Noise Pollution", icon: Volume2, color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/30" },
  { id: "park", label: "Park / Green Space", icon: TreePine, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/30" },
  { id: "building", label: "Public Building Damage", icon: Building2, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/30" },
  { id: "other", label: "Other Issue", icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10 border-red-400/30" },
];

const PRIORITIES = [
  { id: "low", label: "Low", desc: "Minor inconvenience", color: "text-green-400 border-green-400/40 bg-green-400/10" },
  { id: "medium", label: "Medium", desc: "Needs attention soon", color: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10" },
  { id: "high", label: "High", desc: "Urgent — affects safety", color: "text-red-400 border-red-400/40 bg-red-400/10" },
];

const STEPS = ["Category", "Details", "Photo", "Contact"];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ReportModal({ open, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    category: "",
    priority: "medium",
    description: "",
    address: "",
    landmark: "",
    photoName: "",
    photoPreview: "",
    name: "",
    phone: "",
    email: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function go(next: number) {
    setDir(next > step ? 1 : -1);
    setStep(next);
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    set("photoName", file.name);
    const reader = new FileReader();
    reader.onload = (ev) => set("photoPreview", ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 2000));
    setSubmitting(false);
    setSubmitted(true);
  }

  function handleClose() {
    onClose();
    setTimeout(() => {
      setStep(0);
      setDir(1);
      setSubmitted(false);
      setForm({ category: "", priority: "medium", description: "", address: "", landmark: "", photoName: "", photoPreview: "", name: "", phone: "", email: "" });
    }, 300);
  }

  const canNext = [
    !!form.category,
    !!form.description && !!form.address,
    true,
    true,
  ];

  const selectedCategory = CATEGORIES.find((c) => c.id === form.category);

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
          style={{ background: "rgba(10, 14, 30, 0.97)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 0 60px rgba(37,99,235,0.2), 0 25px 60px rgba(0,0,0,0.8)" }}
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent" />

          {/* Header */}
          {!submitted && (
            <div className="px-8 pt-7 pb-5 border-b border-white/8">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold text-white font-['Plus_Jakarta_Sans']">Report a Community Issue</h2>
                  <p className="text-sm text-white/50 mt-0.5">AI will auto-classify and dispatch the right team</p>
                </div>
                <button
                  onClick={handleClose}
                  data-testid="button-close-modal"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Step indicator */}
              <div className="flex items-center gap-0">
                {STEPS.map((label, i) => (
                  <div key={i} className="flex items-center flex-1 last:flex-none">
                    <button
                      onClick={() => i < step && go(i)}
                      data-testid={`step-indicator-${i}`}
                      className="flex items-center gap-2 group"
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                          i < step
                            ? "bg-primary text-white cursor-pointer"
                            : i === step
                            ? "bg-primary/20 border-2 border-primary text-primary"
                            : "bg-white/5 border border-white/15 text-white/30"
                        }`}
                      >
                        {i < step ? <CheckCircle2 size={14} /> : i + 1}
                      </div>
                      <span
                        className={`text-xs font-medium hidden sm:block transition-colors ${
                          i === step ? "text-white" : i < step ? "text-white/60" : "text-white/25"
                        }`}
                      >
                        {label}
                      </span>
                    </button>
                    {i < STEPS.length - 1 && (
                      <div className="flex-1 mx-3 h-px transition-all duration-500" style={{ background: i < step ? "rgba(37,99,235,0.7)" : "rgba(255,255,255,0.08)" }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Body */}
          <div className="px-8 py-7 min-h-[340px] flex flex-col">
            <AnimatePresence mode="wait" custom={dir}>
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center text-center py-8 gap-5"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                    className="w-20 h-20 rounded-full bg-green-500/15 border-2 border-green-500/50 flex items-center justify-center"
                  >
                    <CheckCircle2 size={40} className="text-green-400" />
                  </motion.div>
                  <div>
                    <h3 className="text-2xl font-bold text-white font-['Plus_Jakarta_Sans'] mb-2">Issue Reported!</h3>
                    <p className="text-white/60 text-sm max-w-sm">
                      Your report has been received. AI is analyzing it now and will assign the right department within minutes.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 w-full max-w-sm mt-2">
                    {[
                      { label: "Ticket ID", value: "#CH-" + Math.floor(Math.random() * 90000 + 10000) },
                      { label: "Category", value: selectedCategory?.label.split(" /")[0] ?? "Other" },
                      { label: "ETA", value: "2–4 hrs" },
                    ].map((item) => (
                      <div key={item.label} className="bg-white/5 rounded-xl p-3 border border-white/8">
                        <div className="text-xs text-white/40 mb-1">{item.label}</div>
                        <div className="text-sm font-semibold text-white">{item.value}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-white/30">You'll receive SMS/email updates as the issue progresses.</p>
                  <Button onClick={handleClose} className="bg-primary hover:bg-primary/90 text-white mt-2" data-testid="button-done">
                    Done
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key={step}
                  custom={dir}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="flex-1 flex flex-col"
                >
                  {/* Step 0: Category */}
                  {step === 0 && (
                    <div>
                      <p className="text-sm text-white/50 mb-4">What type of issue are you reporting?</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {CATEGORIES.map((cat) => {
                          const Icon = cat.icon;
                          const active = form.category === cat.id;
                          return (
                            <button
                              key={cat.id}
                              data-testid={`category-${cat.id}`}
                              onClick={() => set("category", cat.id)}
                              className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all duration-200 hover:scale-105 ${
                                active ? cat.bg + " scale-105 shadow-lg" : "bg-white/4 border-white/10 hover:bg-white/8"
                              }`}
                            >
                              <Icon size={22} className={active ? cat.color : "text-white/40"} />
                              <span className={`text-xs font-medium leading-tight ${active ? "text-white" : "text-white/50"}`}>
                                {cat.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Step 1: Details */}
                  {step === 1 && (
                    <div className="space-y-5">
                      <div>
                        <Label className="text-white/70 text-xs font-medium mb-2 block">Priority Level</Label>
                        <div className="flex gap-3">
                          {PRIORITIES.map((p) => (
                            <button
                              key={p.id}
                              data-testid={`priority-${p.id}`}
                              onClick={() => set("priority", p.id)}
                              className={`flex-1 py-2.5 px-3 rounded-lg border text-center transition-all duration-200 ${
                                form.priority === p.id ? p.color : "bg-white/4 border-white/10 text-white/40"
                              }`}
                            >
                              <div className="text-sm font-semibold">{p.label}</div>
                              <div className="text-xs opacity-70 mt-0.5">{p.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="description" className="text-white/70 text-xs font-medium mb-2 block">Description *</Label>
                        <Textarea
                          id="description"
                          data-testid="input-description"
                          placeholder="Describe the issue in detail — what you see, how long it's been there, any safety concerns..."
                          value={form.description}
                          onChange={(e) => set("description", e.target.value)}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-primary/60 resize-none h-24 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="address" className="text-white/70 text-xs font-medium mb-2 block">
                            <MapPin size={11} className="inline mr-1" />Address *
                          </Label>
                          <Input
                            id="address"
                            data-testid="input-address"
                            placeholder="Street address or area"
                            value={form.address}
                            onChange={(e) => set("address", e.target.value)}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-primary/60 text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="landmark" className="text-white/70 text-xs font-medium mb-2 block">Nearby Landmark</Label>
                          <Input
                            id="landmark"
                            data-testid="input-landmark"
                            placeholder="e.g. near City Bank"
                            value={form.landmark}
                            onChange={(e) => set("landmark", e.target.value)}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-primary/60 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Photo */}
                  {step === 2 && (
                    <div className="space-y-4">
                      <p className="text-sm text-white/50">Upload a photo to help our AI better analyze the issue. <span className="text-white/30">(Optional)</span></p>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhoto}
                        data-testid="input-photo-file"
                      />
                      {form.photoPreview ? (
                        <div className="relative rounded-xl overflow-hidden border border-white/10 group">
                          <img src={form.photoPreview} alt="Preview" className="w-full max-h-52 object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              data-testid="button-change-photo"
                              onClick={() => fileRef.current?.click()}
                              className="bg-white/20 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-lg border border-white/20 hover:bg-white/30 transition-all"
                            >
                              Change Photo
                            </button>
                          </div>
                          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-xs text-white/80 px-2 py-1 rounded">
                            {form.photoName}
                          </div>
                        </div>
                      ) : (
                        <button
                          data-testid="button-upload-photo"
                          onClick={() => fileRef.current?.click()}
                          className="w-full border-2 border-dashed border-white/15 rounded-xl p-10 flex flex-col items-center gap-3 text-white/40 hover:border-primary/50 hover:text-white/60 hover:bg-primary/5 transition-all duration-200"
                        >
                          <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center">
                            <Camera size={24} />
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-white/60">Click to upload a photo</div>
                            <div className="text-xs mt-1">PNG, JPG up to 10MB</div>
                          </div>
                        </button>
                      )}
                      <div className="flex items-start gap-3 bg-blue-500/8 border border-blue-500/20 rounded-lg p-3">
                        <Upload size={14} className="text-blue-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-white/50 leading-relaxed">
                          Photos with clear images of the problem help our AI achieve 98%+ classification accuracy and speed up dispatch time.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Contact */}
                  {step === 3 && (
                    <div className="space-y-5">
                      <p className="text-sm text-white/50">
                        Let us keep you updated. <span className="text-white/30">(Optional — all fields)</span>
                      </p>
                      <div>
                        <Label htmlFor="name" className="text-white/70 text-xs font-medium mb-2 block">
                          <User size={11} className="inline mr-1" />Full Name
                        </Label>
                        <Input
                          id="name"
                          data-testid="input-name"
                          placeholder="Your name"
                          value={form.name}
                          onChange={(e) => set("name", e.target.value)}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-primary/60 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="phone" className="text-white/70 text-xs font-medium mb-2 block">
                            <Phone size={11} className="inline mr-1" />Phone
                          </Label>
                          <Input
                            id="phone"
                            data-testid="input-phone"
                            placeholder="+91 XXXXX XXXXX"
                            value={form.phone}
                            onChange={(e) => set("phone", e.target.value)}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-primary/60 text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email" className="text-white/70 text-xs font-medium mb-2 block">
                            <Mail size={11} className="inline mr-1" />Email
                          </Label>
                          <Input
                            id="email"
                            data-testid="input-email"
                            type="email"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={(e) => set("email", e.target.value)}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-primary/60 text-sm"
                          />
                        </div>
                      </div>

                      {/* Summary card */}
                      <div className="bg-white/4 border border-white/8 rounded-xl p-4 space-y-2">
                        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Report Summary</p>
                        {[
                          { label: "Issue", value: selectedCategory?.label ?? "—" },
                          { label: "Priority", value: PRIORITIES.find(p => p.id === form.priority)?.label ?? "—" },
                          { label: "Location", value: form.address || "—" },
                          { label: "Photo", value: form.photoName || "Not attached" },
                        ].map((row) => (
                          <div key={row.label} className="flex justify-between text-sm">
                            <span className="text-white/40">{row.label}</span>
                            <span className="text-white/80 font-medium text-right max-w-[60%] truncate">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          {!submitted && (
            <div className="px-8 pb-7 flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => step === 0 ? handleClose() : go(step - 1)}
                data-testid="button-back"
                className="text-white/50 hover:text-white hover:bg-white/8 gap-1.5"
              >
                <ChevronLeft size={16} />
                {step === 0 ? "Cancel" : "Back"}
              </Button>

              <div className="flex items-center gap-2">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                    style={{ background: i === step ? "hsl(221 83% 53%)" : "rgba(255,255,255,0.15)", transform: i === step ? "scale(1.4)" : "scale(1)" }}
                  />
                ))}
              </div>

              {step < STEPS.length - 1 ? (
                <Button
                  onClick={() => go(step + 1)}
                  disabled={!canNext[step]}
                  data-testid="button-next"
                  className="bg-primary hover:bg-primary/90 text-white gap-1.5 disabled:opacity-30"
                >
                  Next <ChevronRight size={16} />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  data-testid="button-submit"
                  className="bg-primary hover:bg-primary/90 text-white gap-2 min-w-[120px]"
                  style={{ boxShadow: "0 0 20px rgba(37,99,235,0.5)" }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Report
                      <ChevronRight size={16} />
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
