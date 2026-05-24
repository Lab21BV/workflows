import { TodoList } from "../_TodoList";
import * as tasksRepo from "@/src/repo/tasks";

export const dynamic = "force-dynamic";

export default async function AccountmanagerTodo() {
  const items = await tasksRepo.listOpen("accountmanager");
  return (
    <>
      <h1>Todo — Accountmanager</h1>
      <p>Open taken voor de accountmanagers.</p>
      <TodoList items={items} />
    </>
  );
}
