import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  useFamily,
  useFamilyMembers,
  useUpdateFamily,
  useRegenerateInviteCode,
  useUpdateMemberRole,
  useUpdateRedemptionRate,
  useRemoveMember,
} from "@/hooks/use-family";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, RefreshCw, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { membership } = useAuth();
  const familyId = membership?.family_id ?? "";
  const { data: family } = useFamily(familyId);
  const { data: members } = useFamilyMembers(familyId);
  const updateFamily = useUpdateFamily();
  const regenerateCode = useRegenerateInviteCode();
  const updateRole = useUpdateMemberRole();
  const updateRate = useUpdateRedemptionRate();
  const removeMember = useRemoveMember();

  const [familyName, setFamilyName] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [editingRate, setEditingRate] = useState<{
    memberId: string;
    rate: number;
  } | null>(null);

  const inviteUrl = family
    ? `${window.location.origin}/setup/join-family/${family.invite_code}`
    : "";

  const handleSaveName = async (e: FormEvent) => {
    e.preventDefault();
    if (!family) return;
    try {
      await updateFamily.mutateAsync({
        id: family.id,
        name: familyName || family.name,
      });
      toast.success("Family name updated.");
    } catch {
      toast.error("Failed to update name.");
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    toast.success("Invite link copied!");
  };

  const handleRegenerate = async () => {
    if (!family) return;
    try {
      await regenerateCode.mutateAsync(family.id);
      toast.success("Invite code regenerated. Old links no longer work.");
    } catch {
      toast.error("Failed to regenerate code.");
    }
  };

  const handleRemoveMember = async () => {
    if (!confirmRemove) return;
    try {
      await removeMember.mutateAsync(confirmRemove);
      toast.success("Member removed.");
    } catch {
      toast.error("Failed to remove member.");
    } finally {
      setConfirmRemove(null);
    }
  };

  const handleSaveRate = async () => {
    if (!editingRate) return;
    try {
      await updateRate.mutateAsync({
        memberId: editingRate.memberId,
        rate: editingRate.rate,
      });
      toast.success("Redemption rate updated.");
    } catch {
      toast.error("Failed to update rate.");
    } finally {
      setEditingRate(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Family Settings</h1>

      {/* Family Name */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Family Name</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveName} className="flex gap-2">
            <Input
              value={familyName || family?.name || ""}
              onChange={(e) => setFamilyName(e.target.value)}
            />
            <Button type="submit" disabled={updateFamily.isPending}>
              {updateFamily.isPending && (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Invite Link */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground break-all">{inviteUrl}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              <Copy className="mr-1 h-4 w-4" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={regenerateCode.isPending}
            >
              <RefreshCw className="mr-1 h-4 w-4" />
              Regenerate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members?.map((member) => {
            const isMe = member.user_id === membership?.user_id;
            return (
              <div key={member.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{member.display_name}</span>
                    {isMe && (
                      <span className="text-xs text-muted-foreground">
                        (You)
                      </span>
                    )}
                    <Badge variant={member.role === "parent" ? "default" : "secondary"}>
                      {member.role}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {member.role === "kid" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setEditingRate({
                              memberId: member.id,
                              rate: member.redemption_rate,
                            })
                          }
                        >
                          {member.redemption_rate}:1
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateRole.mutateAsync({
                              memberId: member.id,
                              role: "parent",
                            })
                          }
                        >
                          Promote
                        </Button>
                      </>
                    )}
                    {!isMe && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmRemove(member.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                <Separator className="mt-3" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Remove confirm */}
      <Dialog
        open={!!confirmRemove}
        onOpenChange={(open: boolean) => !open && setConfirmRemove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure? This will remove this member and their data from the
            family.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rate edit */}
      <Dialog
        open={!!editingRate}
        onOpenChange={(open: boolean) => !open && setEditingRate(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redemption Rate</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>
              Reading minutes required for 1 screen time minute
            </Label>
            <Input
              type="number"
              min={1}
              value={editingRate?.rate ?? 1}
              onChange={(e) =>
                editingRate &&
                setEditingRate({
                  ...editingRate,
                  rate: Number(e.target.value),
                })
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRate(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
