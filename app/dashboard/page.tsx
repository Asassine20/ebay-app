"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

export default function Dashboard() {
  const ebayOAuthUrl = process.env.NEXT_PUBLIC_EBAY_OAUTH_URL;
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleApiCalls = async () => {
    setIsLoading(true);
    setStatusMessage("Updating inventory...");

    try {
      // Call saveInventory API
      const inventoryResponse = await fetch("/api/saveInventory");
      if (!inventoryResponse.ok) {
        throw new Error("Failed to update inventory");
      }

      setStatusMessage("Inventory updated successfully. Fetching item IDs...");

      // Fetch updated inventory from the database
      const inventoryDataResponse = await fetch("/api/getInventory"); // A new endpoint to fetch inventory
      if (!inventoryDataResponse.ok) {
        throw new Error("Failed to fetch updated inventory");
      }

      // Define the type for inventory data
      type InventoryItem = { item_id: string };

      const inventoryData: InventoryItem[] = await inventoryDataResponse.json();
      const itemIds = inventoryData.map((item: InventoryItem) => item.item_id);

      if (itemIds.length === 0) {
        throw new Error("No items found in inventory");
      }

      setStatusMessage("Updating variations for each item...");

      // Call saveVariations API for each item
      for (const itemId of itemIds) {
        const variationsResponse = await fetch(`/api/saveVariations?itemId=${itemId}`);
        if (!variationsResponse.ok) {
          throw new Error(`Failed to update variations for itemId: ${itemId}`);
        }
      }

      setStatusMessage("Inventory and variations updated successfully.");
    } catch (error: any) {
      console.error(error);
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="grid gap-6 px-4 pt-4"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}
    >
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Out of Stock Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">28</div>
          <p className="text-xs text-muted-foreground">
            These items went out of stock within the last 30 days.
            <br /> Restock soon.
          </p>
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Potential Sales Increase</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">$1645/month</div>
          <p className="text-xs text-muted-foreground">
            Restocking out-of-stock items could boost sales by this amount.
          </p>
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Lost Sales This Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">$963</div>
          <p className="text-xs text-muted-foreground">
            Estimated revenue lost due to out-of-stock items.
          </p>
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Restock Soon - Hot Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">7</div>
          <p className="text-xs text-muted-foreground">
            These items have been selling rapidly and are soon to go out-of-stock.
          </p>
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Connect to eBay</CardTitle>
        </CardHeader>
        <CardContent>
          <button
            onClick={() => (window.location.href = ebayOAuthUrl || "#")}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Sign in with eBay
          </button>
          <p className="text-xs text-muted-foreground mt-2">
            Click the button above to connect your account to eBay.
          </p>
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Update Inventory & Variations</CardTitle>
        </CardHeader>
        <CardContent>
          <button
            onClick={handleApiCalls}
            disabled={isLoading}
            className={`px-4 py-2 rounded ${
              isLoading ? "bg-gray-400" : "bg-green-500 hover:bg-green-600"
            } text-white`}
          >
            {isLoading ? "Updating..." : "Update Now"}
          </button>
          <p className="text-xs text-muted-foreground mt-2">{statusMessage}</p>
        </CardContent>
      </Card>
    </div>
  );
}
