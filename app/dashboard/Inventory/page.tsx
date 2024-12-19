"use client";

import React, { useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

interface Item {
  ItemID: string;
  Title: string;
  Price: number;
  Quantity: number;
  TotalSold: number;
  RecentSales: number;
  GalleryURL?: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // Error state
  const [searchText, setSearchText] = useState(""); // Search state

  useEffect(() => {
    console.log("Fetching listings...");
    fetchListings();
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    setError(null); // Reset error state

    try {
      const response = await fetch(`/api/get-inventory?page=1&entriesPerPage=5000`);

      console.log("Fetch response:", response);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error fetching inventory:", errorData.message || "Unknown error.");
        throw new Error(errorData.message || "Failed to fetch inventory.");
      }

      const { data } = await response.json();

      const processedData = data.map((item: any) => ({
        ItemID: item.item_id,
        Title: item.title,
        Price: item.price || 0,
        Quantity: item.quantity_available || 0,
        TotalSold: item.total_sold || 0,
        RecentSales: item.recent_sales || 0, // Add Recent Sales
        GalleryURL: item.gallery_url,
      }));

      setItems(processedData);
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
      field: "GalleryURL",
      autoHeaderHeight: true,
      wrapHeaderText: true,
      flex: 1,
      minWidth: 120,
      cellRenderer: ({ value }: { value: string }) =>
        value ? <img src={value} alt="Item" style={{ width: "70px", objectFit: "cover" }} /> : "No Image",
    },
    {
      headerName: "Title",
      field: "Title",
      autoHeaderHeight: true,
      wrapHeaderText: true,
      flex: 3,
      minWidth: 200,
      cellRenderer: ({ data }: { data: Item }) => (
        <a
          href={`https://www.ebay.com/itm/${data.ItemID}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          {data.Title}
        </a>
      ),
    },
    {
      headerName: "Price",
      field: "Price",
      autoHeaderHeight: true,
      wrapHeaderText: true,
      flex: 1,
      minWidth: 100,
      valueFormatter: ({ value }: { value: number }) => `$${value.toFixed(2)}`,
    },
    {
      headerName: "Quantity Available",
      field: "Quantity",
      autoHeaderHeight: true,
      wrapHeaderText: true,
      flex: 1,
      minWidth: 100,
    },
    {
      headerName: "Total Sales",
      field: "TotalSold",
      autoHeaderHeight: true,
      wrapHeaderText: true,
      flex: 1,
      minWidth: 100,
    },
    {
      headerName: "Recent Sales",
      field: "RecentSales",
      autoHeaderHeight: true,
      wrapHeaderText: true,
      flex: 1,
      minWidth: 100,
    },
  ];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">eBay Active Listings</h1>
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
