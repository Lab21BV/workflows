import { TodoList } from "../_TodoList";
import { Controlelijst } from "../_Controlelijst";
import * as tasksRepo from "@/src/repo/tasks";

export const dynamic = "force-dynamic";

export default async function AccountmanagerTodo() {
  const items = await tasksRepo.listOpen("accountmanager");
  return (
    <>
      <h1>Accountmanager</h1>
      <p>Open taken + controlelijst voor de accountmanagers.</p>
      <h2>Open taken</h2>
      <TodoList items={items} />
      <Controlelijst rol="accountmanager" />
    </>
  );
}
