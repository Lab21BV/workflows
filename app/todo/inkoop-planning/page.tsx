import { TodoList } from "../_TodoList";
import { Controlelijst } from "../_Controlelijst";
import * as tasksRepo from "@/src/repo/tasks";

export const dynamic = "force-dynamic";

export default async function InkoopPlanningTodo() {
  const items = await tasksRepo.listOpen("inkoop_planning");
  return (
    <>
      <h1>Inkoop &amp; Planning</h1>
      <p>Open taken + controlelijst voor inkoop en planning.</p>
      <h2>Open taken</h2>
      <TodoList items={items} />
      <Controlelijst rol="inkoop_planning" />
    </>
  );
}
