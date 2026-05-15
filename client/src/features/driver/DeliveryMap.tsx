import { Phone, Navigation, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

export function DeliveryMap({ order }: { order: DeliveryOrder }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{order.customer_name}</p>
            <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
          </div>
          {order.customer_phone && (
            <Button variant="outline" size="sm" asChild>
              <a href={`tel:${order.customer_phone}`}>
                <Phone className="w-4 h-4" />
                Call
              </a>
            </Button>
          )}
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-foreground">{order.delivery_address}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(
                `https://maps.google.com/maps?daddr=${encodeURIComponent(order.delivery_address)}`,
                "_blank"
              )
            }
          >
            <Navigation className="w-4 h-4" />
            Navigate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
