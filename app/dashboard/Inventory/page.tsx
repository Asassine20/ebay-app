"use client";

import React, { useEffect, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import VariationModal from "@/components/VariationModal";

interface Item {
  ItemID: string;
  Title: string;
  Price: number;
  Quantity: number;
  TotalSold: number;
  RecentSales: number;
  GalleryURL?: string;
  HasVariations: boolean;
}

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/get-inventory?page=1&entriesPerPage=5000`);
      if (!response.ok) {
        throw new Error("Failed to fetch inventory data");
      }

      const { data } = await response.json();

      const processedData = data.map((item: any) => ({
        ItemID: item.id,
        Title: item.title,
        Price: item.price,
        Quantity: item.quantity_available,
        TotalSold: item.total_sold,
        RecentSales: item.recent_sales,
        GalleryURL: item.gallery_url,
        HasVariations: false,
      }));

      setItems(processedData);

      const inventoryIds = data.map((item: any) => item.id);
      fetchVariations(inventoryIds);
    } catch (error: any) {
      setError(error.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const fetchVariations = async (inventoryIds: number[]) => {
    try {
      const response = await fetch(`/api/check-variations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch variations data");
      }

      const { variations } = await response.json();

      setItems((prevItems) =>
        prevItems.map((item) => {
          const variation = variations.find((v: any) => v.inventoryId === item.ItemID);
          return { ...item, HasVariations: variation?.has_variations || false };
        })
      );
    } catch (error) {
      console.error("Error fetching variations:", error);
    }
  };

  const openModal = (itemId: string) => {
    setSelectedItemId(itemId);
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setSelectedItemId(null);
    setModalIsOpen(false);
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
      cellStyle: {
        whiteSpace: "normal",
        textOverflow: "clip",
        overflow: "visible",
        lineHeight: "1.4",
      },
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
    {
      headerName: "Variations",
      field: "HasVariations",
      autoHeaderHeight: true,
      wrapHeaderText: true,
      flex: 1,
      minWidth: 150,
      cellRenderer: ({ data }: { data: Item }) =>
        data.HasVariations ? (
          <button
            className="text-blue-500 hover:underline"
            onClick={() => openModal(data.ItemID)}
          >
            View Variations
          </button>
        ) : (
          "None"
        ),
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

      {/* React Modal */}
      <VariationModal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        selectedItemId={selectedItemId}
      />
    </div>
  );
}
