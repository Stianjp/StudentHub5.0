import { formatNok, readOrder } from "@/lib/event-order";
export function OrderSummary({ value }: { value: unknown }) {
  const order = readOrder(value);
  if (!order) return <p>Historisk påmelding — ingen lagret prisoversikt.</p>;
  return (
    <section className="grid gap-3 rounded-xl border border-primary/20 p-4">
      <h2 className="text-xl font-bold">Bestilling og fakturagrunnlag</h2>
      <p>
        {order.packageName}: {formatNok(order.packagePriceOre)}
      </p>
      <ul className="grid gap-2">
        {order.lines
          .filter((l) => l.included || l.extra)
          .map((l) => (
            <li key={l.id}>
              {l.name}: {l.included} inkludert + {l.extra} ekstra ×{" "}
              {formatNok(l.unitPriceOre)} ={" "}
              {formatNok(l.extra * l.unitPriceOre)}
            </li>
          ))}
      </ul>
      <p className="font-bold">
        Totalt {formatNok(order.totalOre)} ekskl. mva.
      </p>
      <p>
        Priser ved innsending. Senere katalogendringer påvirker ikke dette
        grunnlaget.
      </p>
    </section>
  );
}
