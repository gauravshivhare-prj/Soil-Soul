"use client";

import { useState, useRef } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import { FormMessage, Skeleton } from "@/components/ui/States";
import { DataTable } from "@/components/admin/AdminParts";
import { useAuth } from "@/features/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";

export const PRODUCT_CSV_TEMPLATE_CONTENT = `name,slug,categorySlug,price,mrp,stock,status,sku,summary,description,tags,light,size,isFeatured,imageUrl,imageAlt
Snake Plant,snake-plant,plants,499,699,25,active,PLANT-SNK-01,"Hardy indoor plant that purifies air.","A resilient and elegant snake plant perfect for bedrooms and offices. Requires minimal watering.",indoor;air-purifying,low,medium,true,/images/products/snake-plant.jpg,Vibrant Snake Plant in Ceramic Pot
Monstera Deliciosa,monstera-deliciosa,plants,799,999,15,active,PLANT-MON-01,"Iconic split-leaf tropical houseplant.","Known for its dramatic perforated leaves that make a bold statement in living spaces.",indoor;tropical,bright-indirect,large,false,/images/products/monstera.jpg,Lush Monstera Deliciosa with Broad Green Leaves
Bypass Pruning Shears,bypass-pruning-shears,tools,349,499,50,active,TOOL-PRN-01,"High-carbon steel garden pruners.","Ergonomic bypass pruning shears designed for clean cuts on stems and branches up to 20mm.",gardening;pruning,,,false,/images/products/pruners.jpg,Stainless Steel Garden Pruning Shears`;

