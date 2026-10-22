"use client";

/**
 * PaymentMethods — display-only list of saved methods with set-default and
 * remove (local state). No card/UPI details are collected or stored here;
 * adding methods will happen through the payment provider later.
 */

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import { DemoNotice, EmptyState } from "@/components/ui/States";

export default function PaymentMethods({ initialMethods }) {
  const [methods, setMethods] = useState(initialMethods);

  return (
    <div className="space-y-4">
      <DemoNotice>
        Payment methods are shown for demonstration only. Saving cards or UPI IDs will be handled securely by the payment provider once it&rsquo;s connected.
      </DemoNotice>
      {methods.length === 0 ? (
        <Card><EmptyState icon="card" title="No saved payment methods" description="You can choose how to pay at checkout." className="!py-10" /></Card>
      ) : (
        <Card as="ul" className="list-none m-0 divide-y divide-line">
          {methods.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0">
              <span className="flex items-center justify-center w-12 h-12 rounded-lg bg-sand text-forest flex-shrink-0">
                {m.type === "upi" ? <span className="text-xs font-black italic">UPI</span> : <Icon name="card" size={22} />}
              </span>
              <span className="flex-1 min-w-[10rem] text-sm">
                <span className="block font-semibold text-ink">{m.name}</span>
                <span className="block text-xs text-muted">{m.detail}</span>
              </span>
              {m.isDefault ? (
                <Badge>Default</Badge>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setMethods((l) => l.map((x) => ({ ...x, isDefault: x.id === m.id })))}>Set as default</Button>
              )}
              <Button size="sm" variant="danger" onClick={() => setMethods((l) => l.filter((x) => x.id !== m.id))}>
                <Icon name="trash" size={14} />Remove<span className="sr-only"> {m.name}</span>
              </Button>
            </li>
          ))}
        </Card>
      )}
    </div>
  );
}
