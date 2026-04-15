import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <h1 className="text-xl font-semibold mb-2">Page Not Found</h1>
      <p className="text-sm text-muted-foreground mb-4">The page you're looking for doesn't exist.</p>
      <Link href="/">
        <Button data-testid="button-go-home">Go to Dashboard</Button>
      </Link>
    </div>
  );
}
