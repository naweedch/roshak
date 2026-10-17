"use client";

/** دکمهٔ اصلاح موجودی در فهرست انبار (همان فرم صفحهٔ محصول) */
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toPersianDigits } from "@/lib/persian";
import { StockForm } from "./variants-manager";

export function StockAdjustButton({ variantId, sku, stock }: { variantId: string; sku: string; stock: number }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>
        تغییر
      </Button>
      {open ? (
        <DialogContent title={`تغییر موجودی ${sku}`} description={`موجودی فعلی: ${toPersianDigits(stock)}`}>
          <StockForm
            variant={{ id: variantId, stock }}
            onDone={() => {
              setOpen(false);
              router.refresh();
            }}
          />
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
