import { ZohoClient } from "../zoho/client";
import { RecordsApi } from "../zoho/records";
import { departmentSchema, type Department } from "../lib/departments";

// Lazy init so module-load doesn't validate Zoho env (build-time / non-Zoho contexts).
let _records: RecordsApi | null = null;
function records(): RecordsApi {
  if (!_records) _records = new RecordsApi(new ZohoClient());
  return _records;
}

export type TaskRow = {
  id: string;
  Subject: string;
  Description: string | null;
  Department: Department | null;
  Status: string;
  Created_Time: string;
  What_Id: { id: string; name: string } | null; // related Voorinspectie
};

export async function createTodo(input: {
  department: Department;
  title: string;
  body: string;
  voorinspectieId: string;
}): Promise<string | null> {
  // Runtime-validatie van de Department string voor we 'm naar Zoho schrijven.
  // Zoho accepteert anders een typo silently als custom value.
  const department = departmentSchema.parse(input.department);
  const due = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const res = await records().create("Tasks", [
    {
      Subject: input.title,
      Description: input.body,
      Status: "Not Started",
      Department: department,
      Due_Date: due,
      What_Id: input.voorinspectieId,
      $se_module: "Voorinspecties",
    },
  ]);
  return res.data[0]?.details?.id ?? null;
}

export async function listOpen(rol: Department): Promise<TaskRow[]> {
  const department = departmentSchema.parse(rol);
  // Zoho's search endpoint returns 204 No Content when there are no matches.
  // The shared ZohoClient converts that to `undefined`, so guard before reading `.data`.
  const res = await records().search<TaskRow>("Tasks", {
    criteria: `(Department:equals:${department})and(Status:not_equal:Completed)`,
    perPage: 100,
  });
  return res?.data ?? [];
}

export async function markResolved(id: string): Promise<void> {
  await records().update("Tasks", [{ id, Status: "Completed" }]);
}
