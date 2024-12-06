"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

export default function ItemDetailsPage() {
  const params = useParams();
  const [item, setItem] = useState<any>(null);
  const [status, setStatus] = useState("Loading...");
  const itemId = params?.itemId;

  useEffect(() => {
    if (!itemId) {
      setStatus("Item ID not found in URL.");
      return;
    }

    const fetchItemDetails = async () => {
      try {
        const response = await fetch(`/api/item-details?itemId=${itemId}`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        console.log("Fetched item details from API:", data); // Log the response structure
        setItem(data); // Save data to state
        setStatus("Item loaded successfully.");
      } catch (error) {
        console.error("Error fetching item details:", error);
        setStatus("Error loading item details.");
      }
    };

    fetchItemDetails();
  }, [itemId]);

  // Debugging: Log the item state to check if Variations are populated correctly
  useEffect(() => {
    console.log("Updated item state:", item);
  }, [item]);

  if (status === "Loading...") return <p>Loading...</p>;
  if (!item) return <p>{status}</p>;

  // ag-Grid column definitions
  const columnDefs = [
    {
      headerName: "Image",
      field: "PictureURL",
      cellRenderer: (params: any) =>
        params.value ? (
          <img
            src={params.value}
            alt="Variation"
            style={{ width: "50px", height: "50px", objectFit: "contain" }}
          />
        ) : (
          "N/A"
        ),
    },
    { headerName: "Name", field: "Name" },
    { headerName: "Price", field: "Price", valueFormatter: (params: any) => `$${params.value}` },
    { headerName: "Quantity Available", field: "Quantity" },
    { headerName: "Sales (Last 30 Days)", field: "QuantitySold" },
  ];

  // ag-Grid row data
  const rowData = item.Variations.map((variation: any) => ({
    PictureURL: variation.PictureURL || null,
    Name: variation.Name || "N/A",
    Price: variation.Price,
    Quantity: variation.Quantity,
    QuantitySold: variation.QuantitySold,
  }));

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{item.Title}</h1>
      <p>Price: ${item.overallPrice}</p>
      <p>Quantity: {item.TotalQuantity}</p>
      <h2 className="text-xl font-bold mt-4">Variations:</h2>
      <div
        className="ag-theme-alpine"
        style={{ height: 400, width: "100%" }}
      >
        <AgGridReact
          columnDefs={columnDefs}
          rowData={rowData}
          domLayout="autoHeight"
          pagination={true}
          paginationPageSize={10}
        />
      </div>
    </div>
  );
}