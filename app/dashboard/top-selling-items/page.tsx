"use client";

import React, { useEffect, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

interface Item {
  id: string;
  type: string;
  title: string;
  price: number;
  quantity: number;
  totalSold: number;
  recentSales: number | string; // String for variations without sales
  image: string;
}

export default function TopSellingItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/get-top-selling-items?page=1&entriesPerPage=500`);
      if (!response.ok) {
        throw new Error("Failed to fetch inventory data");
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
      field: "image",
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
      headerName: "Quantity",
      field: "quantity",
      autoHeaderHeight: true,
      wrapHeaderText: true,
      flex: 1,
      minWidth: 100,
    },
    {
      headerName: "Total Sales",
      field: "totalSold",
      autoHeaderHeight: true,
      wrapHeaderText: true,
      flex: 1,
      minWidth: 100,
    },
    {
      headerName: "Recent Sales",
      field: "recentSales",
      autoHeaderHeight: true,
      wrapHeaderText: true,
      flex: 1,
      minWidth: 100,
      valueFormatter: ({ value }: { value: number | string }) =>
        typeof value === "number" ? value.toString() : "N/A", // Always return a string
    },
    {
      headerName: "Type",
      field: "type",
      autoHeaderHeight: true,
      wrapHeaderText: true,
      flex: 1,
      minWidth: 100,
    },
  ];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Top-Selling Items</h1>
      <h2 className="text-xl mb-4">Discover your top-performing inventory items and variations</h2>

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
      {loading && <p className="text-center mt-4">Loading...</p>}
    </div>
  );
}