export function triggerProductTemplateDownload() {
  const blob = new Blob([PRODUCT_CSV_TEMPLATE_CONTENT], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "products_template.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ProductCsvModal({ isOpen, onClose, onSuccess }) {
  const { authRequest } = useAuth();
  const { notify } = useToast();
  const fileInputRef = useRef(null);

  const [fileName, setFileName] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);

  if (!isOpen) return null;

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("File is too large (maximum 5MB).");
      return;
    }

    setFileName(file.name);
    setErrorMessage(null);
    setValidationResult(null);
    setImportSummary(null);
    setIsValidating(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result;
      if (typeof text !== "string" || !text.trim()) {
        setErrorMessage("The selected CSV file is empty.");
        setIsValidating(false);
        return;
      }
      try {
        const res = await authRequest("/admin/products/import/validate", {
          method: "POST",
          body: { csvContent: text },
        });
        setValidationResult(res);
      } catch (err) {
        setErrorMessage(err.message || "Failed to validate CSV structure.");
      } finally {
        setIsValidating(false);
      }
    };
    reader.onerror = () => {
      setErrorMessage("Could not read file from disk.");
      setIsValidating(false);
    };
    reader.readAsText(file);
  }

  function handleReset() {
    setFileName("");
    setValidationResult(null);
    setErrorMessage(null);
    setImportSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleConfirmImport() {
    if (!validationResult || validationResult.validCount === 0) return;
    setIsImporting(true);
    setErrorMessage(null);

    try {
      const res = await authRequest("/admin/products/import", {
        method: "POST",
        body: { rows: validationResult.rows },
      });
      setImportSummary(res);
      notify(`Successfully imported ${res.importedCount} products!`);
      if (onSuccess) onSuccess();
    } catch (err) {
      setErrorMessage(err.message || "Bulk product import failed. No data was committed.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-csv-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-xl border border-line flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-sand/30">
          <div>
            <h2 id="product-csv-modal-title" className="text-lg font-bold text-heading">
              Import Products CSV
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Bulk upload products under any category or subcategory with automatic validation and stock tracking.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted hover:text-ink rounded-lg hover:bg-black/5 transition-colors"
            aria-label="Close dialog"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* File Upload Zone */}
          {!importSummary && (
            <div className="rounded-xl border-2 border-dashed border-line bg-cream/40 p-5 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileSelect}
                className="hidden"
                id="product-csv-file-input"
              />
              <div className="flex flex-col items-center gap-2">
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-sage-50 text-forest">
                  <Icon name="folder" size={20} />
                </span>
                {fileName ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{fileName}</span>
                    <Button size="sm" variant="ghost" onClick={handleReset}>
                      Change file
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-ink font-medium">
                      Select a CSV file containing your product catalog
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mt-1">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Icon name="plus" size={13} /> Select CSV File
                      </Button>
                      <Button size="sm" variant="outline" onClick={triggerProductTemplateDownload}>
                        <Icon name="arrow-right" size={13} className="rotate-90" /> Download CSV Template
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Loading State */}
          {isValidating && (
            <div className="py-8 text-center space-y-3">
              <Skeleton className="h-6 w-1/3 mx-auto" />
              <p className="text-sm text-muted">Validating products, categories, slugs and stock constraints…</p>
            </div>
          )}

          {/* Server Error Message */}
          {errorMessage && (
            <FormMessage tone="error" className="text-sm">
              {errorMessage}
            </FormMessage>
          )}

          {/* Import Success State */}
          {importSummary && (
            <div className="rounded-xl bg-sage-50 border border-sage-100 p-6 text-center space-y-4">
              <div className="flex justify-center">
                <span className="w-12 h-12 rounded-full bg-forest text-cream flex items-center justify-center">
                  <Icon name="check" size={24} strokeWidth={2.5} />
                </span>
              </div>
              <h3 className="text-lg font-bold text-forest">
                Successfully Imported {importSummary.importedCount} Products!
              </h3>
              <p className="text-sm text-muted max-w-lg mx-auto">
                All products have been created in the catalog with their categories, prices, and initial stock movements. The catalog has been refreshed.
              </p>
              <div className="pt-2">
                <Button variant="primary" onClick={onClose}>
                  Done
                </Button>
              </div>
            </div>
          )}

          {/* Validation Preview */}
          {validationResult && !importSummary && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-sand/30 rounded-xl border border-line">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-ink">
                    Found {validationResult.totalRows} {validationResult.totalRows === 1 ? "product" : "products"} in file:
                  </span>
                  <Badge tone={validationResult.validCount > 0 ? "forest" : "stone"}>
                    {validationResult.validCount} Valid
                  </Badge>
                  {validationResult.invalidCount > 0 && (
                    <Badge tone="danger">
                      {validationResult.invalidCount} Invalid
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted">
                  {validationResult.invalidCount > 0
                    ? "Fix errors in CSV or proceed with importing valid products only."
                    : "All products verified! Ready to import."}
                </div>
              </div>

              {/* Table of Rows */}
              <div className="border border-line rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                <DataTable
                  caption="CSV Validation Results"
                  head={["Row", "Name", "Slug", "Category", "Price", "Stock", "Featured", "Status", "Validation"]}
                  minWidth={720}
                >
                  {validationResult.rows.map((r) => {
                    const d = r.data;
                    return (
                      <tr key={r._rowNumber} className={r.isValid ? "bg-white" : "bg-red-50/40"}>
                        <td className="font-mono text-xs text-muted">{r._rowNumber}</td>
                        <td className="font-medium text-ink max-w-[160px] truncate">{d.name || "—"}</td>
                        <td className="font-mono text-xs text-muted max-w-[130px] truncate">/{d.slug || "—"}</td>
                        <td className="text-xs text-ink font-medium">
                          {d.categoryName ? (
                            <span>{d.categoryName} <span className="text-muted font-normal">({d.categorySlug})</span></span>
                          ) : (
                            <span className="text-danger font-mono">{d.categorySlug || "—"}</span>
                          )}
                        </td>
                        <td className="text-xs text-ink font-medium">
                          {d.price != null ? `₹${d.price}` : "—"}
                        </td>
                        <td className="text-xs text-ink">{d.stock ?? 0}</td>
                        <td className="text-xs">
                          {d.isFeatured ? <Badge tone="forest">Yes</Badge> : <span className="text-muted">No</span>}
                        </td>
                        <td className="text-xs capitalize">{d.status}</td>
                        <td>
                          {r.isValid ? (
                            <Badge tone="forest">Ready</Badge>
                          ) : (
                            <div className="space-y-1">
                              <Badge tone="danger">Error</Badge>
                              <ul className="text-[0.6875rem] text-danger list-disc pl-3 m-0 space-y-0.5">
                                {r.errors.map((err, i) => (
                                  <li key={i}>{err}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </DataTable>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-line px-6 py-4 bg-sand/20">
          <Button variant="outline" onClick={onClose} disabled={isImporting}>
            Cancel
          </Button>

          {validationResult && !importSummary && (
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                disabled={validationResult.validCount === 0 || isImporting}
                onClick={handleConfirmImport}
              >
                {isImporting ? (
                  "Importing Products…"
                ) : (
                  <>
                    <Icon name="check" size={14} /> Confirm & Import {validationResult.validCount} {validationResult.validCount === 1 ? "Product" : "Products"}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

