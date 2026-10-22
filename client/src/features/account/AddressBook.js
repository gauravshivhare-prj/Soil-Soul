"use client";

/**
 * AddressBook — saved addresses with add / edit / delete / set default.
 * Changes are kept in component state for the demo (not saved anywhere).
 */

import { useState } from "react";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import AddressForm from "@/components/store/AddressForm";
import { formatAddress } from "@/lib/format";

/* Keep exactly one default when one is set. */
function withDefault(list, defaultId) {
  return list.map((a) => ({ ...a, isDefault: a.id === defaultId }));
}

export default function AddressBook({ initialAddresses }) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [editing, setEditing] = useState(null); // null | "new" | address id
  const { notify } = useToast();

  function save(address) {
    setAddresses((list) => {
      const exists = list.some((a) => a.id === address.id);
      const next = exists ? list.map((a) => (a.id === address.id ? address : a)) : [...list, address];
      return address.isDefault || next.length === 1 ? withDefault(next, address.id) : next;
    });
    setEditing(null);
    notify("Address saved (demo — not stored on a server)");
  }

  function remove(id) {
    setAddresses((list) => {
      const next = list.filter((a) => a.id !== id);
      // If the default was removed, promote the first remaining address.
      return next.length && !next.some((a) => a.isDefault) ? withDefault(next, next[0].id) : next;
    });
    notify("Address removed");
  }

  if (editing) {
    const current = addresses.find((a) => a.id === editing);
    return (
      <Card>
        <CardHeader title={current ? "Edit Address" : "Add New Address"} />
        <AddressForm initial={current} onSave={save} onCancel={() => setEditing(null)} />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing("new")}><Icon name="plus" size={16} />Add New Address</Button>
      </div>
      {addresses.length === 0 ? (
        <Card><EmptyState icon="pin" title="No saved addresses" description="Add an address for faster checkout." className="!py-10" /></Card>
      ) : (
        <ul className="list-none m-0 p-0 grid gap-4 md:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id}>
              <Card className="h-full flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <p className="m-0 flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                    {a.name}
                    <Badge tone="neutral">{a.label}</Badge>
                    {a.isDefault && <Badge>Default</Badge>}
                  </p>
                </div>
                <p className="m-0 mt-2 text-sm text-muted">{formatAddress(a)}</p>
                <p className="m-0 mt-0.5 text-sm text-muted">{a.phone}</p>
                <div className="mt-auto pt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(a.id)}><Icon name="edit" size={14} />Edit<span className="sr-only"> {a.label} address</span></Button>
                  {!a.isDefault && <Button size="sm" variant="ghost" onClick={() => setAddresses((l) => withDefault(l, a.id))}>Set as default</Button>}
                  <Button size="sm" variant="danger" onClick={() => remove(a.id)}><Icon name="trash" size={14} />Delete<span className="sr-only"> {a.label} address</span></Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
