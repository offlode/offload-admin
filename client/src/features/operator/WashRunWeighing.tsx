import { Package, CheckCircle, ChevronRight } from "lucide-react";
import { CLOTHING_TYPES } from "@/features/shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { OrderBag, BagWeightEntry } from "./hooks/useWashRun";

export function WeighStep({
  bags,
  bagEntries,
  updateBagEntry,
  allBagsComplete,
  onNext,
}: {
  bags: OrderBag[];
  bagEntries: Record<number, BagWeightEntry>;
  updateBagEntry: (bagId: number, field: keyof BagWeightEntry, value: string | File | null) => void;
  allBagsComplete: boolean;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Weigh & Photo Each Bag</h2>
      <p className="text-sm text-muted-foreground">
        Enter weight and take a photo of each bag before washing.
      </p>

      {bags.map((bag) => {
        const entry = bagEntries[bag.id] ?? { weight: "", photo: null };
        return (
          <div
            key={bag.id}
            className="bg-card border border-border rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">
                Bag #{bag.id} &middot; {bag.size}
              </span>
              {entry.weight && entry.photo && (
                <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
              )}
            </div>

            <div>
              <Label htmlFor={`weight-${bag.id}`} className="text-xs text-muted-foreground">
                Weight (lbs)
              </Label>
              <Input
                id={`weight-${bag.id}`}
                type="number"
                step="0.1"
                min="0"
                placeholder="0.0"
                value={entry.weight}
                onChange={(e) => updateBagEntry(bag.id, "weight", e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor={`photo-${bag.id}`} className="text-xs text-muted-foreground">
                Bag Photo
              </Label>
              <Input
                id={`photo-${bag.id}`}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  updateBagEntry(bag.id, "photo", file);
                }}
                className="mt-1"
              />
              {entry.photo && (
                <p className="text-xs text-green-500 mt-1">
                  {entry.photo.name}
                </p>
              )}
            </div>
          </div>
        );
      })}

      <Button
        className="w-full"
        disabled={!allBagsComplete}
        onClick={onNext}
      >
        Next
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}

export function SeparateStep({
  selectedTypes,
  toggleClothingType,
  onNext,
}: {
  selectedTypes: Set<string>;
  toggleClothingType: (type: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Separate by Clothing Type</h2>
      <p className="text-sm text-muted-foreground">
        Check off each clothing type as you separate them.
      </p>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="grid grid-cols-2 gap-3">
          {CLOTHING_TYPES.map((type) => (
            <label
              key={type}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={selectedTypes.has(type)}
                onCheckedChange={() => toggleClothingType(type)}
              />
              <span className="text-sm">{type}</span>
            </label>
          ))}
        </div>
      </div>

      <Button className="w-full" onClick={onNext}>
        Next
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}
