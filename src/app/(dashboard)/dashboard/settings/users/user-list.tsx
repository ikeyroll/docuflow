"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { UserRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { userFormSchema, editUserSchema, type UserFormData, type EditUserData } from "@/lib/validations/settings";
import { createUser, updateUser } from "@/lib/actions/settings";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

interface UserListProps {
  users: UserRow[];
  currentUserId: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  STAFF: "Staff",
  VIEWER: "Viewer",
};

// ── Create Dialog ──────────────────────────────────────────────────────────────
function CreateUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting }, reset } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { name: "", email: "", role: UserRole.STAFF, password: "", isActive: true },
  });

  async function onSubmit(data: UserFormData) {
    const result = await createUser(data);
    if (result.success) {
      toast.success("User created");
      reset();
      onClose();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create User</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Name *</Label>
            <Input {...register("name")} placeholder="Ahmad bin Ali" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Email *</Label>
            <Input type="email" {...register("email")} placeholder="ahmad@company.com" />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Role *</Label>
            <Select value={watch("role")} onValueChange={(v) => setValue("role", v as UserRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.values(UserRole).map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Password *</Label>
            <Input type="password" {...register("password")} placeholder="Min 8 characters" />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Dialog ────────────────────────────────────────────────────────────────
function EditUserDialog({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const router = useRouter();
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<EditUserData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { name: user.name, email: user.email, role: user.role, isActive: user.isActive, password: "" },
  });

  async function onSubmit(data: EditUserData) {
    const result = await updateUser(user.id, data);
    if (result.success) {
      toast.success("User updated");
      onClose();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Name *</Label>
            <Input {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Email *</Label>
            <Input type="email" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Role *</Label>
            <Select value={watch("role")} onValueChange={(v) => setValue("role", v as UserRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.values(UserRole).map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>New Password <span className="text-muted-foreground text-xs">(leave blank to keep current)</span></Label>
            <Input type="password" {...register("password")} placeholder="Min 8 characters" />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={watch("isActive")} onChange={(e) => setValue("isActive", e.target.checked)} className="h-4 w-4" />
            <Label htmlFor="isActive">Active</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function UserList({ users, currentUserId }: UserListProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)}>+ Add User</Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.name}
                  {user.id === currentUserId && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                    {ROLE_LABELS[user.role]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "default" : "secondary"} className={user.isActive ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString("en-MY") : "Never"}
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => setEditUser(user)}>Edit</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CreateUserDialog open={showCreate} onClose={() => setShowCreate(false)} />
      {editUser && <EditUserDialog user={editUser} onClose={() => setEditUser(null)} />}
    </div>
  );
}
