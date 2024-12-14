"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authUrl, setAuthUrl] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const response = await fetch("/api/get-user-id");

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Error fetching user ID:", errorData.error || "Unknown error.");
          setError(errorData.error || "Failed to fetch user ID.");
          return;
        }

        const data = await response.json();
        //console.log("Fetched user ID:", data);
        setUserId(data.id); // Set the database ID
      } catch (err) {
        console.error("Error fetching user ID:", err);
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserId();
  }, []);

  // Fetch the eBay OAuth URL
  useEffect(() => {
    const fetchAuthUrl = async () => {
      try {
        const response = await fetch("/api/ebay-auth");
        const data = await response.json();
        if (data.url) {
          setAuthUrl(data.url);
        } else {
          console.error("eBay OAuth URL not found in response.");
        }
      } catch (error) {
        console.error("Error fetching eBay OAuth URL:", error);
      } finally {
        setLoading(false); // Stop loading after fetch completes
      }
    };

    fetchAuthUrl();
  }, []);

  const handleFetchData = async () => {
    if (loading) {
      setMessage("Still loading user data, please wait.");
      return;
    }

    if (!userId) {
      setMessage("User not authenticated.");
      return;
    }

    let cursor = 0;
    let hasMore = true;

    try {
      setLoading(true);
      setMessage("Starting data fetch...");

      while (hasMore) {
        const response = await fetch("/api/itemInsert", {
          method: "GET",
          headers: {
            "user-id": userId, // Use dynamic user ID
            cursor: cursor.toString(), // Send the current cursor value
          },
        });

        if (!response.ok) {
          const error = await response.json();
          setMessage(`Error: ${error.error}`);
          console.error("Error fetching batch:", error.error);
          break;
        }

        const data = await response.json();
        //console.log(`Batch processed: ${cursor}`, data);

        // Update hasMore and cursor for the next batch
        hasMore = data.hasMore;
        cursor = data.nextCursor;

        if (hasMore) {
          setMessage(`Processed batch ${cursor / 10}. Fetching next batch...`);
        } else {
          setMessage("All items processed successfully!");
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setMessage("An unexpected error occurred.");
    } finally {
      setLoading(false);
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
          <p>{userId}</p>
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
          onClick={() => authUrl && (window.location.href = authUrl)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={!authUrl || loading}
        >
          {loading ? "Loading..." : "Sign in with eBay"}
        </button>
        <p className="text-xs text-muted-foreground mt-2">
          Click the button above to connect your account to eBay.
        </p>
      </CardContent>
    </Card>
    <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Fetch eBay Data</CardTitle>
        </CardHeader>
        <CardContent>
          <button
            onClick={handleFetchData}
            className={`px-4 py-2 text-white rounded ${loading ? "bg-gray-500" : "bg-blue-500 hover:bg-blue-600"}`}
            disabled={loading}
          >
            {loading ? "Fetching..." : "Fetch Data"}
          </button>
          {message && <p className="text-xs text-muted-foreground mt-2">{message}</p>}
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">User Information</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p>Loading...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {userId !== null && (
            <div>
              <p className="text-2xl font-bold">User ID:</p>
              <p className="text-lg">{userId}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}