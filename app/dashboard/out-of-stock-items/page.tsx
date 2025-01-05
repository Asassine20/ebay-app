"use client";

import React, { useEffect, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { Card } from "@/components/ui/card"; // Ensure correct import path
import Link from "next/link";

interface Item {
  id: string;
  title: string;
  price: number;
  quantity: number;
  totalSold: number;
  recentSales: number | null;
  image: string;
  type: string;
}

export default function OutOfStockPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false); // Added for authorization
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    fetchOutOfStockItems();
  }, []);

  const fetchOutOfStockItems = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/dashboard/get-out-of-stock-items?page=1&entriesPerPage=5000`);
      if (response.status === 403) {
        setUnauthorized(true);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch out-of-stock items");
      }

      const { data } = await response.json();

      setItems(
        data.map((item: any) => ({
          id: item.id,
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          totalSold: item.totalSold,
          recentSales: item.recentSales || null,
          image: item.image,
          type: item.type,
        }))
      );
    } catch (error: any) {
      setError(error.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const onQuickFilterChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  const columns: ColDef<Item>[] = [
    {
      headerName: "Image",
      field: "image",
      flex: 1,
      minWidth: 120,
      cellRenderer: ({ value }: { value: string }) =>
        value ? <img src={value} alt="Item" style={{ width: "70px", objectFit: "cover" }} /> : "No Image",
    },
    {
      headerName: "Title",
      field: "title",
      flex: 3,
      minWidth: 200,
      cellStyle: { whiteSpace: "normal", textOverflow: "clip", overflow: "visible", lineHeight: "1.4" },
    },
    {
      headerName: "Price",
      field: "price",
      flex: 1,
      minWidth: 100,
      valueFormatter: ({ value }: { value: number }) => `$${value.toFixed(2)}`,
    },
    {
      headerName: "Quantity",
      field: "quantity",
      flex: 1,
      minWidth: 100,
    },
    {
      headerName: "Total Sales",
      field: "totalSold",
      flex: 1,
      minWidth: 100,
    },
    {
      headerName: "Recent Sales",
      field: "recentSales",
      flex: 1,
      minWidth: 100,
      valueFormatter: ({ value }: { value: number | null }) =>
        typeof value === "number" ? value.toString() : "N/A",
    },
    {
      headerName: "Type",
      field: "type",
      flex: 1,
      minWidth: 100,
    },
  ];

  return (
    <div className="container mx-auto p-4 relative">
      <h1 className="text-2xl font-bold mb-4">Out of Stock Items</h1>
      <h2 className="text-xl mb-4">Review items that are currently out of stock</h2>

      {error && <p className="text-red-500">{error}</p>}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search..."
          value={searchText}
          onChange={onQuickFilterChanged}
          className="px-4 py-2 border rounded w-full"
        />
      </div>

      <div className="relative">
        {/* Table container with blur */}
        <div className={unauthorized ? "blur-sm" : ""}>
          <div className="ag-theme-alpine" style={{ height: "600px", width: "100%" }}>
            <AgGridReact<Item>
              rowData={items}
              columnDefs={columns}
              defaultColDef={{
                sortable: true,
                filter: true,
                resizable: true,
                autoHeaderHeight: true,
                wrapHeaderText: true,
              }}
              pagination={true}
              paginationPageSize={100}
              quickFilterText={searchText}
              rowHeight={100}
            />
          </div>
        </div>

        {/* Card positioned over the table */}
        {unauthorized && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <Card className="w-96 p-6 bg-white shadow-lg rounded-lg">
              <div className="text-center">
                <h2 className="text-xl font-bold mb-4">Subscription Required</h2>
                <p className="mb-4">
                  You need a subscription to view the out of stock items data. Click below to view our pricing
                  plans.
                </p>
                <Link
                  href="/#pricing"
                  className="bg-black text-white px-4 py-2 rounded"
                >
                  View Pricing
                </Link>
              </div>
            </Card>
          </div>
        )}
      </div>

      {loading && <p className="text-center mt-4">Loading...</p>}
    </div>
  );
}
