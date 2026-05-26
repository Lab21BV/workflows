import { TodoList } from "../_TodoList";
import { Controlelijst } from "../_Controlelijst";
import { SalesControleLijst } from "../_SalesControleLijst";
import { InmeetControleLijst } from "../_InmeetControleLijst";
import * as tasksRepo from "@/src/repo/tasks";
import * as salesOrdersRepo from "@/src/repo/sales-orders";
import * as inmeetRepo from "@/src/repo/inmeet";

export const dynamic = "force-dynamic";

export default async function AccountmanagerTodo() {
  const [items, salesControleRows, inmeetPending] = await Promise.all([
    tasksRepo.listOpen("accountmanager"),
    salesOrdersRepo.listAwaitingSalesControl(),
    inmeetRepo.listPendingAmCheck(),
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

      <h2>Inmeetformulieren — wachten op controle</h2>
      <p style={{ color: "var(--color-muted)", fontSize: 13 }}>
        Klant heeft inmeetformulier vloerverwarming ingevuld via het
        klantenportaal. Controleer en wijs de juiste aannemer toe — bij
        goedkeuring wordt het formulier zichtbaar in het aannemerportaal.
      </p>
      <InmeetControleLijst items={inmeetPending} />

      <h2>Open taken</h2>
      <TodoList items={items} />
      <Controlelijst rol="accountmanager" />
    </>
  );
}
