import { ClassroomManager } from "@/components/admin/classroom-manager";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminClassroomPage() {
  const documents = await db.classroomDocument.findMany({
    orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }],
    select: {
      id: true,
      displayName: true,
      slug: true,
      fileName: true,
      mimeType: true,
      visible: true,
      sortOrder: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy-deep">Classroom</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add, replace, rename, hide, reorder, or remove peptide information documents.
        </p>
      </div>
      <ClassroomManager initialDocuments={documents} />
    </div>
  );
}
