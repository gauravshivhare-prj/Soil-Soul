"use client";

import { useState, useRef } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import { FormMessage, Skeleton } from "@/components/ui/States";
import { DataTable } from "@/components/admin/AdminParts";
import { useAuth } from "@/features/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { CSV_TEMPLATE_CONTENT } from "./categoryHierarchy";

export function triggerTemplateDownload() {
  const blob = new Blob([CSV_TEMPLATE_CONTENT], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "categories_template.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function CategoryCsvModal({ isOpen, onClose, onSuccess }) {
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
        const res = await authRequest("/admin/categories/import/validate", {
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
    if (!validationResult?.canImport || !validationResult.sortedValidRows?.length) return;
    setIsImporting(true);
    setErrorMessage(null);

    try {
      const res = await authRequest("/admin/categories/import", {
        method: "POST",
        body: { rows: validationResult.sortedValidRows },
      });
      setImportSummary(res);
      notify(`Successfully imported ${res.count} categories!`);
      if (onSuccess) onSuccess();
    } catch (err) {
      setErrorMessage(err.message || "Bulk import failed. No data was committed.");
    } finally {
      setIsImporting(false);
    }
  }

  const levelBadge = (level) => {
    if (level === 1) return <Badge tone="forest">Level 1 · Main</Badge>;
    if (level === 2) return <Badge tone="blue">Level 2 · Subcategory</Badge>;
    return <Badge tone="gold">Level 3 · Nested</Badge>;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-line flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-sand/30">
          <div>
            <h2 id="csv-modal-title" className="text-lg font-bold text-heading">
              Import Categories CSV
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Bulk create 3-level categories (Main, Subcategory, and Second-level) safely.
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
                id="csv-file-input"
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
                      Select a CSV file containing your category hierarchy
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mt-1">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Icon name="plus" size={13} /> Select CSV File
                      </Button>
                      <Button size="sm" variant="outline" onClick={triggerTemplateDownload}>
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
              <p className="text-sm text-muted">Validating hierarchy and database constraints…</p>
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
                Successfully Imported {importSummary.count} Categories!
              </h3>
              <p className="text-sm text-muted max-w-lg mx-auto">
                All categories have been created in MongoDB Atlas according to their strict hierarchy. The category list has been refreshed.
              </p>
              <div className="pt-2">
                <Button variant="primary" onClick={onClose}>
                  Done
                </Button>
              </div>
            </div>
          )}

          {/* Validation Summary and Preview Table */}
          {validationResult && !importSummary && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-line bg-white p-3 text-center">
                  <p className="text-xs text-muted">Total Rows</p>
                  <p className="text-xl font-bold text-ink">{validationResult.totalRows}</p>
                </div>
                <div className="rounded-xl border border-line bg-sage-50/50 p-3 text-center">
                  <p className="text-xs text-[#3d5a35]">Valid Rows</p>
                  <p className="text-xl font-bold text-[#3d5a35]">{validationResult.validCount}</p>
                </div>
                <div className="rounded-xl border border-line bg-sand/30 p-3 text-center">
                  <p className="text-xs text-[#8a5a10]">Duplicate Slugs</p>
                  <p className="text-xl font-bold text-[#8a5a10]">{validationResult.duplicateCount}</p>
                </div>
                <div className="rounded-xl border border-line bg-[#fdecea]/40 p-3 text-center">
                  <p className="text-xs text-danger">Invalid Rows</p>
                  <p className="text-xl font-bold text-danger">{validationResult.invalidCount}</p>
                </div>
              </div>

              {/* Status Alert */}
              {!validationResult.canImport ? (
                <div className="rounded-xl border border-danger/30 bg-[#fdecea]/50 p-3.5 text-xs text-danger flex items-start gap-2">
                  <Icon name="alert" size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Import Blocked:</span> Please fix the invalid rows or duplicate slugs in your CSV file before importing. Soil &amp; Soul enforces exact 3-level tree integrity.
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-sage-100 bg-sage-50 p-3.5 text-xs text-[#3d5a35] flex items-start gap-2">
                  <Icon name="check-circle" size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">All {validationResult.validCount} rows are valid!</span> Categories will be imported in topological order (Level 1 roots, then Level 2 subcategories, then Level 3). Review the preview below and confirm import.
                  </div>
                </div>
              )}

              {/* Preview Table */}
              <div>
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                  CSV Preview &amp; Hierarchy Validation
                </h4>
                <div className="max-h-72 overflow-y-auto rounded-xl border border-line bg-white">
                  <DataTable
                    caption="Category Import Preview"
                    head={["Row", "Name & Slug", "Level", "Hierarchy Path", "Parent Slug", "Status"]}
                    minWidth={680}
                  >
                    {validationResult.rows.map((r) => (
                      <tr key={r.rowNumber} className={r.errors.length > 0 ? "bg-[#fdecea]/10" : ""}>
                        <td className="text-muted font-mono text-xs">{r.rowNumber}</td>
                        <td>
                          <span className="block font-medium text-ink">{r.name}</span>
                          <span className="block text-xs text-muted font-mono">/{r.slug}</span>
                        </td>
                        <td>{levelBadge(r.level)}</td>
                        <td>
                          <span className="text-xs text-ink font-medium">{r.hierarchyPath}</span>
                        </td>
                        <td className="text-xs text-muted font-mono">{r.parentSlug || "(Root)"}</td>
                        <td>
                          {r.status === "valid" && <Badge tone="sage" icon="check">Valid</Badge>}
                          {r.status === "duplicate" && <Badge tone="gold" icon="alert">Duplicate</Badge>}
                          {r.status === "error" && <Badge tone="danger" icon="x">Invalid</Badge>}
                          {r.errors.length > 0 && (
                            <ul className="mt-1 list-disc list-inside text-[0.6875rem] text-danger space-y-0.5">
                              {r.errors.map((err, idx) => (
                                <li key={idx}>{err}</li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                  </DataTable>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-line px-6 py-4 bg-sand/20">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isImporting}>
            {importSummary ? "Close" : "Cancel"}
          </Button>

          {validationResult && !importSummary && (
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                disabled={!validationResult.canImport || isImporting}
                onClick={handleConfirmImport}
              >
                {isImporting ? (
                  "Importing into Atlas…"
                ) : (
                  <>
                    <Icon name="check" size={13} />
                    Confirm &amp; Import {validationResult.validCount} Categories
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
