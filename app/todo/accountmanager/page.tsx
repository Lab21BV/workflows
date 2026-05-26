import { TodoList } from "../_TodoList";
import { Controlelijst } from "../_Controlelijst";
import { SalesControleLijst } from "../_SalesControleLijst";
import * as tasksRepo from "@/src/repo/tasks";
import * as salesOrdersRepo from "@/src/repo/sales-orders";

export const dynamic = "force-dynamic";

export default async function AccountmanagerTodo() {
  const [items, salesControleRows] = await Promise.all([
    tasksRepo.listOpen("accountmanager"),
    salesOrdersRepo.listAwaitingSalesControl(),
  ]);
  return (
    <>
      <h1>Accountmanager</h1>
      <p>Open taken + controlelijst voor de accountmanagers.</p>
      <h2>Orders wachtend op salescontrole</h2>
      <p style={{ color: "var(--color-muted)", fontSize: 13 }}>
        Sales_Orders met fase <code>Ordercheck</code>. Worden hier automatisch
        ingeschoven door de workflow <code>sales-order-naar-ordercheck</code>{" "}
        zodra opmerkingen zijn ingevuld.
      </p>
      <SalesControleLijst rows={salesControleRows} />
      <h2>Open taken</h2>
      <TodoList items={items} />
      <Controlelijst rol="accountmanager" />
    </>
  );
}
