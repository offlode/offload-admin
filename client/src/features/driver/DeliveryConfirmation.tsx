import {
  Check,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface DeliveryOrder {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  pickup_address: string;
  delivery_address: string;
  status: string;
  display_status: string;
  bags: number;
  notes: string;
}

export function DeliveryConfirmation({
  order,
  photoPreview,
  notes,
  signatureDataUrl,
  isPending,
  onConfirm,
}: {
  order: DeliveryOrder;
  photoPreview: string | null;
  notes: string;
  signatureDataUrl: string | null;
  isPending: boolean;
  onConfirm: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Step 5: Confirm Delivery</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Review your delivery details:</p>

        <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Order</span>
            <span className="font-medium">#{order.order_number}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Customer</span>
            <span className="font-medium">{order.customer_name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Address</span>
            <span className="font-medium text-right max-w-[60%]">
              {order.delivery_address}
            </span>
          </div>
          <div className="flex justify-between text-sm items-center">
            <span className="text-muted-foreground">Photo</span>
            {photoPreview ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
          </div>
          {notes && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Notes</span>
              <span className="font-medium text-right max-w-[60%]">{notes}</span>
            </div>
          )}
          <div className="flex justify-between text-sm items-center">
            <span className="text-muted-foreground">Signature</span>
            {signatureDataUrl ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <span className="text-xs text-muted-foreground">Skipped</span>
            )}
          </div>
        </div>

        {photoPreview && (
          <img
            src={photoPreview}
            alt="Delivery proof"
            className="w-full h-32 object-cover rounded-lg border border-border"
          />
        )}

        {signatureDataUrl && (
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Signature</Label>
            <img
              src={signatureDataUrl}
              alt="Customer signature"
              className="w-full h-20 object-contain rounded-lg border border-border bg-muted/30"
            />
          </div>
        )}

        <Button
          className="w-full"
          onClick={onConfirm}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Confirming...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Confirm Delivery
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
