import { TodoList } from "../_TodoList";
import * as tasksRepo from "@/src/repo/tasks";

export const dynamic = "force-dynamic";

export default async function InkoopPlanningTodo() {
  const items = await tasksRepo.listOpen("inkoop_planning");
  return (
    <>
      <h1>Todo — Inkoop &amp; Planning</h1>
      <p>Open taken voor inkoop en planning.</p>
      <TodoList items={items} />
    </>
  );
}
