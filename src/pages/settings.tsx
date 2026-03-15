import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  useFamily,
  useFamilyMembers,
  useUpdateFamily,
  useUpdateRedemptionRate,
  useRemoveMember,
  useAddKid,
  useAddParent,
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
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { MemberAvatar } from "@/components/member-avatar";

export default function SettingsPage() {
  const { membership } = useAuth();
  const familyId = membership?.family_id ?? "";
  const { data: family } = useFamily(familyId);
  const { data: members } = useFamilyMembers(familyId);
  const updateFamily = useUpdateFamily();
  const updateRate = useUpdateRedemptionRate();
  const removeMember = useRemoveMember();
  const addKid = useAddKid();
  const addParent = useAddParent();

  const [familyName, setFamilyName] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [editingRate, setEditingRate] = useState<{
    memberId: string;
    rate: number;
  } | null>(null);
  const [addMemberRole, setAddMemberRole] = useState<"kid" | "parent" | null>(
    null,
  );
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPassword, setMemberPassword] = useState("");

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

  const handleAddMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!addMemberRole) return;
    try {
      const mutation = addMemberRole === "kid" ? addKid : addParent;
      await mutation.mutateAsync({
        displayName: memberName,
        email: memberEmail,
        password: memberPassword,
      });
      toast.success(`${memberName} has been added to the family!`);
      setAddMemberRole(null);
      setMemberName("");
      setMemberEmail("");
      setMemberPassword("");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? (err as { message: string }).message
            : "Something went wrong";
      toast.error(message);
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

  const addMemberPending = addKid.isPending || addParent.isPending;

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

      {/* Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Members</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setAddMemberRole("kid")}>
              <UserPlus className="mr-1 h-4 w-4" />
              Add Kid
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddMemberRole("parent")}
            >
              <UserPlus className="mr-1 h-4 w-4" />
              Add Parent
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {members?.map((member) => {
            const isMe = member.user_id === membership?.user_id;
            return (
              <div key={member.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MemberAvatar
                      avatar={member.avatar}
                      displayName={member.display_name}
                      size="sm"
                    />
                    <span className="font-medium">{member.display_name}</span>
                    {isMe && (
                      <span className="text-xs text-muted-foreground">
                        (You)
                      </span>
                    )}
                    <Badge
                      variant={
                        member.role === "parent" ? "default" : "secondary"
                      }
                    >
                      {member.role}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {member.role === "kid" && (
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

      {/* Add Member (Kid or Parent) */}
      <Dialog
        open={!!addMemberRole}
        onOpenChange={(open: boolean) => !open && setAddMemberRole(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add {addMemberRole === "parent" ? "Parent" : "Kid"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="memberName">Name</Label>
              <Input
                id="memberName"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder={addMemberRole === "parent" ? "Dad" : "Alex"}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memberEmail">Email</Label>
              <Input
                id="memberEmail"
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memberPassword">Password</Label>
              <Input
                id="memberPassword"
                type="password"
                value={memberPassword}
                onChange={(e) => setMemberPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddMemberRole(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addMemberPending}>
                {addMemberPending && (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                )}
                Add {addMemberRole === "parent" ? "Parent" : "Kid"}
              </Button>
            </DialogFooter>
          </form>
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
            <Label>Reading minutes required for 1 screen time minute</Label>
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
