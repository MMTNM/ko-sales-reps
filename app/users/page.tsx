import { requireOwnerPageUser, listUsers } from "@/lib/auth";
import UserManager from "@/components/UserManager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireOwnerPageUser();
  const users = await listUsers();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Access</h1>
        <p className="mt-1 text-sm text-gray-500">Create logins for sales reps and owners.</p>
      </div>
      <UserManager initialUsers={users} />
    </div>
  );
}
