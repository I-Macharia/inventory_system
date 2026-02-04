import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function DataTable({ columns, data, isLoading, onRowClick, emptyMessage = "No data found" }) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              {columns.map((col, i) => (
                <TableHead key={i} className={cn("font-semibold text-slate-700", col.className)}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {columns.map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            {columns.map((col, i) => (
              <TableHead key={i} className={cn("font-semibold text-slate-700", col.className)}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-12 text-slate-500">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, i) => (
              <TableRow 
                key={row.id || i} 
                className={cn(
                  "transition-colors",
                  onRowClick && "cursor-pointer hover:bg-slate-50"
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col, j) => (
                  <TableCell key={j} className={col.cellClassName}>
                    {col.cell ? col.cell(row) : row[col.accessor]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}