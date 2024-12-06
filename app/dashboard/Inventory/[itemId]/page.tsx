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
        console.log("Fetched item details from API:", data);
        setItem(data);
        setStatus("Item loaded successfully.");
      } catch (error) {
        console.error("Error fetching item details:", error);
        setStatus("Error loading item details.");
      }
    };

    fetchItemDetails();
  }, [itemId]);

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
      width: 120,
      cellRenderer: (params: any) =>
        params.value ? (
          <img
            src={params.value}
            alt="Variation"
            style={{ width: "100px", height: "auto", objectFit: "cover" }}
          />
        ) : (
          "N/A"
        ),
    },
    {
      headerName: "Name",
      field: "Name",
      width: 300,
    },
    {
      headerName: "Price",
      field: "Price",
      width: 150,
      valueGetter: (params: any) => parseFloat(params.data.Price) || 0,
      valueFormatter: (params: any) =>
        typeof params.value === "number"
          ? `$${params.value.toFixed(2)}`
          : "$0.00",
    },
    {
      headerName: "Quantity Available",
      field: "Quantity",
      width: 150,
      valueGetter: (params: any) => parseInt(params.data.Quantity, 10) || 0,
    },
    {
      headerName: "Sales (Last 30 Days)",
      field: "QuantitySold",
      width: 150,
      valueGetter: (params: any) => parseInt(params.data.QuantitySold, 10) || 0,
    },
  ];

  // ag-Grid row data
  const rowData = item.Variations.map((variation: any) => ({
    PictureURL: variation.PictureURL || null,
    Name: variation.Name || "N/A",
    Price: parseFloat(variation.Price) || 0,
    Quantity: parseInt(variation.Quantity, 10) || 0,
    QuantitySold: parseInt(variation.QuantitySold, 10) || 0,
  }));

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{item.Title}</h1>
      <div className="mb-4 flex justify-between items-center">
        <div>
          <p className="text-lg">
            <strong>Price:</strong> ${item.overallPrice}
          </p>
          <p className="text-lg">
            <strong>Quantity:</strong> {item.TotalQuantity}
          </p>
        </div>
        {item.PictureURL && (
          <img
            src={item.PictureURL}
            alt={item.Title}
            style={{
              width: "150px",
              height: "auto",
              objectFit: "cover",
            }}
          />
        )}
      </div>
      <h2 className="text-xl font-bold mt-4">Variations:</h2>
      <div className="ag-theme-alpine mt-4" style={{ height: 500, width: "100%" }}>
        <AgGridReact
          columnDefs={columnDefs}
          rowData={rowData}
          defaultColDef={{ sortable: true, filter: true }}
          domLayout="autoHeight"
          pagination={true}
          paginationPageSize={10}
          rowHeight={120} // Taller rows for larger images
        />
      </div>
    </div>
  );
}
