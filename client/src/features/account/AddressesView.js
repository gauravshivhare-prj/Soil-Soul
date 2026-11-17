"use client";

/**
 * Account Addresses View — Manage up to 3 saved delivery addresses.
 *
 * Allows customers to save their home, work or alternate addresses once
 * so they don't have to re-type them during checkout.
 */

import { useState } from "react";
import { brandSerif } from "@/app/fonts";
import { SectionTitle } from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import { EmptyState, FormMessage, Skeleton } from "@/components/ui/States";
import AddressForm from "@/components/store/AddressForm";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAuthedResource } from "@/features/auth/useAuthedResource";
import { useToast } from "@/components/ui/Toast";

export default function AddressesView() {
  const { authRequest } = useAuth();
  const { notify } = useToast();
  const { status, data, error: fetchError, replace } = useAuthedResource("/users/me/addresses");

  const addresses = data?.addresses || [];
  const loading = status === "loading";
  const [error, setError] = useState("");
  const [editingAddress, setEditingAddress] = useState(null); // null = none, "new" = adding, object = editing
  const [busyId, setBusyId] = useState(null);

  async function handleSave(formData) {
    setError("");
    try {
      if (editingAddress === "new") {
        const res = await authRequest("/users/me/addresses", {
          method: "POST",
          body: formData,
        });
        replace(res);
        notify("Delivery address saved successfully.");
      } else {
        const addrId = editingAddress.id || editingAddress._id;
        const res = await authRequest(`/users/me/addresses/${addrId}`, {
          method: "PATCH",
          body: formData,
        });
        replace(res);
        notify("Delivery address updated successfully.");
      }
      setEditingAddress(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(addr) {
    const addrId = addr.id || addr._id;
    if (!window.confirm(`Delete address "${addr.label || addr.name}"?`)) return;
    setBusyId(addrId);
    try {
      const res = await authRequest(`/users/me/addresses/${addrId}`, {
        method: "DELETE",
      });
      replace(res);
      notify("Address deleted.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleSetDefault(addr) {
    const addrId = addr.id || addr._id;
    setBusyId(addrId);
    try {
      const res = await authRequest(`/users/me/addresses/${addrId}/default`, {
        method: "POST",
      });
      replace(res);
      notify(`"${addr.label || addr.name}" is now your default delivery address.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <SectionTitle as="h1">Saved Addresses</SectionTitle>
            <span className="text-xs font-semibold text-forest bg-sage-50 border border-sage-200 px-2.5 py-0.5 rounded-full">
              {addresses.length} / 3 Saved
            </span>
          </div>
          <p className="m-0 mt-1 text-sm text-muted">
            Save up to 3 delivery addresses (Home, Work, Other) for 1-click checkout.
          </p>
        </div>

        {addresses.length < 3 && !editingAddress && (
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setError("");
              setEditingAddress("new");
            }}
          >
            <Icon name="plus" size={15} /> Add New Address
          </Button>
        )}
      </div>

      {(error || fetchError) && <FormMessage tone="error">{error || fetchError.message}</FormMessage>}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : editingAddress ? (
        /* Add / Edit Form Card */
        <Card className="p-6">
          <div className="flex items-center justify-between border-b border-line pb-4 mb-5">
            <div>
              <h2 className={`${brandSerif.className} m-0 text-xl font-bold text-ink`}>
                {editingAddress === "new" ? "Add New Delivery Address" : `Edit Address (${editingAddress.label || "Address"})`}
              </h2>
              <p className="m-0 mt-0.5 text-xs text-muted">
                {editingAddress === "new" ? "Save this address to your account for quick checkout." : "Update your saved delivery details."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingAddress(null);
                setError("");
              }}
              className="text-muted hover:text-ink p-1 rounded-lg"
              aria-label="Cancel editing"
            >
              <Icon name="x" size={18} />
            </button>
          </div>

          <AddressForm
            initial={editingAddress === "new" ? { isDefault: addresses.length === 0 } : editingAddress}
            showSaveOptions={true}
            submitLabel={editingAddress === "new" ? "Save Address" : "Update Address"}
            onSave={handleSave}
            onCancel={() => {
              setEditingAddress(null);
              setError("");
            }}
          />
        </Card>
      ) : addresses.length === 0 ? (
        /* Empty State */
        <Card>
          <EmptyState
            icon="pin"
            title="No addresses saved yet"
            description="Save your home, work, or nursery delivery address once so you don't have to re-enter it at checkout."
            action={
              <Button
                variant="primary"
                onClick={() => {
                  setError("");
                  setEditingAddress("new");
                }}
              >
                <Icon name="plus" size={15} /> Add Your First Address
              </Button>
            }
            className="!py-10"
          />
        </Card>
      ) : (
        /* Address Cards Grid (Up to 3 addresses) */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {addresses.map((addr, idx) => {
            const addrId = addr.id || addr._id;
            const isBusy = busyId === addrId;

            return (
              <div
                key={addrId || idx}
                className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-shadow ${
                  addr.isDefault
                    ? "border-forest bg-[#faf9f5] shadow-xs"
                    : "border-line bg-white shadow-xs hover:border-[#cfc9ba]"
                }`}
              >
                <div>
                  {/* Top Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-forest/10 text-forest text-xs font-semibold">
                        {addr.label === "Work" ? "🏢" : addr.label === "Other" ? "📍" : "🏡"}
                      </span>
                      <strong className="text-sm font-bold text-ink">
                        {addr.label || "Home"}
                      </strong>
                    </div>

                    {addr.isDefault ? (
                      <Badge tone="forest">Default</Badge>
                    ) : (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleSetDefault(addr)}
                        className="text-[11px] text-muted hover:text-forest underline cursor-pointer"
                      >
                        Set default
                      </button>
                    )}
                  </div>

                  {/* Recipient and Address Details */}
                  <div className="space-y-1 text-xs text-muted leading-relaxed">
                    <p className="m-0 font-bold text-ink text-sm">{addr.name}</p>
                    <p className="m-0">{addr.line1}</p>
                    {addr.line2 && <p className="m-0">{addr.line2}</p>}
                    <p className="m-0 font-medium text-ink">
                      {addr.city}, {addr.state} — {addr.pincode}
                    </p>
                    <p className="m-0 pt-1 text-ink flex items-center gap-1.5 font-medium">
                      <Icon name="phone" size={12} className="text-muted" /> {addr.phone}
                    </p>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between border-t border-line/60 pt-3 mt-4">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      setError("");
                      setEditingAddress(addr);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-forest hover:underline cursor-pointer"
                  >
                    <Icon name="edit" size={13} /> Edit
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleDelete(addr)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-danger hover:underline cursor-pointer"
                  >
                    <Icon name="trash" size={13} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info notice */}
      <div className="rounded-xl border border-line bg-sand/30 p-4 text-xs text-muted flex items-start gap-2.5">
        <span className="text-base leading-none">💡</span>
        <p className="m-0 leading-relaxed">
          <strong>Tip:</strong> During checkout, you can select any of your saved addresses with a single click. You can also save a new delivery address directly while placing an order!
        </p>
      </div>
    </div>
  );
}
