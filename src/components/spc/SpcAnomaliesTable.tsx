"use client";

import React, { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState
} from "@tanstack/react-table";
import { ArrowUpDown, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

export interface AnomalyRow {
  date: string;
  engines: string;
  department: string;
  consumption: number;
  anomalyType: string;
  wecoRule: string;
  severity: "Critique" | "Élevée" | "Modérée" | "Faible";
  comment: string;
}

const severityStyles: Record<AnomalyRow["severity"], string> = {
  "Critique": "bg-red-600 text-white",
  "Élevée": "bg-red-100 text-red-800 border border-red-300",
  "Modérée": "bg-amber-100 text-amber-800 border border-amber-300",
  "Faible": "bg-slate-100 text-slate-700 border border-slate-300"
};

const columnHelper = createColumnHelper<AnomalyRow>();

export function SpcAnomaliesTable({ rows }: { rows: AnomalyRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("date", {
        header: "Date",
        cell: (info) => <span className="font-bold text-slate-900">{info.getValue()}</span>
      }),
      columnHelper.accessor("engines", {
        header: "Engin(s)",
        cell: (info) => <span className="font-semibold text-slate-800">{info.getValue()}</span>
      }),
      columnHelper.accessor("department", {
        header: "Département",
        cell: (info) => <span className="text-slate-700">{info.getValue()}</span>
      }),
      columnHelper.accessor("consumption", {
        header: "Consommation",
        cell: (info) => <span className="font-bold text-slate-900">{info.getValue().toFixed(2)}</span>
      }),
      columnHelper.accessor("anomalyType", {
        header: "Type d'anomalie",
        cell: (info) => <span className="text-slate-800">{info.getValue()}</span>
      }),
      columnHelper.accessor("wecoRule", {
        header: "Règle WECO",
        cell: (info) => <span className="font-mono text-[11px] text-indigo-700">{info.getValue() || "-"}</span>
      }),
      columnHelper.accessor("severity", {
        header: "Gravité",
        cell: (info) => (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${severityStyles[info.getValue()]}`}>
            {info.getValue()}
          </span>
        )
      }),
      columnHelper.accessor("comment", {
        header: "Commentaires",
        cell: (info) => <span className="text-slate-600">{info.getValue()}</span>
      })
    ],
    []
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } }
  });

  if (!rows.length) {
    return (
      <div className="p-8 text-center text-slate-400 font-medium border border-dashed border-slate-200 rounded-xl">
        Aucune anomalie détectée pour la sélection actuelle. Processus sous contrôle statistique.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="p-3 cursor-pointer select-none whitespace-nowrap"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <span className="inline-flex items-center space-x-1">
                      <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-red-50/40 transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="p-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium flex items-center space-x-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span>{rows.length} anomalie(s) au total — page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}</span>
        </span>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
