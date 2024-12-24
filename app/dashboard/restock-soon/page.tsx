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
  quantity_available: number;
  recent_sales: number;
  total_sold: number;
  gallery_url: string;
}

export default function RestockSoonPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false); // State for authorization
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    fetchRestockSoonItems();
  }, []);

  const fetchRestockSoonItems = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/get-restock-soon?page=1&entriesPerPage=500`);

      if (response.status === 403) {
        setUnauthorized(true);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch restock soon data");
      }

      const { data } = await response.json();
      setItems(data);
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
      field: "gallery_url",
      autoHeaderHeight: true,
      wrapHeaderText: true,
      flex: 1,
      minWidth: 120,
      cellRenderer: ({ value }: { value: string }) =>
        value ? <img src={value} alt="Item" style={{ width: "70px", objectFit: "cover" }} /> : "No Image",
    },
    {
      headerName: "Title",
      field: "title",
      autoHeaderHeight: true,
      wrapHeaderText: true,
      flex: 3,
      minWidth: 200,
      cellStyle: {
        whiteSpace: "normal",
        textOverflow: "clip",
        overflow: "visible",
        lineHeight: "1.4",
      },
    },
    {
      headerName: "Price",
      field: "price",
      autoHeaderHeight: true,
      wrapHeaderText: true,
      flex: 1,
      minWidth: 100,
      valueFormatter: ({ value }: { value: number }) => `$${value.toFixed(2)}`,
    },
    {
      headerName: "Quantity Available",
      field: "quantity_available",
      autoHeaderHeight: true,
      wrapHeaderText: true,
      flex: 1,
      minWidth: 100,
    },
    {
      headerName: "Recent Sales (30 Days)",
      field: "recent_sales",
      autoHeaderHeight: true,
      wrapHeaderText: true,
      flex: 1,
      minWidth: 100,
    },
    {
      headerName: "Total Sold",
      field: "total_sold",
      autoHeaderHeight: true,
      wrapHeaderText: true,
      flex: 1,
      minWidth: 100,
    },
  ];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Items Needing Restock Soon</h1>
      <h2 className="text-xl mb-4">
        Review items that have sold more in the last 30 days than the available quantity.
      </h2>

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

        {/* Card displayed when unauthorized */}
        {unauthorized && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <Card className="w-96 p-6 bg-white shadow-lg rounded-lg">
              <div className="text-center">
                <h2 className="text-xl font-bold mb-4">Subscription Required</h2>
                <p className="mb-4">
                  You need a subscription to view items needing to restock soon. Click below to view our
                  pricing plans.
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
